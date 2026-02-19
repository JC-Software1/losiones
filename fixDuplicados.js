const mongoose = require('mongoose');
const Sale = require('./models/Sale');

(async () => {
    try {
        await mongoose.connect(
            'mongodb+srv://admin:admin@cluster0.yusyj.mongodb.net/dbGastos?retryWrites=true&w=majority&appName=Cluster0'
        );
        
        console.log('✅ Conectado a MongoDB');
        
        const sales = await Sale.find({});
        console.log(`📦 Revisando ${sales.length} ventas...`);
        
        let corregidas = 0;
        let pagosEliminados = 0;
        
        for (const sale of sales) {
            if (!sale.payments || sale.payments.length <= 1) continue;
            
            const pagosUnicos = [];
            const vistos = new Set();
            let duplicadosEncontrados = false;
            
            for (const pago of sale.payments) {
                const fechaSolo = new Date(pago.date).toISOString().split('T')[0];
                const clave = `${pago.amount}-${fechaSolo}`;
                
                if (!vistos.has(clave)) {
                    vistos.add(clave);
                    pagosUnicos.push(pago);
                } else {
                    duplicadosEncontrados = true;
                    pagosEliminados++;
                    console.log(`   ❌ Duplicado eliminado: $${pago.amount} del ${fechaSolo}`);
                }
            }
            
            if (duplicadosEncontrados) {
                console.log(`\n🔧 Venta corregida: ${sale._id}`);
                console.log(`   Cliente: ${sale.clientName}`);
                
                sale.payments = pagosUnicos;
                
                const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
                if (totalPaid >= sale.price && !sale.settled) {
                    sale.settled = true;
                    sale.settledDate = new Date();
                } else if (totalPaid < sale.price && sale.settled) {
                    sale.settled = false;
                    sale.settledDate = null;
                }
                
                await sale.save();
                corregidas++;
            }
        }
        
        console.log(`\n✅ Listo. ${corregidas} ventas corregidas, ${pagosEliminados} pagos duplicados eliminados.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
})();
