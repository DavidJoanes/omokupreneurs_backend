var mongoose = require("mongoose")
var Schema = mongoose.Schema;
var bcrypt = require("bcryptjs")
var jwt = require("jsonwebtoken")

var adminSchema = new Schema({
    id: {
        type: Number,
        unique: true,
    },
    profilePicture: {
        type: Object,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    emailAddress: {
        type: String,
        required: true,
        unique: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    registrationDate: {
        type: String,
        required: true,
    },
    isSuspended: {
        type: Boolean,
        required: true,
    },
    token: {
        type: String,
    }
})

adminSchema.pre("save", async function(next) {
    var admin = this;
    if (!admin.isModified('password')) return next();  
    try {
      const salt = await bcrypt.genSalt(Number(process.env.SECRET_SALT));
      admin.password = await bcrypt.hash(admin.password, salt);
      next();
    } catch (error) {
      return next(error);
    }
})

adminSchema.pre("resetPassword", async function(next) {
    var admin = this;
    if (!admin.isModified('password')) return next();  
    try {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(admin.password, salt);
      next();
    } catch (error) {
      return next(error);
    }
})

adminSchema.methods.newPassword = function(newpassword, callback) {
    bcrypt.genSalt(20, function(error, salt) {
        if (error) {
            return callback(error)
        }
        bcrypt.hash(newpassword, salt, function(error, hash) {
            if (error) {
                return callback(error)
            }
            newpassword = hash;
            callback(null, newpassword)
        })
    })
}

adminSchema.methods.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
}

module.exports = mongoose.model("admins", adminSchema)