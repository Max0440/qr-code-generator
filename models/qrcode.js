const mongoose = require('mongoose');
const mongooseAutoIncrement = require('mongoose-auto-increment');

const QrcodeSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
    },
    redirectUrl: {
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

const Qrcode = mongoose.model('Qrcode', QrcodeSchema);

module.exports = Qrcode;
