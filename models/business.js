var mongoose = require("mongoose")
var Schema = mongoose.Schema;

var businessSchema = new Schema({
    id: {
        type: Number,
        unique: true,
    },
    accountConfirmed: {
        type: Boolean,
    },
    accountSuspended: {
        type: Boolean,
    },
    category: {
        type: String,
        required: true,
    },
    vendor: {
        type: String,
        required: true,
    },
    businessName: {
        type: String,
        required: true,
    },
    businessAddress: {
        type: String,
        required: true,
    },
    businessBranches: {
        type: Number,
        required: true,
    },
    businessType: {
        type: Object,
    },
    businessNafdacNumber: {
        type: String,
    },
    businessEmailAddress: {
        type: String,
        required: true,
        unique: true,
    },
    businessPhoneNumber: {
        type: String,
        required: true,
    },
    businessHandles: {
        type: Object,
    },
    ownerFirstName: {
        type: String,
        required: true,
    },
    ownerLastName: {
        type: String,
        required: true,
    },
    ownerGender: {
        type: String,
        required: true,
    },
    ownerNationality: {
        type: String,
        required: true,
    },
    ownerState: {
        type: String,
        required: true,
    },
    ownerLGA: {
        type: String,
        required: true,
    },
    ownerCommunity: {
        type: String,
        required: true,
    },
    ownerEmailAddress: {
        type: String,
        required: true,
    },
    ownerPhoneNumber: {
        type: String,
        required: true,
    },
    ownerId: {
        type: Object,
    },
}, { timestamps: true })

module.exports = mongoose.model("businesses", businessSchema)