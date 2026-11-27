const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Employee = require("../models/Employee");
const Payroll = require("../models/Payroll");
const User = require("../models/Users");
const matiasApi = require("../services/matiasApi");

/* =========================================================
   EMPLEADOS (CRUD)
========================================================= */

// Listar empleados del usuario
router.get("/employees", auth, async (req, res) => {
    try {
        const employees = await Employee.find({ user: req.user.id, activo: true })
            .sort({ firstSurname: 1, firstName: 1 });
        res.json(employees);
    } catch (error) {
        console.error("Error al obtener empleados:", error);
        res.status(500).json({ error: "Error al obtener empleados" });
    }
});

// Crear empleado
router.post("/employees", auth, async (req, res) => {
    try {
        const {
            firstName,
            secondName,
            firstSurname,
            secondSurname,
            identityDocumentId,
            dni,
            email,
            phone,
            address,
            cityId,
            salary,
            contractTypeId,
            paymentMethodId,
            meansPaymentId,
            bankName,
            accountType,
            accountNumber,
            dateEntry
        } = req.body;

        if (!firstName || !firstSurname || !dni || salary === undefined) {
            return res.status(400).json({ error: "Nombre, primer apellido, documento y salario son obligatorios" });
        }

        const employee = new Employee({
            firstName: firstName.trim(),
            secondName: (secondName || '').trim(),
            firstSurname: firstSurname.trim(),
            secondSurname: (secondSurname || '').trim(),
            identityDocumentId: identityDocumentId || "1",
            dni: String(dni).trim(),
            email: (email || '').trim(),
            phone: (phone || '').trim(),
            address: (address || 'Calle Principal').trim(),
            cityId: String(cityId || '149'),
            salary: Number(salary) || 0,
            contractTypeId: Number(contractTypeId) || 1,
            paymentMethodId: paymentMethodId || "1",
            meansPaymentId: meansPaymentId || "10",
            bankName: (bankName || '').trim(),
            accountType: accountType || 'AHORROS',
            accountNumber: (accountNumber || '').trim(),
            dateEntry: dateEntry ? new Date(dateEntry) : new Date(),
            user: req.user.id
        });

        await employee.save();
        res.status(201).json(employee);
    } catch (error) {
        console.error("Error al crear empleado:", error);
        res.status(500).json({ error: error.message || "Error al crear empleado" });
    }
});

// Actualizar empleado
router.put("/employees/:id", auth, async (req, res) => {
    try {
        const employee = await Employee.findOne({ _id: req.params.id, user: req.user.id });
        if (!employee) return res.status(404).json({ error: "Empleado no encontrado" });

        const allowed = [
            'firstName', 'secondName', 'firstSurname', 'secondSurname',
            'identityDocumentId', 'dni', 'email', 'phone', 'address', 'cityId',
            'salary', 'contractTypeId', 'paymentMethodId', 'meansPaymentId',
            'bankName', 'accountType', 'accountNumber', 'dateEntry', 'activo'
        ];

        allowed.forEach(f => {
            if (req.body[f] !== undefined) employee[f] = req.body[f];
        });

        await employee.save();
        res.json(employee);
    } catch (error) {
        console.error("Error al actualizar empleado:", error);
        res.status(500).json({ error: "Error al actualizar empleado" });
    }
});

// Eliminar (desactivar) empleado
router.delete("/employees/:id", auth, async (req, res) => {
    try {
        const employee = await Employee.findOne({ _id: req.params.id, user: req.user.id });
        if (!employee) return res.status(404).json({ error: "Empleado no encontrado" });

        employee.activo = false;
        await employee.save();
        res.json({ message: "Empleado desactivado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar empleado" });
    }
});

/* =========================================================
   NÓMINAS (Liquidación y Emisión DIAN)
========================================================= */

// Listar nóminas
router.get("/", auth, async (req, res) => {
    try {
        const list = await Payroll.find({ user: req.user.id })
            .populate('employee')
            .sort({ settlementStartDate: -1, createdAt: -1 });
        res.json(list);
    } catch (error) {
        console.error("Error al obtener nóminas:", error);
        res.status(500).json({ error: "Error al obtener nóminas" });
    }
});

