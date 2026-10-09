const axios = require('axios');
const User = require('../models/Users');

const getBaseUrl = (environment) => {
    return environment === 'production'
        ? 'https://api.matias-api.com/api/ubl2.1'
        : 'https://sandbox-api.matias-api.com/api/ubl2.1';
};

/**
 * Format the invoice JSON structure for MATIAS API
 */
const formatInvoicePayload = (order, userConfig) => {
    const clienteEmail = (order.facturacionEmail && order.facturacionEmail.trim()) ? order.facturacionEmail.trim() : null;
    const destinatarioEmail = clienteEmail || userConfig.email || "jcdev.software@gmail.com";

    // 1. Customer Data
    const customer = {
        country_id: "45",
        city_id: String(userConfig.municipioId || "149"),
        identity_document_id: "3", // Cédula de ciudadanía
        type_organization_id: 2, // Persona natural
        tax_regime_id: 2, // No responsable de IVA
        tax_level_id: 5,
        company_name: order.clientName && order.clientName.trim() ? order.clientName.trim() : "Consumidor Final",
        dni: order.clienteCcNit && order.clienteCcNit.trim() ? order.clienteCcNit.trim() : "222222222222",
        email: destinatarioEmail,
        address: order.clientAddress || userConfig.direccion || "Calle Principal"
    };

    // 2. Build Invoice Lines and Taxes
    let line_extension_amount = 0;
    let tax_exclusive_amount = 0;
    let tax_inclusive_amount = 0;
    const allTaxTotals = [];

    const orderItems = order.products && order.products.length > 0 ? order.products : [{ name: order.productName, quantity: 1, salePrice: order.price }];

    const lines = orderItems.map((item, idx) => {
        const qty = item.quantity || item.cantidad || 1;
        const price = item.salePrice || item.precio || (order.price / qty);
        const line_total = qty * price;
        
        let line = {
            invoiced_quantity: String(qty),
            quantity_units_id: "70", // 70 = Unidad
            line_extension_amount: line_total.toFixed(2),
            free_of_charge_indicator: false,
            description: item.name || item.nombreProducto || `Item #${idx + 1}`,
            code: item.productId ? String(item.productId).slice(-6) : `PRD${idx + 1}`,
            type_item_identifications_id: "4", // Estándar de la empresa
            reference_price_id: "1",
            price_amount: price.toFixed(2),
            base_quantity: String(qty)
        };

        let taxTotalAmount = 0;
        let taxableAmount = line_total;

        if (item.producto && item.producto.impuesto && item.producto.impuesto.tipo && item.producto.impuesto.tipo !== 'NINGUNO') {
            const porcentaje = item.producto.impuesto.porcentaje || 0;
            const taxAmount = (line_total * porcentaje) / 100;
            taxTotalAmount = taxAmount;
            
            const tax_id = item.producto.impuesto.tipo === 'IVA' ? "1" : "2"; 

            const taxObj = {
                tax_id: tax_id,
                tax_amount: parseFloat(taxAmount.toFixed(2)),
                taxable_amount: parseFloat(taxableAmount.toFixed(2)),
                percent: parseFloat(porcentaje.toFixed(2))
            };
            line.tax_totals = [taxObj];
            allTaxTotals.push(taxObj);
        }

        line_extension_amount += taxableAmount;
        tax_exclusive_amount += taxableAmount;
        tax_inclusive_amount += (taxableAmount + taxTotalAmount);

        return line;
    });

    // 3. Legal Monetary Totals
    const legal_monetary_totals = {
        line_extension_amount: line_extension_amount.toFixed(2),
        tax_exclusive_amount: tax_exclusive_amount.toFixed(2),
        tax_inclusive_amount: tax_inclusive_amount.toFixed(2),
        payable_amount: parseFloat(tax_inclusive_amount.toFixed(2))
    };

    // 4. Payments
    let means_payment_id = 10; // Efectivo default
    if (order.paymentType === 'transferencia') means_payment_id = 47;
    else if (order.paymentType === 'mixto') means_payment_id = 42;

    const payments = [{
        payment_method_id: 1, // Contado
        means_payment_id: means_payment_id,
        value_paid: tax_inclusive_amount.toFixed(2)
    }];

    // Ensure prefix matches resolution in Sandbox (FEV for electronic invoices)
    let prefix = userConfig.prefix && userConfig.prefix.trim() ? userConfig.prefix.trim() : 'FEV';
    if (prefix === 'DPOS') {
        prefix = 'FEV'; // Resolution 18760000001 uses FEV for /invoice
    }

    const payload = {
        resolution_number: userConfig.resolutionNumber || "18760000001",
        prefix: prefix,
        document_number: String(userConfig.currentNumber || 1),
        operation_type_id: 1,
        type_document_id: 7, // 7 = Factura electrónica estándar
        graphic_representation: 1,
        send_email: (clienteEmail && clienteEmail.includes('@')) ? 1 : 0,
        payments: payments,
        customer: customer,
        lines: lines,
        legal_monetary_totals: legal_monetary_totals
    };

    if (allTaxTotals.length > 0) {
        payload.tax_totals = allTaxTotals;
    }

    return payload;
};

