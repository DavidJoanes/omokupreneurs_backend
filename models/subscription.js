var mongoose = require("mongoose")
var Schema = mongoose.Schema;

var subscriptionSchema = new Schema({
    id: {
        type: Number,
        unique: true,
    },
    status: {
        type: Boolean,
    },
    businessCategory: {
        type: String,
        required: true,
    },
    businessEmailAddress: {
        type: String,
        required: true,
    },
    businessName: {
        type: String,
        required: true,
    },
    csrFee: {
        type: Number,
        required: true,
    },
    monthPaidFor: {
        type: String,
        required: true,
    },
    yearPaidFor: {
        type: String,
        required: true,
    },
    receiptNumber: {
        type: String,
        required: true,
    },
}, { timestamps: true })

module.exports = mongoose.model("subscriptions", subscriptionSchema)