// Liquidar nómina (cálculo automático legal Colombia 2026)
router.post("/liquidar", auth, async (req, res) => {
    try {
        const {
            employeeId,
            settlementStartDate,
            settlementEndDate,
            workedDays,
            transportationAssistance,
            bonuses,
            commissions,
            overtime,
            otherDeductions,
            notes
        } = req.body;

        const employee = await Employee.findOne({ _id: employeeId, user: req.user.id });
        if (!employee) return res.status(404).json({ error: "Empleado no encontrado" });

        const days = Math.min(31, Math.max(1, Number(workedDays) || 30));
        const dailySalary = employee.salary / 30;
        const salaryWorked = Number((dailySalary * days).toFixed(2));

        const baseTransp = Number(transportationAssistance !== undefined ? transportationAssistance : 0);
        const transAssistance = Number(((baseTransp / 30) * days).toFixed(2));

        const extraBonuses = Number(bonuses) || 0;
        const extraCommissions = Number(commissions) || 0;
        const extraOvertime = Number(overtime) || 0;

        const totalEarned = Number((salaryWorked + transAssistance + extraBonuses + extraCommissions + extraOvertime).toFixed(2));

        // Base para aportes a seguridad social (no incluye auxilio de transporte)
        const ibc = salaryWorked + extraCommissions + extraOvertime;
        const healthDeduction = Number((ibc * 0.04).toFixed(2));
        const pensionDeduction = Number((ibc * 0.04).toFixed(2));
        const otherDed = Number(otherDeductions) || 0;

        const totalDeductions = Number((healthDeduction + pensionDeduction + otherDed).toFixed(2));
        const totalPayable = Number((totalEarned - totalDeductions).toFixed(2));

        const payroll = new Payroll({
            employee: employee._id,
            user: req.user.id,
            settlementStartDate: new Date(settlementStartDate),
            settlementEndDate: new Date(settlementEndDate),
            payDay: new Date(),
            workedDays: days,
            timeWorked: days,
            salaryWorked,
            transportationAssistance: transAssistance,
            bonuses: extraBonuses,
            commissions: extraCommissions,
            overtime: extraOvertime,
            totalEarned,
            healthDeduction,
            pensionDeduction,
            otherDeductions: otherDed,
            totalDeductions,
            totalPayable,
            notes: notes || ''
        });

        await payroll.save();
        await payroll.populate('employee');

        res.status(201).json(payroll);
    } catch (error) {
        console.error("Error al liquidar nómina:", error);
        res.status(500).json({ error: error.message || "Error al liquidar nómina" });
    }
});

