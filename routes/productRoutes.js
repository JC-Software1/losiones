const express = require("express");
const auth = require("../middleware/auth");
const { checkPermission } = require("../middleware/checkPermissions");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const {
    getPaginationParams,
    paginatedResponse,
    escapeRegex
} = require("../helpers/pagination");
const router = express.Router();

// ✅ FUNCIÓN AUXILIAR
async function findProductWithAdminPermission(productId, userId, userTipo) {
    if (userTipo === 2 || userTipo === 3) {
        return await Product.findById(productId);
    } else {
        return await Product.findOne({ _id: productId, user: userId });
    }
}

// ✅ FUNCIÓN AUXILIAAR: filtro de permisos por usuario
function baseProductQuery(req) {
    // Filtrar por usuario para tipos 1 (super admin), 5 (barbería) y usuarios con linkedVendedor
    return (req.user.tipo === 1 || req.user.tipo === 5 || req.user.linkedVendedor)
        ? { user: req.user.linkedVendedor || req.user.id }
        : {};
}

// Construye la query de productos con los filtros opcionales.
// Parámetros: search, category, brand, size, sold, stock=only, margin, price
function buildProductQuery(req) {
    const query = baseProductQuery(req);

    if (req.query.sold === "true") query.sold = true;
    else if (req.query.sold === "false") query.sold = false;

    if (req.query.stock === "only") query.stock = { $gt: 0 };

    if (req.query.category) query.category = req.query.category;
    if (req.query.brand) query.brand = req.query.brand;
    if (req.query.size) query.size = req.query.size;

    if (req.query.search) {
        query.name = { $regex: escapeRegex(req.query.search), $options: "i" };
    }

    // Margen = (venta - costo) / venta * 100, solo cuando venta > 0
    const margin = req.query.margin;
    if (["high", "medium", "low"].includes(margin)) {
        const marginExpr = {
            $multiply: [
                { $divide: [{ $subtract: ["$salePrice", "$costPrice"] }, "$salePrice"] },
                100
            ]
        };
        let cond;
        if (margin === "high") cond = { $gte: [marginExpr, 30] };
        else if (margin === "medium") cond = { $and: [{ $gte: [marginExpr, 20] }, { $lt: [marginExpr, 30] }] };
        else cond = { $lt: [marginExpr, 20] };

        query.$expr = { $and: [{ $gt: ["$salePrice", 0] }, cond] };
    }

    // Rangos de precio de venta
    const price = req.query.price;
    if (price === "low") query.salePrice = { $lte: 50000 };
    else if (price === "medium") query.salePrice = { $gt: 50000, $lte: 200000 };
    else if (price === "high") query.salePrice = { $gt: 200000 };

    return query;
}

// Expresión de margen reutilizable en agregaciones
const MARGIN_EXPR = {
    $multiply: [
        { $divide: [{ $subtract: ["$salePrice", "$costPrice"] }, "$salePrice"] },
        100
    ]
};

// Get all products (soporta paginación opt-in con ?page=)
router.get("/", auth, checkPermission('verProductos'), async (req, res) => {
    try {
        const query = buildProductQuery(req);
        const pagination = getPaginationParams(req);

        // Sin ?page= → respuesta tradicional (array plano, como siempre)
        if (!pagination.paginated) {
            const products = await Product.find(query);
            return res.json(products);
        }

        const facet = {
            items: [{ $skip: pagination.skip }, { $limit: pagination.limit }],
            total: [{ $count: "count" }]
        };

        if (pagination.page === 1) {
            // Estadísticas sobre los productos con stock disponible (como el frontend)
            const withStock = { $expr: { $gt: [{ $ifNull: ["$stock", 0] }, 0] } };
            facet.stats = [
                { $match: withStock },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        totalStock: { $sum: { $ifNull: ["$stock", 0] } },
                        totalCostValue: {
                            $sum: { $multiply: ["$costPrice", { $ifNull: ["$stock", 1] }] }
                        },
                        totalSaleValue: {
                            $sum: { $multiply: ["$salePrice", { $ifNull: ["$stock", 1] }] }
                        },
                        marginSum: {
                            $sum: {
                                $cond: [
                                    { $gt: ["$salePrice", 0] },
                                    MARGIN_EXPR,
                                    0
                                ]
                            }
                        },
                        marginCount: { $sum: 1 }
                    }
                }
            ];

            // Alerta de stock bajo: 1 a 3 unidades y no vendido
            const lowStockMatch = {
                $expr: {
                    $and: [
                        { $gt: [{ $ifNull: ["$stock", 0] }, 0] },
                        { $lte: [{ $ifNull: ["$stock", 0] }, 3] },
                        { $ne: [{ $ifNull: ["$sold", false] }, true] }
                    ]
                }
            };
            facet.lowStockTop = [
                { $match: lowStockMatch },
                { $sort: { stock: 1 } },
                { $limit: 5 },
                { $project: { name: 1, stock: 1 } }
            ];
            facet.lowStockCount = [
                { $match: lowStockMatch },
                { $count: "c" }
            ];

            // Alerta de margen bajo: margen < 20% con stock disponible
            const lowMarginMatch = {
                $expr: {
                    $and: [
                        { $gt: [{ $ifNull: ["$stock", 0] }, 0] },
                        { $gt: ["$salePrice", 0] },
                        { $lt: [MARGIN_EXPR, 20] }
                    ]
                }
            };
            facet.lowMarginTop = [
                { $match: lowMarginMatch },
                { $sort: { margin: 1 } },
                { $limit: 5 },
                { $project: { name: 1, margin: { $round: [MARGIN_EXPR, 1] } } }
            ];
            facet.lowMarginCount = [
                { $match: lowMarginMatch },
                { $count: "c" }
            ];
        }

        const [result] = await Product.aggregate(
            [{ $match: query }, { $sort: { name: 1, _id: 1 } }, { $facet: facet }],
            { collation: { locale: "es", strength: 2 } }
        );

        const items = result?.items || [];
        const total = result?.total?.[0]?.count || 0;

        let stats = null;
        if (pagination.page === 1) {
            const s = result?.stats?.[0] || {};
            stats = {
                count: s.count || 0,
                totalStock: s.totalStock || 0,
                totalCostValue: s.totalCostValue || 0,
                totalSaleValue: s.totalSaleValue || 0,
                avgMargin: s.marginCount > 0 ? (s.marginSum / s.marginCount) : 0,
                lowStockCount: result?.lowStockCount?.[0]?.c || 0,
                lowStockTop: result?.lowStockTop || [],
                lowMarginCount: result?.lowMarginCount?.[0]?.c || 0,
                lowMarginTop: result?.lowMarginTop || []
            };
        }

        res.json(paginatedResponse(items, total, pagination, stats));
    } catch (error) {
        console.error("Error al obtener los productos:", error);
        res.status(500).json({ error: "Error al obtener los productos" });
    }
});

