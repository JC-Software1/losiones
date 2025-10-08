// fixPaymentPerInstallment.js (en raíz)
const mongoose = require('mongoose');
const Sale = require('./models/Sale'); // ← ahora apunta a la carpeta models de tu backend

(async () => {
  try {
await mongoose.connect(
  'mongodb+srv://<usuario>:<clave>@cluster0.xxxxx.mongodb.net/losiones?retryWrites=true&w=majority',
  { useNewUrlParser: true, useUnifiedTopology: true }
);

    const sales = await Sale.find({ paymentPerInstallment: { $exists: false } });
    console.log(`📦 Encontradas ${sales.length} ventas sin paymentPerInstallment`);

    for (const sale of sales) {
      const remaining = sale.price - (sale.advancePayment || 0);
      const cuotas = parseInt(sale.installments) || 1;
      sale.paymentPerInstallment = Math.ceil(remaining / cuotas);
      await sale.save();
    }

    console.log('✅ Todas las ventas ahora tienen su paymentPerInstallment');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();