// Emitir Nómina Electrónica ante la DIAN (Matias API)
router.post("/:id/emitir-dian", auth, async (req, res) => {
    try {
        const payroll = await Payroll.findOne({ _id: req.params.id, user: req.user.id })
            .populate('employee');
        if (!payroll) return res.status(404).json({ error: "Nómina no encontrada" });

        const user = await User.findById(req.user.id);
        if (!user || !user.matiasConfig || !user.matiasConfig.activo) {
            return res.status(400).json({ error: "Configuración de Matias API inactiva o incompleta en Ajustes" });
        }

        const config = user.matiasConfig;
        const emp = payroll.employee;
        const startDateStr = payroll.settlementStartDate.toISOString().split('T')[0];
        const endDateStr = payroll.settlementEndDate.toISOString().split('T')[0];
        const payDayStr = (payroll.payDay || new Date()).toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];
        const nowTimeStr = new Date().toTimeString().split(' ')[0];

        // Consecutivo para nómina
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $inc: { 'matiasConfig.currentNumber': 1 } },
            { new: true }
        );
        const docNum = String(updatedUser.matiasConfig.currentNumber);

        // Construir JSON UBL 2.1 oficial para Nómina Electrónica
        const payload = {
            resolution_number: config.resolutionNumber || "18760000001",
            document_number: docNum,
            generation_city_id: String(emp.cityId || config.municipioId || "149"),
            worker_code: emp.dni,
            novelty: false,
            pay_day: payDayStr,
            period: {
                date_entry: emp.dateEntry ? emp.dateEntry.toISOString().split('T')[0] : startDateStr,
                departure_date: null,
                settlement_start_date: startDateStr,
                settlement_end_date: endDateStr,
                time_worked: String(payroll.timeWorked || payroll.workedDays || 30),
                generation_date: todayStr
            },
            general_information: {
                generation_date: todayStr,
                generation_time: nowTimeStr,
                period_id: "5", // 5 = Mensual
                currency_id: "272", // COP
                trm: "0"
            },
            notes: payroll.notes || "Pago de nómina mensual",
            employee: {
                worker_type_id: emp.workerTypeId || 1,
                worker_subtype_id: emp.workerSubtypeId || 1,
                high_risk_pension: "false",
                identity_document_id: String(emp.identityDocumentId || "1"),
                document_number: emp.dni,
                first_surname: emp.firstSurname,
                second_surname: emp.secondSurname || emp.firstSurname,
                first_name: emp.firstName,
                other_names: emp.secondName || "",
                working_country_id: 45,
                work_city_id: Number(emp.cityId || 149),
                work_address: emp.address || "Calle Principal",
                integral_salary: "false",
                contract_type_id: emp.contractTypeId || 1,
                salary: String(emp.salary),
                worker_code: emp.dni
            },
            payment: {
                payment_method_id: emp.paymentMethodId || "1",
                means_payment_id: emp.meansPaymentId || "10",
                bank: emp.bankName || "BANCOLOMBIA",
                account_type: emp.accountType || "AHORROS",
                account_number: emp.accountNumber || "0000000000"
            },
            earn: {
                basic: {
                    worked_days: String(payroll.workedDays),
                    salary_worked: String(payroll.salaryWorked)
                },
                transport: {
                    transportation_assistance: String(payroll.transportationAssistance || 0),
                    viatic_maintenance: "0.0",
                    viatic_non_salary_maintenance: "0.0"
                }
            },
            deductions: {
                health: {
                    percentage: "4",
                    deduction: String(payroll.healthDeduction)
                },
                pension_fund: {
                    percentage: "4",
                    deduction: String(payroll.pensionDeduction)
                }
            },
            rounding: "0",
            total_earned: String(payroll.totalEarned),
            deductions_total: String(payroll.totalDeductions),
            total_voucher: String(payroll.totalPayable)
        };

        if (payroll.bonuses > 0) {
            payload.earn.bonuses = [{
                bonusS: String(payroll.bonuses),
                bonusNS: "0.00"
            }];
        }
        if (payroll.commissions > 0) {
            payload.earn.commissions = [{
                commission: String(payroll.commissions)
            }];
        }

        try {
            const result = await matiasApi.emitirNomina(payload, req.user.id);
            payroll.dianCune = result.cune;
            payroll.dianDocumentNumber = docNum;
            payroll.dianIsValid = result.isValid;
            payroll.dianStatus = result.isValid ? 'Aceptado por DIAN' : 'Pendiente';
            payroll.dianSentAt = new Date();
            payroll.dianResponse = result.data;
            await payroll.save();

            res.json({
                message: "Nómina transmitida a la DIAN con éxito",
                cune: result.cune,
                isValid: result.isValid,
                documentNumber: docNum
            });
        } catch (err) {
            // Rollback del consecutivo si falló
            await User.updateOne({ _id: req.user.id }, { $inc: { 'matiasConfig.currentNumber': -1 } });
            console.error("Error al emitir nómina a Matias API:", err.message);
            res.status(502).json({ error: err.message || "Error al transmitir nómina a la DIAN" });
        }
    } catch (error) {
        console.error("Error interno en emisión de nómina:", error);
        res.status(500).json({ error: "Error interno al procesar nómina" });
    }
});

module.exports = router;