// Valores únicos para poblar los filtros (categorías, marcas, tallas)
// GET /products/facets?sold=false&stock=only
router.get("/facets", auth, checkPermission('verProductos'), async (req, res) => {
    try {
        const query = buildProductQuery(req);
        // facets no debe heredar search/margin/price: solo filtros estructurales
        delete query.name;
        delete query.$expr;
        delete query.salePrice;

        const [categories, brands, sizes] = await Promise.all([
            Product.distinct("category", query),
            Product.distinct("brand", query),
            Product.distinct("size", query)
        ]);

        res.json({
            categories: categories.filter(Boolean).sort(),
            brands: brands.filter(Boolean).sort(),
            sizes: sizes.filter(Boolean).sort()
        });
    } catch (error) {
        console.error("Error al obtener facets:", error);
        res.status(500).json({ error: "Error al obtener los filtros" });
    }
});

// 🔥 RUTA PARA ADMINS: Obtener productos de un vendedor (con paginación opt-in)
router.get("/vendedor/:vendedorId", auth, async (req, res) => {
    try {
        const { vendedorId } = req.params;

        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos' });
        }

        const baseQuery = { user: vendedorId };
        const pagination = getPaginationParams(req);

        if (!pagination.paginated) {
            const products = await Product.find(baseQuery);
            return res.json(products);
        }

        const query = { ...baseQuery };
        if (req.query.search) {
            query.name = { $regex: escapeRegex(req.query.search), $options: "i" };
        }
        if (req.query.sold === "true") query.sold = true;
        else if (req.query.sold === "false") query.sold = false;
        if (req.query.stock === "only") query.stock = { $gt: 0 };

        const [items, total] = await Promise.all([
            Product.find(query)
                .sort({ name: 1, _id: 1 })
                .collation({ locale: "es", strength: 2 })
                .skip(pagination.skip)
                .limit(pagination.limit),
            Product.countDocuments(query)
        ]);

        res.json(paginatedResponse(items, total, pagination, null));
    } catch (error) {
        res.status(500).json({ error: "Error al obtener productos del vendedor" });
    }
});