/**
 * Synchronize currentNumber with MATIAS API by finding the highest document number already emitted
 */
const syncConsecutivoConMatias = async (user) => {
    try {
        const config = user.matiasConfig;
        const token = user.getMatiasToken();
        const baseUrl = getBaseUrl(config.environment);
        const res = await axios.get(`${baseUrl}/documents`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            timeout: 7000
        });
        const docs = (res.data && res.data.dataRecords && res.data.dataRecords.data) || [];
        let maxNum = config.currentNumber || 0;
        for (const doc of docs) {
            if (doc.document_number) {
                const match = doc.document_number.match(/\d+$/);
                if (match) {
                    const num = parseInt(match[0], 10);
                    if (num > maxNum) maxNum = num;
                }
            }
        }
        await User.updateOne({ _id: user._id }, { 'matiasConfig.currentNumber': maxNum });
        console.log(`🔄 Sincronización MATIAS: consecutivo actualizado de ${config.currentNumber} a ${maxNum}`);
        return maxNum;
    } catch (e) {
        console.warn('⚠️ No se pudo sincronizar consecutivo automáticamente con MATIAS:', e.message);
        return null;
    }
};

/**
 * Emit an electronic invoice
 */
const emitirFactura = async (order, userId, retryCount = 0) => {
    // Atomic update to increment consecutive number
    const user = await User.findOneAndUpdate(
        { _id: userId, 'matiasConfig.activo': true },
        { $inc: { 'matiasConfig.currentNumber': 1 } },
        { new: true }
    );

    if (!user || !user.matiasConfig || !user.matiasConfig.activo) {
        throw new Error('Configuración de MATIAS API no encontrada o inactiva para este restaurante');
    }

    const config = user.matiasConfig;
    const token = user.getMatiasToken();

    if (!token) {
        throw new Error('Token de MATIAS API no configurado');
    }

    if (config.currentNumber > config.to) {
        throw new Error(`El consecutivo actual (${config.currentNumber}) supera el límite autorizado (${config.to})`);
    }

    const payload = formatInvoicePayload(order, config);
    const baseUrl = getBaseUrl(config.environment);

    try {
        const response = await axios.post(`${baseUrl}/invoice`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        return {
            success: true,
            data: response.data,
            numero: `${payload.prefix}${payload.document_number}`
        };
    } catch (error) {
        let errorMessage = 'Error al comunicar con MATIAS API';
        if (error.response && error.response.data) {
            errorMessage = error.response.data.message || JSON.stringify(error.response.data);
            if (error.response.data.errors) {
                errorMessage += ': ' + JSON.stringify(error.response.data.errors);
            }
        }

        const isAlreadyValidated = errorMessage.toLowerCase().includes('ya se encuentra validado') ||
                                   errorMessage.toLowerCase().includes('already validated') ||
                                   errorMessage.toLowerCase().includes('ya existe');

        // Si el número ya fue validado en DIAN/MATIAS, NO decrementar (evita bucle de error).
        // En su lugar, sincronizamos con MATIAS y reintentamos con el nuevo consecutivo.
        if (isAlreadyValidated && retryCount < 2) {
            console.log(`⚠️ Consecutivo ${payload.prefix}${payload.document_number} en conflicto ("${errorMessage}"). Sincronizando y reintentando...`);
            await syncConsecutivoConMatias(user);
            return emitirFactura(order, userId, retryCount + 1);
        }

        if (!isAlreadyValidated) {
            // Solo hacer rollback si fue un error transitorio que no quemó el consecutivo
            await User.updateOne(
                { _id: userId },
                { $inc: { 'matiasConfig.currentNumber': -1 } }
            );
        }

        throw new Error(errorMessage);
    }
};

/**
 * Emit a POS document
 */
const emitirPos = async (order, userId) => {
    return emitirFactura(order, userId);
};

module.exports = {
    emitirFactura,
    emitirPos
};
