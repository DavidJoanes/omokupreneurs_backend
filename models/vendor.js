var mongoose = require("mongoose")
var Schema = mongoose.Schema;

var vendorSchema = new Schema({
    id: {
        type: Number,
        unique: true,
    },
    categoryName: {
        type: String,
        required: true,
    },
    vendorName: {
        type: String,
        required: true,
    },
    fee: {
        type: Number,
        required: true,
    },
    isEnabled: {
        type: Boolean,
    },
}, { timestamps: true })

module.exports = mongoose.model("vendors", vendorSchema)