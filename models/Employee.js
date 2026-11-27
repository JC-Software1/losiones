const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    secondName: { type: String, default: '', trim: true },
    firstSurname: { type: String, required: true, trim: true },
    secondSurname: { type: String, default: '', trim: true },
    identityDocumentId: { type: String, default: "1" }, // 1 = Cédula de ciudadanía, 2 = NIT, 3 = CE
    dni: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: 'Calle Principal', trim: true },
    cityId: { type: String, default: '149' }, // 149 = DANE Pereira / default
    salary: { type: Number, required: true, min: 0 },
    contractTypeId: { type: Number, default: 1 }, // 1 = Término Indefinido, 2 = Término Fijo, 3 = Obra o Labor
    workerTypeId: { type: Number, default: 1 }, // 1 = Dependiente
    workerSubtypeId: { type: Number, default: 1 }, // 1 = No aplica
    paymentMethodId: { type: String, default: "1" }, // 1 = Instrumento no definido / Efectivo
    meansPaymentId: { type: String, default: "10" }, // 10 = Efectivo, 31 = Transferencia débito, 47 = Transferencia
    bankName: { type: String, default: '' },
    accountType: { type: String, enum: ['AHORROS', 'CORRIENTE', ''], default: 'AHORROS' },
    accountNumber: { type: String, default: '' },
    dateEntry: { type: Date, default: Date.now },
    activo: { type: Boolean, default: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, {
    timestamps: true
});

EmployeeSchema.virtual('fullName').get(function() {
    return [this.firstName, this.secondName, this.firstSurname, this.secondSurname]
        .filter(Boolean)
        .join(' ');
});

EmployeeSchema.index({ user: 1, dni: 1 });

module.exports = mongoose.model("Employee", EmployeeSchema);
