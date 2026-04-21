/**
 * Utility to generate and print POS invoices for thermal printers (58mm).
 * Reuses the logic established in the sales system.
 */

export function generatePOS(data) {
    // Si recibimos receiptData (formato de categories.js), extraemos saleData
    // Si no, asumimos que 'data' ya es el saleData
    const saleData = data.saleData || data;
    const isContado = saleData.paymentType === 'contado';

    // Generar contenido del ticket en texto plano
    const ticketText = `
================================
      ${isContado ? 'COMPROBANTE DE PAGO' : 'COMPROBANTE DE VENTA'}
================================
Fecha: ${new Date().toLocaleDateString('es-CO')}
Hora: ${new Date().toLocaleTimeString('es-CO')}

--------------------------------
CLIENTE
--------------------------------
${saleData.clientName}
${saleData.clientAddress || 'Sin dirección'}

--------------------------------
PRODUCTOS
--------------------------------
${saleData.products && Array.isArray(saleData.products) ? saleData.products.map((p, i) => {
        const qty = p.quantity || 1;
        const subtotal = (p.salePrice || 0) * qty;
        return `${i + 1}. ${p.name} (x${qty})
   $${p.salePrice.toLocaleString('es-CO')} c/u = $${subtotal.toLocaleString('es-CO')}`;
    }).join('\n') : `• ${saleData.productName || 'Sin nombre de producto'}`}

--------------------------------
DETALLE DE PAGO
--------------------------------
Total: $${(saleData.price || 0).toLocaleString('es-CO')}
Tipo: ${isContado ? 'CONTADO' : 'A CUOTAS'}

${!isContado ? `Cuotas: ${saleData.numberOfInstallments || saleData.installments || 1}
Valor cuota: $${(saleData.paymentPerInstallment || 0).toLocaleString('es-CO')}
Pago inicial: $${(saleData.advancePayment || 0).toLocaleString('es-CO')}` : `Pago realizado: $${(saleData.price || 0).toLocaleString('es-CO')}
SALDO: $0`}

--------------------------------
${isContado ? '✓ PAGO COMPLETO' : `Saldo pendiente: $${(saleData.remainingBalance !== undefined ? saleData.remainingBalance : (saleData.price - (saleData.advancePayment || 0))).toLocaleString('es-CO')}`}
================================

Gracias por su compra!
Volver pronto

================================
`;

    // Abrir ventana de impresión
    const printWindow = window.open('', '_blank', 'width=400,height=600');

    if (!printWindow) {
        alert("⚠️ El navegador bloqueó la ventana de impresión. Por favor permite las ventanas emergentes e intenta de nuevo.");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ticket POS - ${saleData.clientName}</title>
            <style>
                @media print {
                    body { 
                        margin: 0; 
                        padding: 10px;
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                    }
                    @page {
                        size: 58mm auto;
                        margin: 0;
                    }
                }
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                    white-space: pre-wrap;
                    width: 58mm;
                    margin: 0 auto;
                    padding: 5px;
                }
                .header { text-align: center; font-weight: bold; }
                .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
            </style>
        </head>
        <body>
            <div class="header" style="white-space: pre-wrap; text-align: center;">
${ticketText.trim()}
            </div>
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        window.close();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
