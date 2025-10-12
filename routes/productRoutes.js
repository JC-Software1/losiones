const express = require("express");
const auth = require("../middleware/auth");
const { checkPermission } = require("../middleware/checkPermissions");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const router = express.Router();

// ✅ FUNCIÓN AUXILIAR
async function findProductWithAdminPermission(productId, userId, userTipo) {
    if (userTipo === 2 || userTipo === 3) {
        return await Product.findById(productId);
    } else {
        return await Product.findOne({ _id: productId, user: userId });
    }
}

// 🔥 RUTA PARA ADMINS: Obtener productos de un vendedor
router.get("/vendedor/:vendedorId", auth, async (req, res) => {
    try {
        const { vendedorId } = req.params;
        
        if (req.user.tipo !== 2 && req.user.tipo !== 3) {
            return res.status(403).json({ error: 'No tienes permisos' });
        }
        
        const products = await Product.find({ user: vendedorId });
        res.json(products);
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

// Get all products
router.get("/", auth, checkPermission('verProductos'), async (req, res) => {
    try {
        const query = req.user.tipo === 1 ? { user: req.user.id } : {};
        const products = await Product.find(query);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener los productos" });
    }
});

// Último producto creado
router.get("/last", auth, checkPermission('verProductos'), async (req, res) => {
    try {
        const query = req.user.tipo === 1 ? { user: req.user.id } : {};
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
        const { name, costPrice, salePrice, category, brand, size } = req.body;

        if (!name || !costPrice || !salePrice) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        const product = new Product({
            name,
            costPrice,
            salePrice,
            category,
            brand,
            size,
            user: req.user.id
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
        const { name, costPrice, salePrice, category, brand, size } = req.body;

        if (!name || !costPrice || !salePrice) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        const product = new Product({
            name,
            costPrice,
            salePrice,
            category,
            brand,
            size,
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
// Update a product
router.put("/:id", auth, checkPermission('editarProductos'), async (req, res) => {
    const { name, costPrice, salePrice, category, brand, size } = req.body;
    try {
        const product = await findProductWithAdminPermission(req.params.id, req.user.id, req.user.tipo);

        if (!product) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        product.name = name;
        product.costPrice = costPrice;
        product.salePrice = salePrice;
        product.category = category;
        product.brand = brand;
        product.size = size || null;

        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el producto" });
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