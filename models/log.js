var mongoose = require("mongoose")
var Schema = mongoose.Schema;

var logSchema = new Schema({
    logType: {
        type: String,
        required: true,
    },
    success: {
        type: Boolean,
    },
    emailAddress: {
        type: String,
        required: true,
    },
    ipAddress: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    // timeStamp: {
    //     type: Date,
    //     required: true,
    // },
}, { timestamps: true })

module.exports = mongoose.model("logs", logSchema)