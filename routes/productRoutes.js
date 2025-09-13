const express = require("express");
const auth = require("../middleware/auth");
const Product = require("../models/Product");
const router = express.Router();

// Get all products for the logged in user
router.get("/", auth, async (req, res) => {
    try {
        const products = await Product.find({ user: req.user.id });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener los productos" });
    }
});

// Create a new product
router.post("/new", auth, async (req, res) => {
    try {
        const { name, costPrice, salePrice } = req.body;

        // Log received data for debugging
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
            user: req.user.id
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).json({ error: error.message });
    }
});

// Update a product
router.put("/:id", auth, async (req, res) => {
    const { name, costPrice, salePrice } = req.body;

    try {
        const product = await Product.findOne({ _id: req.params.id, user: req.user.id });

        if (!product) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        // Update the product data
        product.name = name;
        product.costPrice = costPrice;
        product.salePrice = salePrice;

        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el producto" });
    }
});

// Delete a product
router.delete("/:id", auth, async (req, res) => {
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

// Marcar un producto como vendido
// Marcar un producto como vendido
router.put("/:id/sell", auth, async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, user: req.user.id });

        if (!product) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        // Buscar la venta más reciente que contenga este producto y esté liquidada
        const sale = await Sale.findOne({
            user: req.user.id,
            productName: product.name,
            settled: true
        }).sort({ settledDate: -1 });

        // Marcar como vendido y guardar datos del cliente
        product.sold = true;
        product.soldDate = new Date();
        product.soldTo = sale ? sale.clientName : "Cliente no registrado";

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

        // Eliminar el nombre del producto de la venta
        sale.productName = null;  // Si deseas eliminar el producto por completo

        await sale.save();
        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el producto vendido" });
    }
});


module.exports = router;