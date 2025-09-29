const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors"); // Importa CORS
const connectDB = require("./config/db"); // Asegúrate de que esta conexión esté configurada correctamente
const authRoutes = require("./routes/authRoutes");
const salesRoutes = require("./routes/salesRoutes");
const productRoutes = require("./routes/productRoutes");
const receiptRoutes = require('./routes/receiptRoutes');
const commissionRoutes = require('./routes/commissionRoutes');
const salesCommissionRoutes = require("./routes/salesCommissionRoutes");



dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// 🟢 Habilitar CORS para permitir peticiones desde el frontend
app.use(cors({
    origin: ["https://jc-c.netlify.app", "http://127.0.0.1:5502", "http://127.0.0.1:5503"], // Ajusta según la URL de tu frontend
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH "],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/sales", salesRoutes);
app.use('/api/products', productRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/commission', commissionRoutes);
app.use("/api/sales-commission", salesCommissionRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));

//