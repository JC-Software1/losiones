const axios = require('axios');
const User = require('../models/Users');
const Product = require('../models/Product');
const Sale = require('../models/Sale');

const getBaseUrl = (environment) => {
    return environment === 'production'
        ? 'https://api.matias-api.com/api/ubl2.1'
        : 'https://sandbox-api.matias-api.com/api/ubl2.1';
};

/**
 * Carga el mapa de productos reales desde BD para obtener sus impuestos (taxType / taxPercent)
 */
const loadProductsMap = async (order) => {
    const map = {};
    try {
        const ids = (order.products || [])
            .map(p => p.productId)
            .filter(Boolean);
        if (ids.length > 0) {
            const docs = await Product.find({ _id: { $in: ids } })
                .select('taxType taxPercent name')
                .lean();
            for (const d of docs) {
                map[String(d._id)] = d;
            }
        }
    } catch (e) {
        console.warn('⚠️ No se pudieron cargar impuestos de productos:', e.message);
    }
    return map;
};

/**
 * Construye customer para Matias API
 */
const buildCustomer = (order, userConfig) => {
    const clienteEmail = (order.facturacionEmail && order.facturacionEmail.trim()) ? order.facturacionEmail.trim() : null;
    const destinatarioEmail = clienteEmail || userConfig.email || "jcdev.software@gmail.com";

    return {
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
};

/**
 * Construye líneas y totales fiscales (IVA, INC y retenciones opcionales)
 * Nota: Los precios de venta en el sistema incluyen impuestos (PVP), por lo cual
 * se desagrega la base gravable: base = total / (1 + %/100) para que payable_amount == total pagado.
 */
const buildLinesAndTotals = (order, userConfig, productsMap = {}, overrideItems = null) => {
    let line_extension_amount = 0;
    let tax_exclusive_amount = 0;
    let tax_inclusive_amount = 0;
    const taxGroups = {}; // agrupa por `${tax_id}_${percent}`

    const orderItems = overrideItems && overrideItems.length > 0
        ? overrideItems
        : (order.products && order.products.length > 0
            ? order.products
            : [{ name: order.productName, quantity: 1, salePrice: order.price }]);

    const lines = orderItems.map((item, idx) => {
        const qty = Number(item.quantity || item.cantidad || 1) || 1;
        const unitPvp = Number(item.salePrice ?? item.precio ?? (order.price / qty)) || 0;
        const pvpTotal = qty * unitPvp;

        const dbProd = item.productId ? productsMap[String(item.productId)] : null;
        const taxType = item.taxType
            || item.producto?.impuesto?.tipo
            || dbProd?.taxType
            || userConfig.defaultTaxType
            || 'NINGUNO';
        const porcentaje = Number(
            item.taxPercent
            ?? item.producto?.impuesto?.porcentaje
            ?? dbProd?.taxPercent
            ?? userConfig.defaultTaxPercent
            ?? 0
        ) || 0;

        let taxableAmount = pvpTotal;
        let taxTotalAmount = 0;
        let lineTaxTotals = null;

        if (taxType !== 'NINGUNO' && porcentaje > 0) {
            // Desagregar impuesto incluido en PVP
            taxableAmount = Number((pvpTotal / (1 + porcentaje / 100)).toFixed(2));
            taxTotalAmount = Number((pvpTotal - taxableAmount).toFixed(2));
            const tax_id = taxType === 'INC' ? "4" : "1"; // 1=IVA, 4=INC

            const taxObj = {
                tax_id,
                tax_amount: taxTotalAmount,
                taxable_amount: taxableAmount,
                percent: Number(porcentaje.toFixed(2))
            };
            lineTaxTotals = [taxObj];

            const key = `${tax_id}_${taxObj.percent}`;
            if (!taxGroups[key]) {
                taxGroups[key] = { ...taxObj };
            } else {
                taxGroups[key].tax_amount = Number((taxGroups[key].tax_amount + taxTotalAmount).toFixed(2));
                taxGroups[key].taxable_amount = Number((taxGroups[key].taxable_amount + taxableAmount).toFixed(2));
            }
        }

        const unitBase = Number((taxableAmount / qty).toFixed(2));

        const line = {
            invoiced_quantity: String(qty),
            quantity_units_id: "70", // 70 = Unidad
            line_extension_amount: taxableAmount.toFixed(2),
            free_of_charge_indicator: false,
            description: item.name || item.nombreProducto || `Item #${idx + 1}`,
            code: item.productId ? String(item.productId).slice(-6) : `PRD${idx + 1}`,
            type_item_identifications_id: "4", // Estándar de la empresa
            reference_price_id: "1",
            price_amount: unitBase.toFixed(2),
            base_quantity: String(qty)
        };

        if (lineTaxTotals) {
            line.tax_totals = lineTaxTotals;
        }

        line_extension_amount += taxableAmount;
        tax_exclusive_amount += taxableAmount;
        tax_inclusive_amount += (taxableAmount + taxTotalAmount);

        return line;
    });

    const allTaxTotals = Object.values(taxGroups);

    // Retenciones opcionales (Retefuente = 6, ReteIVA = 5, ReteICA = 7)
    const ret = order.retenciones || {};
    if (Number(ret.reteFuentePercent) > 0 && tax_exclusive_amount > 0) {
        const pct = Number(ret.reteFuentePercent);
        allTaxTotals.push({
            tax_id: "6",
            tax_amount: Number(((tax_exclusive_amount * pct) / 100).toFixed(2)),
            taxable_amount: Number(tax_exclusive_amount.toFixed(2)),
            percent: pct
        });
    }
    if (Number(ret.reteIcaPercent) > 0 && tax_exclusive_amount > 0) {
        const pct = Number(ret.reteIcaPercent);
        allTaxTotals.push({
            tax_id: "7",
            tax_amount: Number(((tax_exclusive_amount * pct) / 100).toFixed(2)),
            taxable_amount: Number(tax_exclusive_amount.toFixed(2)),
            percent: pct
        });
    }
    const totalIva = allTaxTotals
        .filter(t => t.tax_id === "1")
        .reduce((s, t) => s + t.tax_amount, 0);
    if (Number(ret.reteIvaPercent) > 0 && totalIva > 0) {
        const pct = Number(ret.reteIvaPercent);
        allTaxTotals.push({
            tax_id: "5",
            tax_amount: Number(((totalIva * pct) / 100).toFixed(2)),
            taxable_amount: Number(totalIva.toFixed(2)),
            percent: pct
        });
    }

    const legal_monetary_totals = {
        line_extension_amount: line_extension_amount.toFixed(2),
        tax_exclusive_amount: tax_exclusive_amount.toFixed(2),
        tax_inclusive_amount: tax_inclusive_amount.toFixed(2),
        payable_amount: parseFloat(tax_inclusive_amount.toFixed(2))
    };

    return { lines, legal_monetary_totals, allTaxTotals, totalPayable: tax_inclusive_amount };
};

/**
 * Format the invoice JSON structure for MATIAS API
 */
const formatInvoicePayload = (order, userConfig, productsMap = {}, options = {}) => {
    const clienteEmail = (order.facturacionEmail && order.facturacionEmail.trim()) ? order.facturacionEmail.trim() : null;
    const customer = buildCustomer(order, userConfig);
    const { lines, legal_monetary_totals, allTaxTotals, totalPayable } = buildLinesAndTotals(order, userConfig, productsMap);

    let means_payment_id = 10; // Efectivo default
    const metodo = (order.metodoPago || order.paymentType || '').toLowerCase();
    if (metodo === 'transferencia') means_payment_id = 47;
    else if (metodo === 'mixto') means_payment_id = 42;

    const payment_method_id = order.paymentType === 'cuotas' ? 2 : 1; // 1=Contado, 2=Crédito

    const payments = [{
        payment_method_id,
        means_payment_id,
        value_paid: totalPayable.toFixed(2)
    }];

    let prefix = userConfig.prefix && userConfig.prefix.trim() ? userConfig.prefix.trim() : 'FEV';
    const isPosDoc = options.isPos === true && prefix !== 'FEV';
    if (!isPosDoc && prefix === 'DPOS') {
        prefix = 'FEV';
    }

    const payload = {
        resolution_number: userConfig.resolutionNumber || "18760000001",
        prefix,
        document_number: String(userConfig.currentNumber || 1),
        operation_type_id: 1,
        type_document_id: isPosDoc ? 20 : 7, // 7 = Factura electrónica estándar, 20 = POS electrónico
        graphic_representation: 1,
        send_email: (clienteEmail && clienteEmail.includes('@')) ? 1 : 0,
        payments,
        customer,
        lines,
        legal_monetary_totals
    };

    if (isPosDoc) {
        payload.point_of_sale = {
            cashier_name: userConfig.razonSocial || "Cajero Principal",
            terminal_number: "POS01",
            cashier_type: "Caja Principal",
            sales_code: "POS01",
            address: userConfig.direccion || "Calle Principal",
            sub_total: totalPayable.toFixed(2)
        };
        payload.software_manufacturer = {
            owner_name: userConfig.razonSocial || "JC Software",
            company_name: userConfig.razonSocial || "JC Software",
            software_name: "JC-C POS"
        };
    }

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
 * Guarda CUFE y estado DIAN en el documento Sale
 */
const persistSaleDianResult = async (order, numero, responseData) => {
    if (!order || !order._id) return;
    try {
        const cufe = responseData?.XmlDocumentKey || responseData?.response?.XmlDocumentKey || null;
        const rawValid = responseData?.response?.IsValid;
        const isValid = rawValid === 'true' || rawValid === true || responseData?.ShippingMethod === 'SendTestSetAsync';
        const status = responseData?.response?.StatusDescription
            || responseData?.message
            || (isValid ? 'Procesado Correctamente' : 'Pendiente');

        await Sale.updateOne(
            { _id: order._id },
            {
                $set: {
                    dianCufe: cufe,
                    dianDocumentNumber: numero,
                    dianStatus: status,
                    dianIsValid: isValid
                }
            }
        );
    } catch (e) {
        console.warn('⚠️ No se pudo guardar CUFE en Sale:', e.message);
    }
};

/**
 * Emit an electronic invoice
 */
const emitirFactura = async (order, userId, retryCount = 0, options = {}) => {
    const user = await User.findOneAndUpdate(
        { _id: userId, 'matiasConfig.activo': true },
        { $inc: { 'matiasConfig.currentNumber': 1 } },
        { new: true }
    );

    if (!user || !user.matiasConfig || !user.matiasConfig.activo) {
        throw new Error('Configuración de MATIAS API no encontrada o inactiva');
    }

    const config = user.matiasConfig;
    const token = user.getMatiasToken();

    if (!token) {
        throw new Error('Token de MATIAS API no configurado');
    }

    if (config.currentNumber > config.to) {
        throw new Error(`El consecutivo actual (${config.currentNumber}) supera el límite autorizado (${config.to})`);
    }

    const productsMap = await loadProductsMap(order);
    const payload = formatInvoicePayload(order, config, productsMap, options);
    const baseUrl = getBaseUrl(config.environment);

    console.log(`📧 Emitiendo factura ${payload.prefix}${payload.document_number} | Email: ${payload.customer?.email} | send_email: ${payload.send_email} | Env: ${config.environment}`);

    try {
        const response = await axios.post(`${baseUrl}/invoice`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const numero = `${payload.prefix}${payload.document_number}`;
        console.log(`✅ Factura ${numero} emitida exitosamente. Respuesta MATIAS:`, JSON.stringify(response.data).substring(0, 300));

        await persistSaleDianResult(order, numero, response.data);

        return {
            success: true,
            data: response.data,
            numero,
            cufe: response.data?.XmlDocumentKey || response.data?.response?.XmlDocumentKey || null
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

        if (isAlreadyValidated && retryCount < 2) {
            console.log(`⚠️ Consecutivo ${payload.prefix}${payload.document_number} en conflicto ("${errorMessage}"). Sincronizando y reintentando...`);
            await syncConsecutivoConMatias(user);
            return emitirFactura(order, userId, retryCount + 1, options);
        }

        if (!isAlreadyValidated) {
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
    return emitirFactura(order, userId, 0, { isPos: true });
};

/**
 * Emitir Nota Crédito (POST /notes/credit) o Nota Débito (POST /notes/debit)
 * @param {'NC'|'ND'} noteType
 */
const emitirNotaAjuste = async (sale, userId, noteType = 'NC', options = {}) => {
    const isCredit = noteType === 'NC';
    const counterField = isCredit ? 'matiasConfig.ncCurrentNumber' : 'matiasConfig.ndCurrentNumber';

    const user = await User.findOneAndUpdate(
        { _id: userId, 'matiasConfig.activo': true },
        { $inc: { [counterField]: 1 } },
        { new: true }
    );

    if (!user || !user.matiasConfig || !user.matiasConfig.activo) {
        throw new Error('Configuración de MATIAS API no encontrada o inactiva');
    }

    const config = user.matiasConfig;
    const token = user.getMatiasToken();
    if (!token) throw new Error('Token de MATIAS API no configurado');

    const baseUrl = getBaseUrl(config.environment);
    const productsMap = await loadProductsMap(sale);

    const overrideItems = options.amount && (!options.items || options.items.length === 0)
        ? [{
            name: options.reason || (isCredit ? 'Nota Crédito / Ajuste' : 'Nota Débito / Cargo'),
            quantity: 1,
            salePrice: Number(options.amount),
            taxType: config.defaultTaxType || 'NINGUNO',
            taxPercent: config.defaultTaxPercent || 0
        }]
        : options.items;

    const { lines, legal_monetary_totals, allTaxTotals, totalPayable } = buildLinesAndTotals(
        sale,
        config,
        productsMap,
        overrideItems
    );

    const prefix = isCredit ? (config.ncPrefix || 'NC') : (config.ndPrefix || 'ND');
    const docNumber = isCredit ? (config.ncCurrentNumber || 1) : (config.ndCurrentNumber || 1);
    const clienteEmail = (sale.facturacionEmail && sale.facturacionEmail.trim()) ? sale.facturacionEmail.trim() : null;
    const customer = buildCustomer(sale, config);

    const hasBillingRef = Boolean(sale.dianCufe && sale.dianDocumentNumber);
    const saleDateStr = sale.saleDate
        ? new Date(sale.saleDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

    const payload = {
        resolution_number: config.resolutionNumber || "18760000001",
        prefix,
        notes: options.reason || (isCredit ? "Anulación o ajuste de factura" : "Cargo adicional a factura"),
        document_number: String(docNumber),
        operation_type_id: isCredit ? (hasBillingRef ? 12 : 15) : (hasBillingRef ? 14 : 16),
        type_document_id: isCredit ? 5 : 4,
        graphic_representation: 1,
        send_email: (clienteEmail && clienteEmail.includes('@')) ? 1 : 0,
        payments: [{
            payment_method_id: 1,
            means_payment_id: sale.metodoPago === 'transferencia' ? 47 : 10,
            value_paid: totalPayable.toFixed(2)
        }],
        customer,
        lines,
        legal_monetary_totals,
        discrepancy_response: {
            reference_id: sale.dianDocumentNumber || `${config.prefix || 'FEV'}1`,
            response_id: String(options.discrepancyCode || (isCredit ? "2" : "3")),
            description: options.reason || (isCredit ? "Anulación / devolución" : "Ajuste de valor")
        }
    };

    if (hasBillingRef) {
        payload.billing_reference = {
            number: sale.dianDocumentNumber,
            date: saleDateStr,
            uuid: sale.dianCufe
        };
    }

    if (allTaxTotals.length > 0) {
        payload.tax_totals = allTaxTotals;
    }

    const endpoint = isCredit ? '/notes/credit' : '/notes/debit';

    try {
        const response = await axios.post(`${baseUrl}${endpoint}`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const numero = `${prefix}${docNumber}`;
        const cude = response.data?.XmlDocumentKey || response.data?.response?.XmlDocumentKey || null;
        const isValid = response.data?.response?.IsValid === 'true' || response.data?.response?.IsValid === true || response.data?.ShippingMethod === 'SendTestSetAsync';

        if (sale._id) {
            await Sale.updateOne(
                { _id: sale._id },
                {
                    $push: {
                        dianNotes: {
                            type: noteType,
                            number: numero,
                            cude,
                            reason: payload.notes,
                            amount: totalPayable,
                            date: new Date(),
                            isValid
                        }
                    }
                }
            );
        }

        return { success: true, data: response.data, numero, cude, isValid };
    } catch (error) {
        await User.updateOne({ _id: userId }, { $inc: { [counterField]: -1 } });
        let errorMessage = `Error al emitir ${noteType} en MATIAS API`;
        if (error.response && error.response.data) {
            errorMessage = error.response.data.message || JSON.stringify(error.response.data);
            if (error.response.data.errors) {
                errorMessage += ': ' + JSON.stringify(error.response.data.errors);
            }
        }
        throw new Error(errorMessage);
    }
};

const emitirNotaCredito = (sale, userId, options = {}) => emitirNotaAjuste(sale, userId, 'NC', options);
const emitirNotaDebito = (sale, userId, options = {}) => emitirNotaAjuste(sale, userId, 'ND', options);

/**
 * Emitir Nómina Electrónica Individual (POST /ep/payroll)
 */
const emitirNomina = async (payrollPayload, userId, mode = 'normal') => {
    const user = await User.findById(userId);
    if (!user || !user.matiasConfig || !user.matiasConfig.activo) {
        throw new Error('Configuración de MATIAS API no encontrada o inactiva');
    }

    const config = user.matiasConfig;
    const token = user.getMatiasToken();
    if (!token) throw new Error('Token de MATIAS API no configurado');

    const baseUrl = getBaseUrl(config.environment);
    let endpoint = '/ep/payroll';
    if (mode === 'replace') endpoint = '/ep/payroll/replace';
    else if (mode === 'delete') endpoint = '/ep/payroll/delete';

    try {
        const response = await axios.post(`${baseUrl}${endpoint}`, payrollPayload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const cune = response.data?.XmlDocumentKey || response.data?.response?.XmlDocumentKey || null;
        const isValid = response.data?.response?.IsValid === 'true' || response.data?.response?.IsValid === true || response.data?.success === true;

        return { success: true, data: response.data, cune, isValid };
    } catch (error) {
        let errorMessage = 'Error al emitir Nómina en MATIAS API';
        if (error.response && error.response.data) {
            errorMessage = error.response.data.message || JSON.stringify(error.response.data);
            if (error.response.data.errors) {
                errorMessage += ': ' + JSON.stringify(error.response.data.errors);
            }
        }
        throw new Error(errorMessage);
    }
};

/**
 * Consultar estado de un documento por CUFE/CUDE/CUNE
 */
const consultarEstadoDocumento = async (trackId, userId) => {
    const user = await User.findById(userId);
    if (!user || !user.matiasConfig || !user.matiasConfig.activo) {
        throw new Error('Configuración de MATIAS API no encontrada o inactiva');
    }
    const token = user.getMatiasToken();
    const baseUrl = getBaseUrl(user.matiasConfig.environment);
    const res = await axios.post(`${baseUrl}/status/document/${trackId}`, {}, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
    return res.data;
};

module.exports = {
    emitirFactura,
    emitirPos,
    emitirNotaCredito,
    emitirNotaDebito,
    emitirNomina,
    consultarEstadoDocumento
};
