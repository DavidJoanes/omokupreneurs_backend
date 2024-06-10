var mongoose = require("mongoose")
var Schema = mongoose.Schema;

var categorySchema = new Schema({
    id: {
        type: Number,
        unique: true,
    },
    categoryName: {
        type: String,
        required: true,
    },
    vendors: {
        type: Array,
    },
    totalExpectedFee: {
        type: Number,
    },
}, { timestamps: true })

module.exports = mongoose.model("categories", categorySchema)