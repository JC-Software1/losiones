const express = require("express");
const auth = require("../middleware/auth");
const { checkPermission } = require("../middleware/checkPermissions");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const router = express.Router();

// Get all products - requiere permiso "verProductos"
router.get("/", auth, checkPermission('verProductos'), async (req, res) => {
    try {
        const products = await Product.find({ user: req.user.id });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener los productos" });
    }
});

// Create a new product - requiere permiso "crearProductos"
router.post("/new", auth, checkPermission('crearProductos'), async (req, res) => {
    try {
        const { name, costPrice, salePrice, category, brand, size } = req.body;

        console.log("Datos recibidos en el servidor:", { 
            name, 
            costPrice, 
            salePrice 
        });

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

// Update a product - requiere permiso "editarProductos"
router.put("/:id", auth, checkPermission('editarProductos'), async (req, res) => {
    const { name, costPrice, salePrice, category, brand, size } = req.body;
    try {
        const product = await Product.findOne({ _id: req.params.id, user: req.user.id });

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

// Delete a product - requiere permiso "eliminarProductos"
router.delete("/:id", auth, checkPermission('eliminarProductos'), async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({ _id: req.params.id, user: req.user.id });

        if (!product) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        res.json({ message: "Producto eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el producto" });
    }
});

// Marcar un producto como vendido - requiere permiso "marcarVendido"
router.put("/:id/sell", auth, checkPermission('marcarVendido'), async (req, res) => {
    try {
        const { soldTo } = req.body;

        const product = await Product.findOne({ _id: req.params.id, user: req.user.id });

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

        res.json({ message: "Producto marcado como vendido", product });
    } catch (error) {
        console.error("Error al marcar como vendido:", error);
        res.status(500).json({ error: "Error al marcar como vendido" });
    }
});

// Eliminar un producto de una venta
router.patch("/:id/product", auth, async (req, res) => {
    try {
        const sale = await Sale.findOne({ _id: req.params.id, user: req.user.id });

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

// Último producto creado por el usuario
router.get("/last", auth, checkPermission('verProductos'), async (req, res) => {
  try {
    const last = await Product.findOne({ user: req.user.id })
                              .sort({ createdAt: -1 })
                              .select("_id name costPrice salePrice");
    if (!last) return res.status(404).json({ error: "No hay productos" });
    res.json(last);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;