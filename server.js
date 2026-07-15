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
const liquidationRoutes = require("./routes/liquidationRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const cashMovementRoutes = require("./routes/cashMovementRoutes");   // 1) importar
const acueductoRoutes = require("./routes/acueductoRoutes");




dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// 🟢 Habilitar CORS para permitir peticiones desde el frontend
app.use(cors({
    origin: ["https://jc-c.netlify.app", "https://jc-c.onrender.com", "https://losiones-fjt0.onrender.com", "http://127.0.0.1:5502", "http://127.0.0.1:5503"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Ruta manual para probar bloqueo de suscripciones (eliminar en producción)
const User = require('./models/Users');
app.get("/api/test-bloqueo", async (req, res) => {
    const dias = parseInt(req.query.dias) || 30;
    await checkExpiredSubscriptions(dias);
    res.json({ message: "Verificación de suscripciones ejecutada" });
});

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/sales", salesRoutes);
app.use('/api/products', productRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/commission', commissionRoutes);
app.use("/api/sales-commission", salesCommissionRoutes);
app.use("/api/liquidation", liquidationRoutes);
app.use("/api/cash-movement", cashMovementRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/acueducto", acueductoRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));

// ============================================
// 🔥 CRON JOBS - Verificación de suscripciones
// ============================================
function startCronJobs() {
    console.log('⏰ Servicio de Cron Jobs iniciado.');
    
    // Ejecutar verificación cada hora (3600000 ms)
    setInterval(checkExpiredSubscriptions, 3600000);
    
    // Ejecutar una vez al inicio para asegurar estado consistente
    checkExpiredSubscriptions();
}

async function checkExpiredSubscriptions(diasPrueba = null) {
    try {
        console.log('🔍 Verificando suscripciones vencidas...');
        const now = new Date();
        
        // Buscar usuarios que cumplieron un mes y no están pagados
        const usersToCheck = await User.find({
            bloqueado: { $ne: true },
            pagado: { $ne: true }
        });
        
        let count = 0;
        for (const user of usersToCheck) {
            const fechaCreacion = new Date(user.createdAt);
            const fechaComparar = new Date(fechaCreacion);
            
            if (diasPrueba) {
                fechaComparar.setDate(fechaComparar.getDate() - diasPrueba);
            } else {
                fechaComparar.setMonth(fechaComparar.getMonth() + 1);
            }
            
            if (now >= fechaComparar) {
                user.bloqueado = true;
                user.motivoBloqueo = 'Su período de prueba ha vencido. Por favor contacte al administrador para continuar.';
                user.fechaBloqueo = now;
                await user.save();
                count++;
            }
        }
        
        if (count > 0) {
            console.log(`⚠️ ${count} usuarios bloqueados por vencimiento de suscripción.`);
        } else {
            console.log('✅ No hay suscripciones por vencer.');
        }
        
    } catch (error) {
        console.error('❌ Error en cron job de suscripciones:', error);
    }
}

startCronJobs();

//