const mongoose = require('mongoose');
const mongooseAutoIncrement = require('mongoose-auto-increment');

const QrcodeSchema = new mongoose.Schema({
    codeId: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
    scans: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

mongooseAutoIncrement.initialize(mongoose.connection);
QrcodeSchema.plugin(mongooseAutoIncrement.plugin, { model: 'Qrcode', field: 'codeId', startAt: 1, incrementBy: 1 });
const Qrcode = mongoose.model('Qrcode', QrcodeSchema);

module.exports = Qrcode;