// 🔥 RUTA PARA ADMINS: Último producto de un vendedor
router.get("/vendedor/:vendedorId/last", auth, async (req, res) => {
    try {
        const { vendedorId } = req.params;
        
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos' });
        }
        
        const last = await Product.findOne({ user: vendedorId })
                              .sort({ createdAt: -1 })
                              .select("_id name costPrice salePrice");
        
        if (!last) return res.status(404).json({ error: "No hay productos" });
        res.json(last);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Último producto creado
router.get("/last", auth, checkPermission('verProductos'), async (req, res) => {
    try {
        const query = (req.user.tipo === 1 || req.user.linkedVendedor) 
            ? { user: req.user.linkedVendedor || req.user.id } 
            : {};
        const last = await Product.findOne(query)
                              .sort({ createdAt: -1 })
                              .select("_id name costPrice salePrice");
        if (!last) return res.status(404).json({ error: "No hay productos" });
        res.json(last);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Create a new product
// Create a new product
router.post("/new", auth, checkPermission('crearProductos'), async (req, res) => {
    try {
        const { name, costPrice, salePrice, category, brand, size, stock, barcode } = req.body;

if (!name || costPrice === undefined || costPrice === null || salePrice === undefined || salePrice === null) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
}

        const product = new Product({
            name,
            costPrice,
            salePrice,
            category,
            brand,
            size,
            barcode: barcode || null,
            stock: stock || 1,
            user: req.user.linkedVendedor || req.user.id
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).json({ error: error.message });
    }
});

// 🔥 NUEVA RUTA: Crear producto para un vendedor específico (SOLO ADMINS)
router.post("/vendedor/:vendedorId/new", auth, async (req, res) => {
    try {
        // Verificar que sea admin
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos' });
        }

        const { vendedorId } = req.params;
        const { name, costPrice, salePrice, category, brand, size, stock, barcode } = req.body;

        // ✅ VALIDACIÓN CORRECTA (permite 0 en precios)
        if (!name || costPrice === undefined || costPrice === null || salePrice === undefined || salePrice === null) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        const product = new Product({
            name,
            costPrice,
            salePrice,
            category,
            brand,
            size,
            barcode: barcode || null,
            stock: stock || 1,
            user: vendedorId  // 👈 Usar el ID del vendedor seleccionado
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).json({ error: error.message });
    }
});

// Update a product
router.put("/:id", auth, checkPermission('editarProductos'), async (req, res) => {
    const { name, costPrice, salePrice, category, brand, size, stock, barcode } = req.body;
    try {
        const product = await findProductWithAdminPermission(req.params.id, req.user.id, req.user.tipo);

        if (!product) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        // ✅ VALIDACIÓN: Asegurarse de que los campos obligatorios estén presentes
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: "El nombre del producto es obligatorio" });
        }

        if (costPrice === undefined || costPrice === null || isNaN(costPrice)) {
            return res.status(400).json({ error: "El precio de costo debe ser un número válido" });
        }

        if (salePrice === undefined || salePrice === null || isNaN(salePrice)) {
            return res.status(400).json({ error: "El precio de venta debe ser un número válido" });
        }

        // ✅ ACTUALIZACIÓN CON VALORES POR DEFECTO
        product.name = name.trim();
        product.costPrice = parseFloat(costPrice) || 0;
        product.salePrice = parseFloat(salePrice) || 0;
        product.category = category ? category.trim() : 'Sin categoría';
        product.brand = brand ? brand.trim() : 'Sin marca';
        product.size = size ? size.trim() : null;
        product.barcode = barcode !== undefined ? String(barcode).trim() : product.barcode;
        product.stock = stock !== undefined ? parseInt(stock) : product.stock;

        await product.save();
        
        console.log('✅ Producto actualizado:', {
            id: product._id,
            name: product.name,
            salePrice: product.salePrice
        });
        
        res.json(product);
    } catch (error) {
        console.error('❌ Error al actualizar producto:', error);
        res.status(500).json({ 
            error: "Error al actualizar el producto",
            details: error.message 
        });
    }
});

// Delete a product
router.delete("/:id", auth, checkPermission('eliminarProductos'), async (req, res) => {
    try {
        const product = await findProductWithAdminPermission(req.params.id, req.user.id, req.user.tipo);

        if (!product) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Producto eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el producto" });
    }
});

// Marcar un producto como vendido
// Marcar un producto como vendido
router.put("/:id/sell", auth, checkPermission('marcarVendido'), async (req, res) => {
    try {
        const { soldTo, saleId } = req.body; // ✅ NUEVO: recibir saleId
        const product = await findProductWithAdminPermission(req.params.id, req.user.id, req.user.tipo);

        if (!product) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        if (product.sold) {
            return res.status(400).json({ error: "El producto ya está marcado como vendido" });
        }

        product.sold = true;
        product.soldDate = new Date();
        product.soldTo = soldTo || "Cliente no registrado";

        await product.save();

        // ✅ NUEVO: Si hay saleId, agregar el producto a la venta
        if (saleId) {
            const Sale = require("../models/Sale");
            await Sale.findByIdAndUpdate(
                saleId,
                { $push: { productIds: product._id } }
            );
        }

        res.json({ message: "Producto marcado como vendido", product });
    } catch (error) {
        console.error("Error al marcar como vendido:", error);
        res.status(500).json({ error: "Error al marcar como vendido" });
    }
});

// Eliminar un producto de una venta
router.patch("/:id/product", auth, async (req, res) => {
    try {
        const query = req.user.tipo === 1 
            ? { _id: req.params.id, user: req.user.id }
            : { _id: req.params.id };
        
        const sale = await Sale.findOne(query);

        if (!sale) {
            return res.status(404).json({ error: "Venta no encontrada" });
        }

        sale.productName = null;
        await sale.save();
        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el producto vendido" });
    }
});

module.exports = router;