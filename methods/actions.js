const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken")
var request = require('request');
var lodash = require("lodash")
var bcrypt = require("bcryptjs")
var businessModel = require("../models/business")
var adminModel = require("../models/admin")
var categoryModel = require("../models/category")
var vendorModel = require("../models/vendor")
var subscriptionModel = require("../models/subscription")
var failedSubscriptionModel = require("../models/failed_subscription")
var logModel = require("../models/log")
const fileUploader = require("../configurations/file_uploader")
const cloudinary = require("../configurations/cloudinary")
const toTitleCase = require("../configurations/title_case")
// const htmlTemplate = require("../html/mail_template");
const htmlTemplate = require('../html/mail_template');

module.exports = functions = {

    // Admin (posting)
    adminSignup: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;
        function getRandomInt(max) {
            return Math.floor(Math.random() * max);
        }
        var tempId = getRandomInt(99)
        try {
            const idExist = await adminModel.find({ id: tempId })
            if (idExist.length > 0) {
                console.log("Duplicate id!")
                return res.status(403).json({
                    success: false,
                    message: "Operation failed! Please try again.",
                })
            } else {
                const adminExist = await adminModel.find({ emailAddress: data.emailAddress })
                if (adminExist.length > 0) {
                    var newLog = logModel({
                        logType: "admin",
                        success: false,
                        emailAddress: data.emailAddress,
                        ipAddress: ipAddress,
                        description: `Registration failure. (account exist)`,

                    })
                    newLog.save()
                    return res.status(403).json({
                        success: false,
                        message: "Account already exist! Please login!"
                    })
                } else {
                    var newAdmin = adminModel({
                        id: tempId,
                        profilePicture: {
                            name: "",
                            path: "",
                        },
                        firstName: data.firstName,
                        lastName: data.lastName,
                        emailAddress: data.emailAddress,
                        phoneNumber: data.phoneNumber,
                        password: data.password,
                        registrationDate: new Date().toISOString().split("T")[0],
                        isSuspended: false,
                        token: "",
                    })
                    var newLog = logModel({
                        logType: "admin",
                        success: true,
                        emailAddress: data.emailAddress,
                        ipAddress: ipAddress,
                        description: `Registration success.`,

                    })
                    try {
                        await newAdmin.save()
                        newLog.save()
                        console.log("Admin registration successful..")
                        return res.status(200).json({
                            success: true,
                            message: "Admin registration successful..",
                            data: newAdmin
                        })
                    } catch (error) {
                        console.log(`Registration failed!: ${error}`)
                        return res.status(404).json({
                            success: false,
                            message: "Admin registration failed!",
                            data: []
                        })
                    }
                }
            }
        } catch (error) {
            console.log("Error occured during registration!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    adminResetPassword: async (req, res) => {
        const data = req.body
        const ipAddress = req.socket.remoteAddress;
        try {
            const adminExist = await adminModel.findOne({ emailAddress: data.emailAddress })
            if (!adminExist) {
                var newLog = logModel({
                    logType: "admin",
                    success: false,
                    emailAddress: data.emailAddress,
                    ipAddress: ipAddress,
                    description: `Password reset failure. (account does not exist)`,

                })
                newLog.save()
                return res.status(403).json({
                    success: false,
                    message: "Account doesn't exist!"
                })
            } else {
                const salt = await bcrypt.genSalt(Number(process.env.SECRET_SALT));
                var hashP = await bcrypt.hash(data.newPassword, salt);
                await adminModel.findOneAndUpdate(
                    { emailAddress: data.emailAddress },
                    {
                        password: hashP,
                    },
                    { new: true, runValidators: true }
                )
                var newLog = logModel({
                    logType: "admin",
                    success: true,
                    emailAddress: adminExist["emailAddress"],
                    ipAddress: ipAddress,
                    description: "Password reset success.",

                })
                newLog.save()
                return res.status(200).send({
                    success: true,
                    message: `Good job ${adminExist["lastName"]}!.. You can now login.`,
                    data: [],
                })
            }
        } catch (error) {
            console.log("Error occured during password reset!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    adminSignin: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;
        try {
            const admin = await adminModel.findOne({ emailAddress: data.emailAddress });
            if (!admin) {
                console.log("Authentication failed! - Account not found")
                return res.status(403).json({
                    success: false,
                    message: "Authentication failed! - Invalid credentials",
                    data: [],
                });
            }
            const passwordMatch = await admin.comparePassword(data.password);
            if (!passwordMatch) {
                var newLog = logModel({
                    logType: "admin",
                    success: false,
                    emailAddress: admin["emailAddress"],
                    ipAddress: ipAddress,
                    description: "Signin Authentication failed! - Invalid password.",

                })
                newLog.save()
                console.log("Authentication failed! - Invalid password")
                return res.status(403).json({
                    success: "false",
                    message: "Authentication failed! - Invalid credentials",
                    data: [],
                });
            }
            if (admin["isSuspended"]) {
                var newLog = logModel({
                    logType: "admin",
                    success: false,
                    emailAddress: admin["emailAddress"],
                    ipAddress: ipAddress,
                    description: "Authentication failed! - Account suspended.",

                })
                newLog.save()
                console.log("Authentication failed! - Account suspended")
                return res.status(403).json({
                    success: "suspended",
                    message: "Account suspended!",
                    data: [],
                });
            }

            const newToken = jwt.sign({ admin_id: data.emailAddress }, process.env.SECRET, {
                expiresIn: '1 hour'
            });
            await adminModel.findOneAndUpdate(
                { emailAddress: data.emailAddress },
                { token: newToken },
                { new: true, runValidators: true }
            )
            var newLog = logModel({
                logType: "admin",
                success: true,
                emailAddress: admin["emailAddress"],
                ipAddress: ipAddress,
                description: "Signin Authentication success.",

            })
            newLog.save()
            return res.status(200).send({
                success: "true",
                message: "Welcome back " + toTitleCase(admin["lastName"]) + "..",
                data: admin,
                token: newToken,
            })
        } catch (error) {
            console.log("Error occured during login!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    verifyToken: async (req, res, next) => {
        const token = req.headers["access-token"];
        if (!token) {
            console.log("No token found!")
            return res.status(403).send({
                success: false,
                message: "No token found!",
                data: [],
            });
        } else {
            try {
                const decoded = jwt.verify(token, process.env.SECRET);
                const admin = await adminModel.findOne({ emailAddress: decoded["admin_id"] })
                if (admin) {
                    console.log("Token is valid..")
                    return res.status(200).send({
                        success: true,
                        message: "Token is valid..",
                        data: admin,
                        token: admin["token"],
                    })
                }
            } catch (err) {
                console.log("Token has expired!")
                return res.status(403).send({
                    success: false,
                    message: "Token has expired!",
                    data: [],
                })
            }
        }
    },
    validateAdminEmailAndSendOtp: async (req, res) => {
        const data = req.body
        const ipAddress = req.socket.remoteAddress;
        try {
            var adminExist = await adminModel.findOne({ emailAddress: data.emailAddress })
            if (data.operation == "login"  || data.operation == "password reset") {
                if (!adminExist) {
                    var newLog = logModel({
                        logType: "admin",
                        success: false,
                        emailAddress: data.emailAddress,
                        ipAddress: ipAddress,
                        description: "Otp query failed! (Invalid admin account).",

                    })
                    newLog.save()
                    return res.status(403).send({
                        success: false,
                        message: "Operation failed!!",
                        data: []
                    })
                } else {
                    const transporter = nodemailer.createTransport({
                        service: "gmail",
                        host: "smtp.gmail.com",
                        port: 587,
                        secure: true,
                        html: false, // remove if error
                        auth: {
                            user: process.env.G_ACCOUNT,
                            pass: process.env.G_PASS,
                        },
                    });
                    transporter.verify().then(console.log).catch(console.error);
                    await transporter.sendMail({
                        from: '"OTP Generator" <jgotpgenerator@gmail.com>', // sender address
                        to: data.emailAddress, // list of receivers separated by a comma
                        subject: "OTP", // Subject line
                        text: `Your one time pass code for ${data.operation} is: ${data.otp}`, // plain text body
                        html: htmlTemplate(`<b>Your one time pass code for ${data.operation} is: <h2>${data.otp}</h2></b>`, `https://omokupreneurs.ng`), // html body
                    }).then(info => {
                        // console.log({info});
                    }).catch(console.error);
                    var newLog = logModel({
                        logType: "admin",
                        success: true,
                        emailAddress: data.emailAddress,
                        ipAddress: ipAddress,
                        description: `OTP query success. (for login)`,

                    })
                    newLog.save()
                    console.log("OTP sent! Please input otp from your mail inbox or spam..")
                    return res.status(200).json({
                        success: true,
                        message: "OTP sent! Please input otp from your mail inbox or spam..",
                        data: []
                    })
                }
            } else {
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    host: "smtp.gmail.com",
                    port: 587,
                    secure: true,
                    html: false, // remove if error
                    auth: {
                        user: process.env.G_ACCOUNT,
                        pass: process.env.G_PASS,
                    },
                });
                transporter.verify().then(console.log).catch(console.error);
                await transporter.sendMail({
                    from: '"OTP Generator" <bolebyjoanes@gmail.com>', // sender address
                    to: ["jogenics@gmail.com", "info@omokupreneurs.ng"], // list of receivers separated by a comma
                    subject: "OTP", // Subject line
                    text: `The one time pass code for ${data.firstName} ${data.lastName} with email address: ${data.emailAddress} for registration is: ${data.otp}`, // plain text body
                    // html: `<b>The one time pass code for ${data.firstName} ${data.lastName} with email address: ${data.emailAddress} for registration is: <h2>${data.otp}</h2></b>`, // html body
                }).then(info => {
                    console.log({ info });
                }).catch(console.error);
                var newLog = logModel({
                    logType: "admin",
                    success: true,
                    emailAddress: data.emailAddress,
                    ipAddress: ipAddress,
                    description: `OTP query success. (for registration)`,

                })
                newLog.save()
                console.log("OTP sent! Please contact developer for otp..")
                return res.status(200).json({
                    success: true,
                    message: "OTP sent! Please contact developer for otp..",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured during otp generation!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    addCategory: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;
        const token = req.headers["access-token"];
        function getRandomInt(max) {
            return Math.floor(Math.random() * max);
        }
        var tempId = getRandomInt(99)
        try {
            const decoded = jwt.verify(token, process.env.SECRET);
            const admin = await adminModel.findOne({ emailAddress: decoded["admin_id"] })
            if (admin) {
                const idExist = await categoryModel.find({ id: tempId })
                if (idExist.length > 0) {
                    console.log("Duplicate id!")
                    return res.status(403).json({
                        success: false,
                        message: "Operation failed! Please try again.",
                    })
                } else {
                    const categoryExist = await categoryModel.find({ categoryName: data.categoryName })
                    if (categoryExist.length > 0) {
                        var newLog = logModel({
                            logType: "admin",
                            success: false,
                            emailAddress: data.emailAddress,
                            ipAddress: ipAddress,
                            description: `Category addition failure.\nCategory name: ${data.categoryName}`,

                        })
                        newLog.save()
                        console.log("Category already exist!")
                        return res.status(403).json({
                            success: false,
                            message: "Category already exist!",
                        })
                    } else {
                        var newCategory = categoryModel({
                            id: tempId,
                            categoryName: data.categoryName,
                            vendors: [],
                            totalExpectedFee: 0,
                        })
                        var newLog = logModel({
                            logType: "admin",
                            success: true,
                            emailAddress: data.emailAddress,
                            ipAddress: ipAddress,
                            description: `Category addition success.\nCategory name: ${data.categoryName}`,

                        })
                        newCategory.save()
                        newLog.save()
                        console.log("Category added successfully..")
                        return res.status(200).json({
                            success: true,
                            message: "Operation succeeded..",
                            data: newCategory
                        })
                    }
                }
            }
        } catch (error) {
            console.log("Error occured when adding a category!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    addVendor: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;
        const token = req.headers["access-token"];
        function getRandomInt(max) {
            return Math.floor(Math.random() * max);
        }
        var tempId = getRandomInt(99)
        try {
            const decoded = jwt.verify(token, process.env.SECRET);
            const admin = await adminModel.findOne({ emailAddress: decoded["admin_id"] })
            if (admin) {
                const idExist = await vendorModel.find({ id: tempId })
                if (idExist.length > 0) {
                    console.log("Duplicate id!")
                    return res.status(403).json({
                        success: false,
                        message: "Operation failed! Please try again.",
                    })
                } else {
                    const categoryExist = await categoryModel.findOne({ categoryName: data.categoryName })
                    const vendorExist = await vendorModel.find({ vendorName: `${data.vendorName} (${data.categoryName})` })
                    var totalExpectedFee = 0
                    if (categoryExist) {
                        if (vendorExist.length > 0) {
                            vendorExist.forEach((vendor) => {
                                if (vendor["vendorName"].includes(vendor["categoryName"])) {
                                    var newLog = logModel({
                                        logType: "admin",
                                        success: false,
                                        emailAddress: data.emailAddress,
                                        ipAddress: ipAddress,
                                        description: `Vendor addition failure. (vendor already exist in this category)\nCategory name: ${data.categoryName}\Vendor name: ${data.vendorName}`,

                                    })
                                    newLog.save()
                                    console.log("Vendor already exist in this category!")
                                    return res.status(403).json({
                                        success: false,
                                        message: "Vendor name already exist in this category!",
                                    })
                                }
                            })
                        } else {
                            var newVendor = vendorModel({
                                id: tempId,
                                categoryName: data.categoryName,
                                vendorName: `${data.vendorName} (${data.categoryName})`,
                                fee: data.fee,
                                isEnabled: true,
                            })
                            var newLog = logModel({
                                logType: "admin",
                                success: true,
                                emailAddress: data.emailAddress,
                                ipAddress: ipAddress,
                                description: `Vendor addition success.\nCategory name: ${data.categoryName}\nVendor name: ${data.vendorName}`,

                            })
                            categoryExist["vendors"] = [...categoryExist["vendors"], newVendor]
                            await categoryModel.findOneAndUpdate(
                                { categoryName: data.categoryName },
                                { ...categoryExist },
                                { new: true, runValidators: true }
                            )
                            categoryExist["vendors"].forEach((ven) => {
                                totalExpectedFee += ven["fee"]
                            })
                            await categoryModel.findOneAndUpdate(
                                { categoryName: data.categoryName },
                                { "totalExpectedFee": totalExpectedFee },
                                { new: true, runValidators: true }
                            )
                            newVendor.save()
                            newLog.save()
                            console.log("Vendor added successfully..")
                            return res.status(200).json({
                                success: true,
                                message: "Operation succeeded..",
                                data: newVendor,
                            })
                        }
                    } else {
                        console.log("Category doesn't exist!")
                        return res.status(403).json({
                            success: false,
                            message: "Category doesn't exist!",
                        })
                    }
                }
            }
        } catch (error) {
            console.log("Error occured when adding a vendor!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    confirmBusiness: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;
        const token = req.headers["access-token"];
        try {
            const decoded = jwt.verify(token, process.env.SECRET);
            const admin = await adminModel.findOne({ emailAddress: decoded["admin_id"] })
            if (admin) {
                await businessModel.findOneAndUpdate(
                    { businessEmailAddress: data.businessEmailAddress },
                    { accountConfirmed: true },
                    { new: true, runValidators: true }
                )
                var newLog = logModel({
                    logType: "admin",
                    success: true,
                    emailAddress: data.emailAddress,
                    ipAddress: ipAddress,
                    description: `Bussiness registration confirmed. (Business Email: ${data.businessEmailAddress})`,

                })
                newLog.save()
                console.log("Bussiness registration confirmed successfully..")
                return res.status(200).send({
                    success: true,
                    message: "Bussiness registration confirmed successfully..",
                })
            }
        } catch (error) {
            console.log("Error occured during business registration confirmation!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    rejectBusiness: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;
        const token = req.headers["access-token"];
        let temp = ""
        try {
            const decoded = jwt.verify(token, process.env.SECRET);
            const admin = await adminModel.findOne({ emailAddress: decoded["admin_id"] })
            if (admin) {
                await businessModel.findOneAndDelete(
                    { businessEmailAddress: data.businessEmailAddress },
                    { accountConfirmed: false },
                    { new: true, runValidators: true }
                )
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    host: "smtp.gmail.com",
                    port: 587,
                    secure: true,
                    html: false, // remove if error
                    auth: {
                        user: process.env.G_ACCOUNT,
                        pass: process.env.G_PASS,
                    },
                });
                transporter.verify().then(console.log).catch(console.error);
                await transporter.sendMail({
                    from: '"OMOKUPRENEURS" <jgotpgenerator@gmail.com>', // sender address
                    to: data.businessEmailAddress, // list of receivers separated by a comma
                    subject: "BUSINESS REGISTRATION REJECTED", // Subject line
                    text: `Hello, \n\nWe regret to inform you that your business registration on our platform was rejected for the following reason(s): \n${data.reason} \nPlease endeavor to make the necessary corrections and register again.\n\nWarm wishes.\n\n\n-Omokupreneurs Support (support@omokupreneurs.ng).`, // plain text body
                }).then(info => {
                    // console.log({info});
                }).catch(console.error);
                var newLog = logModel({
                    logType: "admin",
                    success: true,
                    emailAddress: data.emailAddress,
                    ipAddress: ipAddress,
                    description: `Business Registration Rejected. (Business Email: ${data.businessEmailAddress})`,

                })
                newLog.save()
                console.log("Business rejected successfully..")
                return res.status(200).json({
                    success: true,
                    message: "Operation succeeded..",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured during rejection of business registration!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    suspendBusiness: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;
        const token = req.headers["access-token"];
        try {
            const decoded = jwt.verify(token, process.env.SECRET);
            const admin = await adminModel.findOne({ emailAddress: decoded["admin_id"] })
            if (admin) {
                await businessModel.findOneAndUpdate(
                    { businessEmailAddress: data.businessEmailAddress },
                    { accountSuspended: true },
                    { new: true, runValidators: true }
                )
                var newLog = logModel({
                    logType: "admin",
                    success: true,
                    emailAddress: data.emailAddress,
                    ipAddress: ipAddress,
                    description: `Bussiness suspended. (Business Email: ${data.businessEmailAddress})`,

                })
                newLog.save()
                console.log("Bussiness suspended successfully..")
                return res.status(200).send({
                    success: true,
                    message: "Bussiness suspended successfully..",
                })
            }
        } catch (error) {
            console.log("Error occured during business suspension!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    unsuspendBusiness: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;
        const token = req.headers["access-token"];
        try {
            const decoded = jwt.verify(token, process.env.SECRET);
            const admin = await adminModel.findOne({ emailAddress: decoded["admin_id"] })
            if (admin) {
                await businessModel.findOneAndUpdate(
                    { businessEmailAddress: data.businessEmailAddress },
                    { accountSuspended: false },
                    { new: true, runValidators: true }
                )
                var newLog = logModel({
                    logType: "admin",
                    success: true,
                    emailAddress: data.emailAddress,
                    ipAddress: ipAddress,
                    description: `Bussiness unsuspended. (Business Email: ${data.businessEmailAddress})`,

                })
                newLog.save()
                console.log("Bussiness suspension reset successful..")
                return res.status(200).send({
                    success: true,
                    message: "Bussiness suspension reset successful..",
                })
            }
        } catch (error) {
            console.log("Error occured during business suspension reset!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    editProfile: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;
        const token = req.headers["access-token"];
        try {
            const decoded = jwt.verify(token, process.env.SECRET);
            const admin = await adminModel.findOne({ emailAddress: decoded["admin_id"] })
            if (admin) {
                var adminExist = await adminModel.findOne({ emailAddress: data.emailAddress })
                await adminModel.findOneAndUpdate(
                    { emailAddress: adminExist["emailAddress"] },
                    {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        phoneNumber: data.phoneNumber,
                        emailAddress: data.newEmailAddress,
                    },
                    { new: true, runValidators: true }
                )
                var newLog = logModel({
                    logType: "admin",
                    success: true,
                    emailAddress: data.emailAddress,
                    ipAddress: ipAddress,
                    description: `Edited profile.\nPrevious data: (firstName: ${adminExist["firstName"]}, lastName: ${adminExist["lastName"]}, phoneNumber: ${adminExist["phoneNumber"]}, emailAddress: ${adminExist["emailAddress"]})\nNew data: (firstName: ${data.firstName}, lastName: ${data.lastName}, phoneNumber: ${data.phoneNumber}, emailAddress: ${data.newEmailAddress})`,

                })
                newLog.save()
                var adminExist2 = await adminModel.findOne({ emailAddress: data.newEmailAddress })
                console.log("Profile edited successfully..")
                return res.status(200).send({
                    success: true,
                    message: "Operation succeeded..",
                    data: adminExist2,
                })
            }
        } catch (error) {
            console.log("Error occured while editing admin profile!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    renameCategory: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;
        const token = req.headers["access-token"];
        let tempVendorName = ""
        let tempVendorName2 = ""
        let tempL = []
        try {
            const decoded = jwt.verify(token, process.env.SECRET);
            const admin = await adminModel.findOne({ emailAddress: decoded["admin_id"] })
            if (admin) {
                const categoryExist_ = await categoryModel.find({ categoryName: data.newCategoryName })
                if (categoryExist_.length > 0) {
                    var newLog = logModel({
                        logType: "admin",
                        success: false,
                        emailAddress: data.emailAddress,
                        ipAddress: ipAddress,
                        description: `Category rename failure.\nCategory name: ${data.categoryName}`,

                    })
                    newLog.save()
                    console.log("Category already exist!")
                    return res.status(403).json({
                        success: false,
                        message: "Category already exist!",
                    })
                } else {
                    var categoryExist = await categoryModel.findOne({ categoryName: data.categoryName })
                    if (categoryExist) {
                        var categoryExistInVendors = await vendorModel.find({ categoryName: data.categoryName })
                        categoryExist["vendors"].forEach(async (ven) => {
                            tempVendorName = ven["vendorName"]
                            categoryExist["vendors"][ven] = { ...ven, categoryName: data.newCategoryName, vendorName: tempVendorName.replace(tempVendorName.split("(")[1].split(")")[0], data.newCategoryName) }
                            tempL.push(categoryExist["vendors"][ven])
                        })
                        await categoryModel.findOneAndUpdate(
                            { id: categoryExist["id"] },
                            {
                                categoryName: data.newCategoryName,
                                vendors: tempL
                            },
                            { new: true, runValidators: true }
                        )
                        categoryExistInVendors.forEach(async (ven) => {
                            tempVendorName2 = ven["vendorName"]
                            await vendorModel.updateOne(
                                { categoryName: data.categoryName },
                                {
                                    categoryName: data.newCategoryName,
                                    vendorName: tempVendorName2.replace(tempVendorName2.split("(")[1].split(")")[0], data.newCategoryName),
                                },
                                { new: true, runValidators: true }
                            )
                        })
                        var newLog = logModel({
                            logType: "admin",
                            success: true,
                            emailAddress: data.emailAddress,
                            ipAddress: ipAddress,
                            description: `Renamed category.\nPrevious data: (categoryName: ${categoryExist["categoryName"]})\nNew data: (categoryName: ${data.newCategoryName})`,

                        })
                        newLog.save()
                        console.log("Renamed category successfully..")
                        return res.status(200).send({
                            success: true,
                            message: "Renamed category successfully..",
                        })
                    } else {
                        console.log("Category doesn't exist!")
                        return res.status(403).json({
                            success: false,
                            message: "Category doesn't exist!",
                        })
                    }
                }
            }
        } catch (error) {
            console.log("Error occured while renaming category!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    renameVendor: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;
        const token = req.headers["access-token"];
        try {
            const decoded = jwt.verify(token, process.env.SECRET);
            const admin = await adminModel.findOne({ emailAddress: decoded["admin_id"] })
            if (admin) {
                var vendorExist = await vendorModel.findOne({ vendorName: data.vendorName })
                if (vendorExist) {
                    await vendorModel.findOneAndUpdate(
                        { id: vendorExist["id"] },
                        {
                            vendorName: data.newVendorName,
                        },
                        { new: true, runValidators: true }
                    )
                    var newLog = logModel({
                        logType: "admin",
                        success: true,
                        emailAddress: data.emailAddress,
                        ipAddress: ipAddress,
                        description: `Renamed vendor.\nPrevious data: (vendorName: ${vendorExist["vendorName"]})\nNew data: (vendorName: ${data.newVendorName})`,

                    })
                    newLog.save()
                    console.log("Renamed vendor successfully..")
                    return res.status(200).send({
                        success: true,
                        message: "Renamed vendor successfully..",
                    })
                } else {
                    console.log("Vendor doesn't exist!")
                    return res.status(403).json({
                        success: false,
                        message: "Vendor doesn't exist!",
                    })
                }
            }
        } catch (error) {
            console.log("Error occured while renaming vendor!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    modifyVendorFee: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;
        const token = req.headers["access-token"];
        let tempL = []
        var totalExpectedFee = 0
        try {
            const decoded = jwt.verify(token, process.env.SECRET);
            const admin = await adminModel.findOne({ emailAddress: decoded["admin_id"] })
            if (admin) {
                var vendorExist = await vendorModel.findOne({ vendorName: data.vendorName })
                if (vendorExist) {
                    var categoryExist = await categoryModel.findOne({ categoryName: data.vendorName.split("(")[1].split(")")[0] })
                    tempL = categoryExist["vendors"]
                    categoryExist["vendors"].forEach(async (ven) => {
                        if (ven["vendorName"] == data.vendorName) {
                            tempL.remove(ven)
                            ven = { ...ven, fee: Number(data.newFee) }
                            tempL.push(ven)
                        }
                    })
                    await categoryModel.findOneAndUpdate(
                        { id: categoryExist["id"] },
                        {
                            vendors: [...tempL]
                        },
                        { new: true, runValidators: true }
                    )
                    var categoryExist2 = await categoryModel.findOne({ categoryName: data.vendorName.split("(")[1].split(")")[0] })
                    categoryExist2["vendors"].forEach((ven) => {
                        totalExpectedFee += ven["fee"]
                    })
                    await categoryModel.findOneAndUpdate(
                        { id: categoryExist2["id"] },
                        { "totalExpectedFee": totalExpectedFee },
                        { new: true, runValidators: true }
                    )
                    await vendorModel.findOneAndUpdate(
                        { id: vendorExist["id"] },
                        {
                            fee: data.newFee,
                        },
                        { new: true, runValidators: true }
                    )
                    var newLog = logModel({
                        logType: "admin",
                        success: true,
                        emailAddress: data.emailAddress,
                        ipAddress: ipAddress,
                        description: `Modified vendor fee.\nPrevious data: (vendorName: ${vendorExist["vendorName"]}, fee: ${vendorExist["fee"]})\nNew data: (vendorName: ${vendorExist["vendorName"]}, fee: ${data.newFee})`,

                    })
                    newLog.save()
                    console.log("Modified vendor fee successfully..")
                    return res.status(200).send({
                        success: true,
                        message: "Operation succeeded..",
                    })
                }
            } else {
                console.log("Vendor doesn't exist!")
                return res.status(403).json({
                    success: false,
                    message: "Vendor doesn't exist!",
                })
            }
        } catch (error) {
            console.log("Error occured while modifying vendor fee!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    modifyCategoryAndVendor: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;
        const token = req.headers["access-token"];
        try {
            const decoded = jwt.verify(token, process.env.SECRET);
            const admin = await adminModel.findOne({ emailAddress: decoded["admin_id"] })
            if (admin) {
                var categoryExist = await categoryModel.findOne({ categoryName: data.category })
                var subscriptionExist = await subscriptionModel.find({ businessCategory: data.category })
                if (categoryExist) {
                    await businessModel.findOneAndUpdate(
                        { businessEmailAddress: data.businessEmailAddress },
                        {
                            category: data.newCategory,
                            vendor: data.newVendor,
                        },
                        { new: true, runValidators: true }
                    )
                    for (let index = 0; index < subscriptionExist.length; index++) {
                        await subscriptionModel.findOneAndUpdate(
                            { businessEmailAddress: subscriptionExist[index]["businessEmailAddress"] },
                            {
                                businessCategory: data.newCategory,
                            },
                            { new: true, runValidators: true }
                        )
                    }
                    const transporter = nodemailer.createTransport({
                        service: "gmail",
                        host: "smtp.gmail.com",
                        port: 587,
                        secure: true,
                        html: false, // remove if error
                        auth: {
                            user: process.env.G_ACCOUNT,
                            pass: process.env.G_PASS,
                        },
                    });
                    transporter.verify().then(console.log).catch(console.error);
                    await transporter.sendMail({
                        from: '"OMOKUPRENUERS" <jgotpgenerator@gmail.com>', // sender address
                        to: data.businessEmailAddress, // list of receivers separated by a comma
                        subject: "BUSINESS CATEGORY/VENDOR TYPE MODIFIED", // Subject line
                        text: `Hello, \n\nWe wish to inform you that based on our review of your business, your business category/vendor type on our platform has been changed to ${data.newCategory} and ${data.newVendor} respectively.\nIt is important to note that this change takes effect immediately and it implies that your stipulated CSR fee will also change (either as an increase or decrease of your previous fee).\nIf you are not satisfied with this change, please contact us at support@omokupreneurs.ng\n\nWarm regards.\n\n\n-Omokupreneurs Support (support@omokupreneurs.ng).`, // plain text body
                    }).then(info => {
                        // console.log({info});
                    }).catch(console.error);
                    var newLog = logModel({
                        logType: "admin",
                        success: true,
                        emailAddress: data.emailAddress,
                        ipAddress: ipAddress,
                        description: `Modified ${data.businessEmailAddress} category and vendor.\nPrevious data: (category: ${data.category}, vendor: ${data.vendor})\nNew data: (category: ${data.newCategory}, vendor: ${data.newVendor})`,

                    })
                    newLog.save()
                    console.log(`Modified ${data.businessEmailAddress} category and vendor successfully..`)
                    return res.status(200).send({
                        success: true,
                        message: `Operation succeeded..`,
                    })
                } else {
                    console.log("Category doesn't exist!")
                    return res.status(403).json({
                        success: false,
                        message: "Category doesn't exist!",
                    })
                }
            }
        } catch (error) {
            console.log("Error occured while modifying a business category and vendor!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    adminSignout: async (req, res) => {
        const data = req.body
        const ipAddress = req.socket.remoteAddress;
        try {
            var token = jwt.verify(data.token, process.env.SECRET)
            if (token) {
                await adminModel.findOneAndUpdate(
                    { emailAddress: token["admin_id"] },
                    { token: "" },
                    { new: true, runValidators: true }
                )
                var newLog = logModel({
                    logType: "admin",
                    success: true,
                    emailAddress: token["admin_id"],
                    ipAddress: ipAddress,
                    description: "Signout success.",

                })
                newLog.save()
                return res.status(200).send({
                    success: true,
                    message: `Goodbye ${toTitleCase(data.adminLastName)}..`,
                    token: "",
                })
            } else {
                return res.status(403).send({
                    success: false,
                    message: `Sorry ${data.adminLastName}.. Unable to sign out at this moment.`,
                    token: "",
                })
            }
        } catch (error) {
            console.log("Error occured during logout!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    verifyAdminEmail: async (req, res) => {
        const data = req.body
        try {
            const adminExist = await adminModel.findOne({ emailAddress: data.emailAddress })
            if (adminExist) {
                return res.status(200).send({
                    success: true,
                    message: `valid...`,
                })
            } else {
                return res.status(403).send({
                    success: false,
                    message: `Invalid!`,
                })
            }
        } catch (error) {
            console.log("Error occured during admin email verification!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },

    // Admin (retrieving)
    fetchBusinesses: async (req, res) => {
        try {
            var businessExist = await businessModel.find({ accountConfirmed: true }).sort({ businessName: 1 })
            if (businessExist.length > 0) {
                console.log("Businesses retrieved successfully..")
                return res.status(200).send({
                    success: true,
                    message: "Businesses retrieved successfully..",
                    data: businessExist
                })
            } else {
                console.log("No record found!")
                return res.status(403).send({
                    success: false,
                    message: "No record found!",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured when fetching businesses for admin!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }

    },
    fetchVendors: async (req, res) => {
        try {
            var vendorsExist = await vendorModel.find().sort({ vendorName: 1 })
            if (vendorsExist.length > 0) {
                console.log("Vendors retrieved successfully..")
                return res.status(200).send({
                    success: true,
                    message: "Vendors retrieved successfully..",
                    data: vendorsExist
                })
            } else {
                console.log("No record found!")
                return res.status(403).send({
                    success: false,
                    message: "No record found!",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured when fetching vendors for admin!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }

    },
    fetchCategories: async (req, res) => {
        try {
            var categoriesExist = await categoryModel.find().sort({ categoryName: 1 })
            if (categoriesExist.length > 0) {
                console.log("Categories retrieved successfully..")
                return res.status(200).send({
                    success: true,
                    message: "Categories retrieved successfully..",
                    data: categoriesExist
                })
            } else {
                console.log("No record found!")
                return res.status(403).send({
                    success: false,
                    message: "No record found!",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured when fetching categories for admin!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }

    },
    fetchUnconfirmedBusinesses: async (req, res) => {
        const data = req.body
        try {
            var businessExist = await businessModel.find({ accountConfirmed: false }).sort({ timeStamp: 1 })
            if (businessExist.length > 0) {
                console.log(`Unconfirmed businesses retrieved successfully..`)
                return res.status(200).send({
                    success: true,
                    message: "Unconfirmed businesses retrieved successfully..",
                    data: businessExist
                })
            } else {
                console.log("No record found!")
                return res.status(403).send({
                    success: false,
                    message: "No record found!",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured when fetching unconfirmed businesses!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }

    },
    fetchUnpaidBusinesses: async (req, res) => {
        const data = req.body
        try {
            var businessExist = await businessModel.find({ accountConfirmed: true }).sort({ businessName: 1 })
            var subscriptionExist = await subscriptionModel.find({ monthPaidFor: data.monthPaidFor })
            var vendorExist = await vendorModel.find().sort({ vendorName: 1 })
            if (businessExist.length > 0) {
                console.log("not empty")
                if (subscriptionExist.length > 0) {
                    console.log("not empty2")
                    for (let index = 0; index < businessExist.length; index++) {
                        console.log("not empty3")
                        subscriptionExist.forEach((sub) => {
                            console.log("not empty4")
                            if (businessExist[index]["businessEmailAddress"] === sub["businessEmailAddress"]) {
                                console.log("not empty5")
                                // console.log(index)
                                businessExist.splice(index, 1);
                            }
                        })
                    }
                    // console.log(`existing = ${businessExist}`)
                    console.log(`Unpaid businesses retrieved successfully for ${data.monthPaidFor}`)
                    return res.status(200).send({
                        success: true,
                        message: "Unpaid businesses retrieved successfully..",
                        data1: businessExist,
                        data2: subscriptionExist,
                        data3: vendorExist
                    })
                } else {
                    console.log(`Unpaid businesses retrieved successfully for ${data.monthPaidFor}.. no subscription yet!`)
                    return res.status(200).send({
                        success: true,
                        message: "No subscription yet..",
                        data1: businessExist,
                        data2: subscriptionExist,
                        data3: vendorExist,
                    })
                }
            } else {
                console.log("No record found!")
                return res.status(403).send({
                    success: false,
                    message: "No record found!",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured when fetching pending subs!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }

    },
    fetchUnpaidBusinessesVendors: async (req, res) => {
        const data = req.body
        try {
            var vendorExist = await vendorModel.findOne({ vendorName: data.vendorName })
            if (vendorExist) {
                return res.status(200).send({
                    success: true,
                    message: "Unpaid business vendor retrieved successfully..",
                    data: vendorExist,
                })
            } else {
                console.log("No record found!")
                return res.status(403).send({
                    success: false,
                    message: "No record found!",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured when fetching unpaid business vendor!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    fetchTotalValidSubscriptions: async (req, res) => {
        const data = req.body;
        try {
            var validSubsExist = await subscriptionModel.find({ yearPaidFor: data.yearPaidFor }).sort({ timeStamp: -1 })
            if (validSubsExist.length > 0) {
                console.log("Valid transactions retrieved successfully..")
                return res.status(200).send({
                    success: true,
                    message: "Valid transactions retrieved successfully..",
                    data: validSubsExist
                })
            } else {
                console.log("No record found!")
                return res.status(403).send({
                    success: false,
                    message: "No record found!",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured while retrieving total valid subs!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    fetchTotalInvalidSubscriptions: async (req, res) => {
        const data = req.body;
        try {
            var invalidSubsExist = await failedSubscriptionModel.find({ yearPaidFor: data.yearPaidFor }).sort({ timeStamp: 1 })
            console.log(invalidSubsExist)
            if (invalidSubsExist.length > 0) {
                console.log("Invalid transactions retrieved successfully..")
                return res.status(200).send({
                    success: true,
                    message: "Invalid transactions retrieved successfully..",
                    data: invalidSubsExist
                })
            } else {
                console.log("No record found!")
                return res.status(403).send({
                    success: false,
                    message: "No record found!!",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured while retrieving total invalid subs!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    fetchTotalValidSubscriptionsVolume: async (req, res) => {
        const data = req.body;
        let totalVolume = 0
        try {
            var validSubsExist = await subscriptionModel.find({ yearPaidFor: data.yearPaidFor }).sort({ timeStamp: 1 })
            if (validSubsExist.length > 0) {
                validSubsExist.forEach((sub) => {
                    totalVolume += sub["csrFee"]
                })
                console.log("Valid transactions volume retrieved successfully..")
                return res.status(200).send({
                    success: true,
                    message: "Valid transactions volume retrieved successfully..",
                    data: totalVolume
                })
            } else {
                console.log("No record found!")
                return res.status(403).send({
                    success: false,
                    message: "No record found!",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured while retrieving total valid subs volume!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    fetchCategoryRevenue: async (req, res) => {
        const data = req.body
        let val = {
            "category": "",
            "months": {
                "jan": 0,
                "feb": 0,
                "mar": 0,
                "apr": 0,
                "may": 0,
                "jun": 0,
                "jul": 0,
                "aug": 0,
                "sep": 0,
                "oct": 0,
                "nov": 0,
                "dec": 0,
            }
        }
        let jan = 0
        let feb = 0
        let mar = 0
        let apr = 0
        let may = 0
        let jun = 0
        let jul = 0
        let aug = 0
        let sep = 0
        let oct = 0
        let nov = 0
        let dec = 0
        try {
            var subscriptionExist = await subscriptionModel.find()
            subscriptionExist.forEach((sub) => {
                if ((sub["yearPaidFor"] == data.year) && (sub["monthPaidFor"].split(",")[0] == "jan") && sub["businessCategory"] == data.category) {
                    jan += sub["csrFee"]
                    val = {
                        "category": sub["businessCategory"],
                        "months": {
                            ...val["months"],
                            "jan": jan
                        }
                    }
                } else if ((sub["yearPaidFor"] == data.year) && (sub["monthPaidFor"].split(",")[0] == "feb") && sub["businessCategory"] == data.category) {
                    feb += sub["csrFee"];
                    val = {
                        "category": sub["businessCategory"],
                        "months": {
                            ...val["months"],
                            "feb": feb
                        }
                    }
                } else if ((sub["yearPaidFor"] == data.year) && (sub["monthPaidFor"].split(",")[0] == "mar") && sub["businessCategory"] == data.category) {
                    mar += sub["csrFee"];
                    val = {
                        "category": sub["businessCategory"],
                        "months": {
                            ...val["months"],
                            "mar": mar
                        }
                    }
                } else if ((sub["yearPaidFor"] == data.year) && (sub["monthPaidFor"].split(",")[0] == "apr") && sub["businessCategory"] == data.category) {
                    apr += sub["csrFee"];
                    val = {
                        "category": sub["businessCategory"],
                        "months": {
                            ...val["months"],
                            "apr": apr
                        }
                    }
                } else if ((sub["yearPaidFor"] == data.year) && (sub["monthPaidFor"].split(",")[0] == "may") && sub["businessCategory"] == data.category) {
                    may += sub["csrFee"];
                    val = {
                        "category": sub["businessCategory"],
                        "months": {
                            ...val["months"],
                            "may": may
                        }
                    }
                } else if ((sub["yearPaidFor"] == data.year) && (sub["monthPaidFor"].split(",")[0] == "jun") && sub["businessCategory"] == data.category) {
                    jun += sub["csrFee"];
                    val = {
                        "category": sub["businessCategory"],
                        "months": {
                            ...val["months"],
                            "jun": jun / 2
                        }
                    }
                } else if ((sub["yearPaidFor"] == data.year) && (sub["monthPaidFor"].split(",")[0] == "jul") && sub["businessCategory"] == data.category) {
                    jul += sub["csrFee"];
                    val = {
                        "category": sub["businessCategory"],
                        "months": {
                            ...val["months"],
                            "jul": jul
                        }
                    }
                } else if ((sub["yearPaidFor"] == data.year) && (sub["monthPaidFor"].split(",")[0] == "aug") && sub["businessCategory"] == data.category) {
                    aug += sub["csrFee"];
                    val = {
                        "category": sub["businessCategory"],
                        "months": {
                            ...val["months"],
                            "aug": aug
                        }
                    }
                } else if ((sub["yearPaidFor"] == data.year) && (sub["monthPaidFor"].split(",")[0] == "sep") && sub["businessCategory"] == data.category) {
                    sep += sub["csrFee"];
                    val = {
                        "category": sub["businessCategory"],
                        "months": {
                            ...val["months"],
                            "sep": sep
                        }
                    }
                } else if ((sub["yearPaidFor"] == data.year) && (sub["monthPaidFor"].split(",")[0] == "oct") && sub["businessCategory"] == data.category) {
                    oct += sub["csrFee"];
                    val = {
                        "category": sub["businessCategory"],
                        "months": {
                            ...val["months"],
                            "oct": oct
                        }
                    }
                } else if ((sub["yearPaidFor"] == data.year) && (sub["monthPaidFor"].split(",")[0] == "nov") && sub["businessCategory"] == data.category) {
                    nov += sub["csrFee"];
                    val = {
                        "category": sub["businessCategory"],
                        "months": {
                            ...val["months"],
                            "nov": nov
                        }
                    }
                } else if ((sub["yearPaidFor"] == data.year) && (sub["monthPaidFor"].split(",")[0] == "dec") && sub["businessCategory"] == data.category) {
                    dec += sub["csrFee"]
                    val = {
                        "category": sub["businessCategory"],
                        "months": {
                            ...val["months"],
                            "dec": dec
                        }
                    }
                }
            })
            console.log(`Total category (${data.category}) revenue retrieved successfully..`)
            return res.status(200).json({
                success: true,
                message: "Total category revenue retrieved successfully..",
                data: val,
            })

        } catch (error) {
            console.log("Error occured while retrieving revenue by category!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    fetchExpectedCategoryRevenue: async (req, res) => {
        const data = req.body
        let totalRev = {
            "categories": [],
        }
        let expectedRev = {
            "categories": [],
        }
        let countDuplicate = {}
        try {
            var subscriptionExist = await subscriptionModel.find()
            var businessExist = await businessModel.find()
            var vendorExist = await vendorModel.find()
            subscriptionExist.forEach((sub) => {
                totalRev["categories"].push({ 'cat': sub['businessCategory'], 'total': 0 })
            })
            subscriptionExist.forEach((sub) => {
                totalRev["categories"].forEach((cat) => {
                    if ((sub["yearPaidFor"] == data.year) && (sub["businessCategory"] == cat["cat"]) && sub["monthPaidFor"].split(",")[0] == data.month) {
                        cat["total"] = cat["total"] += sub["csrFee"]
                    }
                })
            })
            function uniqByKeepLast1(data, key) {
                return [
                    ...new Map(
                        data.map(x => [key(x), x])
                    ).values()
                ]
            }
            totalRev["categories"] = (uniqByKeepLast1(totalRev["categories"], it => it.cat));
            // console.log(totalRev)
            businessExist.forEach((bus) => {
                expectedRev["categories"].push({ 'cat': bus['vendor'].split("(")[1].split(")")[0], 'vend': bus["vendor"], 'totalExpected': 0 })
            })
            expectedRev["categories"].forEach(element => {
                countDuplicate[element["cat"]] = (countDuplicate[element["cat"]] || 0) + 1;
            });
            vendorExist.forEach((ven) => {
                expectedRev["categories"].forEach((cat) => {
                    if (ven["vendorName"] == cat.vend) {
                        cat["totalExpected"] += ven["fee"]
                    }
                })
            })
            function uniqByKeepLast2(data, key) {
                return [
                    ...new Map(
                        data.map(x => [key(x), x])
                    ).values()
                ]
            }
            expectedRev["categories"] = (uniqByKeepLast2(expectedRev["categories"], it => it.vend));
            expectedRev["categories"].forEach((cat) => {
                if (countDuplicate[cat.cat] > 1) {
                    cat["totalExpected"] = cat["totalExpected"] * 2
                }
            })
            // console.log(expectedRev)
            console.log(`Total expected category revenue retrieved successfully..`)
            return res.status(200).json({
                success: true,
                message: "Total expected category revenue retrieved successfully..",
                data1: totalRev,
                data2: expectedRev,
            })

        } catch (error) {
            console.log("Error occured while retrieving expected revenue by category!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    fetchTotalExpectedMonthlyRevenue: async (req, res) => {
        const data = req.body
        let expectedFee = 0
        try {
            var vendorExist = await vendorModel.findOne({ vendorName: data.vendorName })
            var businessExist = await businessModel.find({ vendor: data.vendorName }).sort({ businessName: 1 })
            if (vendorExist) {
                if (businessExist.length > 0) {
                    expectedFee = vendorExist["fee"] * businessExist.length
                    console.log(`Total expected monthly vendor (${data.vendorName}) revenue calculated successfully..`)
                    return res.status(200).json({
                        success: true,
                        message: `Total expected monthly vendor (${data.vendorName}) revenue calculated successfully..`,
                        data: expectedFee,
                    })
                } else {
                    expectedFee = 0
                    console.log(`Total expected monthly vendor (${data.vendorName}) revenue calculated successfully.. no business for vendor yet!`)
                    return res.status(200).json({
                        success: true,
                        message: `Total expected monthly vendor (${data.vendorName}) revenue calculated successfully.. no business for vendor yet!`,
                        data: expectedFee,
                    })
                }
            } else {
                expectedFee = 0
                console.log(`Vendor (${data.vendorName}) does not exist!`)
                return res.status(403).json({
                    success: false,
                    message: `Vendor (${data.vendorName}) does not exist!`,
                    data: expectedFee,
                })
            }
        } catch (error) {
            console.log("Error occured while retrieving businesses in a particular vendor!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },

    // User(posting)
    fileUploader2: async (req, res) => {
        const data = req.body
        let imageDir = null
        const ipAddress = req.socket.remoteAddress;
        try {
            var businessExist = await businessModel.findOne({ businessEmailAddress: data.businessEmailAddress })
            try {
                await cloudinary.uploader.destroy(businessExist["ownerId"]["id"])
            } catch (e) {
                console.log(`There was no profile image initially: ${e}`)
            }
            fileUploader(req, res, (error) => {
                const data = req.body
                if (data.fileType == "ownerId") {
                    imageDir = "OmokuPreneur/business_owner_id"
                }
                if (error) {
                    var newLog = logModel({
                        logType: "user",
                        success: false,
                        emailAddress: data.businessEmailAddress,
                        ipAddress: ipAddress,
                        description: "File upload error.",

                    })
                    newLog.save()
                    console.log("Error occured while uploading a file!: " + error)
                    return res.status(403).json({
                        success: false,
                        message: "Error occured while uploading a file!"
                    })
                } else {
                    (async () => {
                        const result = await cloudinary.uploader.upload(req.file.path, { folder: imageDir })
                        await businessModel.findOneAndUpdate(
                            { businessEmailAddress: data.businessEmailAddress },
                            {
                                ownerId: {
                                    url: result.secure_url,
                                    id: result.public_id,
                                }
                            },
                            { new: true, runValidators: true }
                        )
                        var newLog = logModel({
                            logType: "user",
                            success: true,
                            emailAddress: data.businessEmailAddress,
                            ipAddress: ipAddress,
                            description: "File uploaded.",

                        })
                        newLog.save()
                        console.log(req.file.filename)
                        console.log(req.file.path)
                        return res.status(200).json({
                            success: true,
                            message: "File uploaded successfully..",
                        })
                    })()
                }
            })
        } catch (error) {
            console.log("Error occured during ownerId upload!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    fileUploader3: async (req, res) => {
        const data = req.body
        let imageDir = null
        const ipAddress = req.socket.remoteAddress;
        if (data.fileType == "ownerId") {
            imageDir = "OmokuPreneur/business_owner_id"
        } else if (data.fileType == "cacDoc") {
            imageDir = "OmokuPreneur/business_cac"
        }
        try {
            var businessExist = await businessModel.findOne({ businessEmailAddress: data.businessEmailAddress })
            try {
                await cloudinary.uploader.destroy(businessExist["ownerId"]["id"])
            } catch (e) {
                console.log(`There was no profile image initially: ${e}`)
            }
            // const result = await cloudinary.uploader.upload(data.path, {folder: imageDir})
            const fileBuffer = Buffer.from(data.content);

            // Upload the file buffer to Cloudinary
            await cloudinary.uploader.upload_stream({ folder: imageDir }, async (error, result) => {
                if (error) {
                    console.error('Error uploading file:', error);
                } else {
                    console.log(result.secure_url)
                    console.log(result.public_id)
                    await businessModel.findOneAndUpdate(
                        { businessEmailAddress: data.businessEmailAddress },
                        {
                            ownerId: {
                                url: result.secure_url,
                                id: result.public_id,
                            }
                        },
                        { new: true, runValidators: true }
                    )
                    var newLog = logModel({
                        logType: "user",
                        success: true,
                        emailAddress: data.businessEmailAddress,
                        ipAddress: ipAddress,
                        description: "File uploaded.",

                    })
                    newLog.save()
                    console.log("File uploaded successfully...");
                    return res.status(200).json({
                        success: true,
                        message: "File uploaded successfully..",
                    })
                }
            }).end(fileBuffer);
        } catch (error) {
            console.log("Error occured during ownerId upload!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    fetchPK: async (req, res) => {
        return res.status(200).send({
            success: true,
            message: "PK retrieved..",
            data: process.env.PAYSTACK_PK,
        })
    },
    sendUserOtp: async (req, res) => {
        const data = req.body
        const ipAddress = req.socket.remoteAddress;
        try {
            if (data.query == "registration") {
                var businessExist = await businessModel.find({ businessEmailAddress: data.businessEmailAddress })
                if (businessExist.length > 0) {
                    var newLog = logModel({
                        logType: "user",
                        success: false,
                        emailAddress: data.businessEmailAddress,
                        ipAddress: ipAddress,
                        description: `OTP registration generation failure. (business account already exist!)`,

                    })
                    newLog.save()
                    console.log("Business account already exist!")
                    return res.status(403).send({
                        success: false,
                        message: "Business account already exist!",
                        data: []
                    })
                } else {
                    var smsData = {
                        "api_key": process.env.TERMII_KEY,
                        "message_type": "NUMERIC",
                        "to": `234${data.businessPhoneNumber}`,
                        "from": process.env.TERMII_ID,
                        "channel": "dnd",
                        "pin_attempts": 1,
                        "pin_time_to_live": 10,
                        "pin_length": 6,
                        "pin_placeholder": `< 1234 >`,
                        "message_text": `Your OmokuPreneur code is: < 1234 >. Valid for 10 minutes, one-time use only.`,
                        "pin_type": "NUMERIC"
                    };
                    var options = {
                        'method': 'POST',
                        'url': 'https://api.ng.termii.com/api/sms/otp/send',
                        'headers': {
                            'Content-Type': ['application/json', 'application/json']
                        },
                        body: JSON.stringify(smsData)

                    }
                    request(options, function (error, response) {
                        if (error) {
                            var newLog = logModel({
                                logType: "user",
                                success: false,
                                emailAddress: data.businessEmailAddress,
                                ipAddress: ipAddress,
                                description: `Registration OTP generation failure. (otp not generated)`,

                            })
                            newLog.save()
                            console.log("Error occured during otp generation!: " + error)
                            return res.status(403).json({
                                success: false,
                                message: "Unable to generate otp! Please contact us at support@omokupreneurs.ng",
                            })
                        } else {
                            var newLog = logModel({
                                logType: "user",
                                success: true,
                                emailAddress: data.businessEmailAddress,
                                ipAddress: ipAddress,
                                description: `Registration OTP generation success.`,

                            })
                            newLog.save()
                            console.log("Otp sent! Please check your sms inbox..")
                            return res.status(200).json({
                                success: true,
                                message: "Otp sent! Please check your sms inbox..",
                                pinId: response["body"].split(",")[0].split(":")[1].split('"')[1],
                                paystackPK: process.env.PAYSTACK_PK,
                            })
                        }
                    })
                }
            } else {
                var businessExist = await businessModel.find({ businessEmailAddress: data.businessEmailAddress })
                if (businessExist.length == 0) {
                    var newLog = logModel({
                        logType: "user",
                        success: false,
                        emailAddress: data.businessEmailAddress,
                        ipAddress: ipAddress,
                        description: `OTP payment generation failure. (invalid business account)`,

                    })
                    newLog.save()
                    console.log("Invalid business account!")
                    return res.status(403).send({
                        success: false,
                        message: "Invalid business account!",
                        data: []
                    })
                } else {
                    // var eg = "{\"pinId\":\"177c8f0f-4401-487b-8cfa-30ba8812efd0\",\"to\":\"2349032688974\",\"smsStatus\":\"Message Sent\",\"status\":200}"
                    // console.log(eg.split(",")[0].split(":")[1].split('"')[1])
                    var smsData = {
                        "api_key": process.env.TERMII_KEY,
                        "message_type": "NUMERIC",
                        "to": `234${data.businessPhoneNumber}`,
                        "from": process.env.TERMII_ID,
                        "channel": "dnd",
                        "pin_attempts": 1,
                        "pin_time_to_live": 10,
                        "pin_length": 6,
                        "pin_placeholder": `< 1234 >`,
                        "message_text": `Your OmokuPreneur code is: < 1234 >. Valid for 10 minutes, one-time use only.`,
                        "pin_type": "NUMERIC"
                    };
                    var options = {
                        'method': 'POST',
                        'url': 'https://api.ng.termii.com/api/sms/otp/send',
                        'headers': {
                            'Content-Type': ['application/json', 'application/json']
                        },
                        body: JSON.stringify(smsData)

                    }
                    request(options, function (error, response) {
                        if (error) {
                            var newLog = logModel({
                                logType: "user",
                                success: false,
                                emailAddress: data.businessEmailAddress,
                                ipAddress: ipAddress,
                                description: `Payment OTP generation failure. (otp not generated)`,

                            })
                            newLog.save()
                            console.log("Error occured during otp generation!: " + error)
                            return res.status(403).json({
                                success: false,
                                message: "Unable to generate otp! Please contact us at support@omokupreneurs.ng",
                            })
                        } else {
                            var newLog = logModel({
                                logType: "user",
                                success: true,
                                emailAddress: data.businessEmailAddress,
                                ipAddress: ipAddress,
                                description: `Payment OTP generation success.`,

                            })
                            newLog.save()
                            console.log("Otp sent! Please check your sms inbox..")
                            return res.status(200).json({
                                success: true,
                                message: "Otp sent! Please check your sms inbox..",
                                pinId: response["body"].split(",")[0].split(":")[1].split('"')[1],
                                paystackPK: process.env.PAYSTACK_PK,
                            })
                        }
                    })
                }
            }
        } catch (error) {
            console.log("Error occured during otp generation!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    verifyUserOtp: async (req, res) => {
        const data = req.body;
        const ipAddress = req.socket.remoteAddress;

        try {
            if (data.query == "registration") {
                var smsVerifyData = {
                    "api_key": process.env.TERMII_KEY,
                    "pin_id": data.pinId,
                    "pin": data.otp,
                };
                var options = {
                    'method': 'POST',
                    'url': 'https://api.ng.termii.com/api/sms/otp/verify',
                    'headers': {
                        'Content-Type': ['application/json', 'application/json']
                    },
                    body: JSON.stringify(smsVerifyData)

                };
                request(options, function (error, response) {
                    if (error) {
                        var newLog = logModel({
                            logType: "user",
                            success: false,
                            emailAddress: data.businessEmailAddress,
                            ipAddress: ipAddress,
                            description: `OTP verification failure. (invalid otp)`,

                        })
                        newLog.save()
                        console.log("Error occured during otp verification!: " + error)
                        return res.status(403).json({
                            success: false,
                            message: "Unable to verify otp! Please contact us at support@omokupreneurs.ng",
                        })
                    } else {
                        var newLog = logModel({
                            logType: "user",
                            success: true,
                            emailAddress: data.businessEmailAddress,
                            ipAddress: ipAddress,
                            description: `OTP verification success.`,

                        })
                        newLog.save()
                        console.log("Otp verified successfully..")
                        return res.status(200).json({
                            success: true,
                            message: "Otp verified successfully..",
                            data: response,
                        })
                    }
                })
            } else {
                var businessExist = await businessModel.findOne({ businessEmailAddress: data.businessEmailAddress })
                if (!businessExist) {
                    var newLog = logModel({
                        logType: "user",
                        success: false,
                        emailAddress: data.businessEmailAddress,
                        ipAddress: ipAddress,
                        description: `OTP verification failure. (invalid business account)`,

                    })
                    newLog.save()
                    console.log("Invalid business account!")
                    return res.status(403).send({
                        success: false,
                        message: "Invalid business account!",
                        data: []
                    })
                } else {
                    var smsVerifyData = {
                        "api_key": process.env.TERMII_KEY,
                        "pin_id": data.pinId,
                        "pin": data.otp,
                    };
                    var options = {
                        'method': 'POST',
                        'url': 'https://api.ng.termii.com/api/sms/otp/verify',
                        'headers': {
                            'Content-Type': ['application/json', 'application/json']
                        },
                        body: JSON.stringify(smsVerifyData)

                    };
                    request(options, function (error, response) {
                        if (error) {
                            var newLog = logModel({
                                logType: "user",
                                success: false,
                                emailAddress: data.businessEmailAddress,
                                ipAddress: ipAddress,
                                description: `OTP verification failure. (invalid otp)`,

                            })
                            newLog.save()
                            console.log("Error occured during otp verification!: " + error)
                            return res.status(403).json({
                                success: false,
                                message: "Unable to verify otp! Please contact us at support@omokupreneurs.ng",
                            })
                        } else {
                            var newLog = logModel({
                                logType: "user",
                                success: true,
                                emailAddress: data.businessEmailAddress,
                                ipAddress: ipAddress,
                                description: `OTP verification success.`,

                            })
                            newLog.save()
                            console.log("Otp verified successfully..")
                            return res.status(200).json({
                                success: true,
                                message: "Otp verified successfully..",
                                data: response,
                            })
                        }
                    })
                }
            }
        }
        catch (error) {
            console.log("Error occured during otp verification!: " + error)
            return res.status(403).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    register: async (req, res) => {
        const data = req.body
        const ipAddress = req.socket.remoteAddress;
        function getRandomInt(max) {
            return Math.floor(Math.random() * max);
        }
        var tempId = getRandomInt(9999)
        try {
            const idExist = await businessModel.find({ id: tempId })
            if (idExist.length > 0) {
                console.log("Duplicate id!")
                return res.status(403).json({
                    success: false,
                    message: "Operation failed! Please try again.",
                })
            } else {
                const businessExist = await businessModel.find({ businessEmailAddress: data.businessEmailAddress })
                if (businessExist.length > 0) {
                    var newLog = logModel({
                        logType: "user",
                        success: false,
                        emailAddress: data.businessEmailAddress,
                        ipAddress: ipAddress,
                        description: `Registration failure. (business exist)`,

                    })
                    newLog.save()
                    console.log("Business already exist via business email!")
                    return res.status(403).json({
                        success: false,
                        message: "Business already exist via business email!"
                    })
                } else {
                    var newBusiness = businessModel({
                        id: tempId,
                        accountConfirmed: false,
                        accountSuspended: false,
                        category: data.category,
                        // vendor: `${data.vendor}(${data.category})`,
                        vendor: `${data.vendor}`,
                        businessName: data.businessName,
                        businessAddress: data.businessAddress,
                        businessBranches: data.businessBranches,
                        businessType: {
                            businessRegistered: data.businessRegistered,
                            type: data.type,
                            businessRegistrationNumber: data.businessRegistrationNumber,
                        },
                        businessNafdacNumber: data.businessNafdacNumber,
                        businessEmailAddress: data.businessEmailAddress,
                        businessPhoneNumber: data.businessPhoneNumber,
                        businessHandles: {
                            linkedin: data.linkedin,
                            facebook: data.facebook,
                            instagram: data.instagram,
                            x: data.x,
                        },
                        ownerFirstName: data.ownerFirstName,
                        ownerLastName: data.ownerLastName,
                        ownerGender: data.ownerGender,
                        ownerNationality: data.ownerNationality,
                        ownerState: data.ownerState,
                        ownerLGA: data.ownerLGA,
                        ownerCommunity: data.ownerCommunity,
                        ownerEmailAddress: data.ownerEmailAddress,
                        ownerPhoneNumber: data.ownerPhoneNumber,
                        ownerId: {
                            id: "",
                            url: "",
                        },

                    })
                    var newLog = logModel({
                        logType: "user",
                        success: true,
                        emailAddress: data.businessEmailAddress,
                        ipAddress: ipAddress,
                        description: `Registration success (awaiting admin confirmation).`,

                    })
                    newBusiness.save()
                    newLog.save()
                    const transporter = nodemailer.createTransport({
                        service: "gmail",
                        host: "smtp.gmail.com",
                        port: 587,
                        secure: true,
                        html: false, // remove if error
                        auth: {
                            user: process.env.G_ACCOUNT,
                            pass: process.env.G_PASS,
                        },
                    });
                    transporter.verify().then(console.log).catch(console.error);
                    await transporter.sendMail({
                        from: '"OMOKUPRENEURS" <jgotpgenerator@gmail.com>', // sender address
                        to: ["jogenics@gmail.com", "admin@omokupreneurs.ng", "info@omokupreneurs.ng"], // list of receivers separated by a comma
                        subject: "BUSINESS REGISTRATION", // Subject line
                        text: `Hello Admin, \n\nWe are glad to inform you that a business registration has just occurred and awaiting your verification. Here are the deatils: \nBusiness Name: ${data.businessName} \nBusiness Address ${data.businessAddress} \nBusiness Email: ${data.businessEmailAddress} \nBusiness Phone: ${data.businessPhoneNumber} \nOwner Name: ${data.ownerFirstName} ${data.ownerLastName} \n\nFor more information, please signin at https://omokupreneurs.ng/001/login to verify.`, // plain text body
                        html: htmlTemplate(`Hello Admin, \n\nWe are glad to inform you that a business registration has just occurred and awaiting your verification. Here are the deatils: <b>\nBusiness Name: ${data.businessName}; \nBusiness Address: ${data.businessAddress}; \nBusiness Email: ${data.businessEmailAddress}; \nBusiness Phone: ${data.businessPhoneNumber}; \n\nOwner Name: ${data.ownerFirstName} ${data.ownerLastName};</b> \n\nFor more information, please signin (visit us) to verify.`, `https://omokupreneurs.ng/001/`), // html body
                    }).then(info => {
                        // console.log({info});
                    }).catch(console.error);
                    console.log("Registration successful..")
                    return res.status(200).json({
                        success: true,
                        message: "Registration successful.. Awaiting admin confirmation.",
                    })
                }
            }
        } catch (error) {
            console.log("Error occured during registration!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    pay: async (req, res) => {
        const data = req.body
        const ipAddress = req.socket.remoteAddress;
        function getRandomInt(max) {
            return Math.floor(Math.random() * max);
        }
        var tempId = getRandomInt(99999)
        try {
            const idExist = await subscriptionModel.find({ id: tempId })
            if (idExist.length > 0) {
                console.log("Duplicate id!")
                return res.status(403).json({
                    success: false,
                    message: "Operation failed! Please try again.",
                })
            } else {
                if (data.paymentType == "automated") {
                    var newPayment = subscriptionModel({
                        id: tempId,
                        status: true,
                        businessCategory: data.businessCategory,
                        businessEmailAddress: data.businessEmailAddress,
                        businessName: data.businessName,
                        csrFee: data.csrFee,
                        monthPaidFor: data.monthPaidFor,
                        yearPaidFor: data.yearPaidFor,
                        receiptNumber: data.receiptNumber,

                    })
                    var newLog = logModel({
                        logType: "user",
                        success: true,
                        emailAddress: data.businessEmailAddress,
                        ipAddress: ipAddress,
                        description: `Payment success.`,

                    })
                    newPayment.save()
                    newLog.save()
                    const transporter = nodemailer.createTransport({
                        service: "gmail",
                        host: "smtp.gmail.com",
                        port: 587,
                        secure: true,
                        html: false, // remove if error
                        auth: {
                            user: process.env.G_ACCOUNT,
                            pass: process.env.G_PASS,
                        },
                    });
                    transporter.verify().then(console.log).catch(console.error);
                    await transporter.sendMail({
                        from: '"OMOKUPRENEURS" <jgotpgenerator@gmail.com>', // sender address
                        to: ["jogenics@gmail.com", "admin@omokupreneurs.ng", "info@omokupreneurs.ng"], // list of receivers separated by a comma
                        subject: "BUSINESS MONTHLY CSR PAYMENT", // Subject line
                        text: `Hello Admin, \n\nWe are glad to inform you that a business CSR payment has just occurred for the month of ${data.monthPaidFor}. Here are the deatils: \nBusiness Name: ${data.businessName}, \nBusiness Email: ${data.businessEmailAddress}, \n\nFor more information, please signin at https://omokupreneurs.ng/001/ or visit us.`, // plain text body
                        html: htmlTemplate(`Hello Admin, \n\nWe are glad to inform you that a business CSR payment has just occurred for the month of ${data.monthPaidFor}. Here are the deatils: \nBusiness Name: ${data.businessName}; \nBusiness Email: ${data.businessEmailAddress}; \n\nFor more information, please signin at https://omokupreneurs.ng/001/ or visit us.`, `https://omokupreneurs.ng/001/`), // html body
                    }).then(info => {
                        // console.log({info});
                    }).catch(console.error);
                    console.log("Payment successful..")
                    return res.status(200).json({
                        success: true,
                        message: "Payment successful.. Thank you!",
                    })
                } else {
                    var newPayment = subscriptionModel({
                        id: tempId,
                        status: true,
                        businessCategory: data.businessCategory,
                        businessEmailAddress: data.businessEmailAddress,
                        businessName: data.businessName,
                        csrFee: data.csrFee,
                        monthPaidFor: data.monthPaidFor,
                        yearPaidFor: data.yearPaidFor,
                        receiptNumber: data.receiptNumber,

                    })
                    var newLog = logModel({
                        logType: "admin",
                        success: true,
                        emailAddress: data.emailAddress,
                        ipAddress: ipAddress,
                        description: `Manual business payment success.`,

                    })
                    newPayment.save()
                    newLog.save()
                    const transporter = nodemailer.createTransport({
                        service: "gmail",
                        host: "smtp.gmail.com",
                        port: 587,
                        secure: true,
                        html: false, // remove if error
                        auth: {
                            user: process.env.G_ACCOUNT,
                            pass: process.env.G_PASS,
                        },
                    });
                    transporter.verify().then(console.log).catch(console.error);
                    await transporter.sendMail({
                        from: '"OMOKUPRENEURS" <jgotpgenerator@gmail.com>', // sender address
                        to: ["jogenics@gmail.com", "admin@omokupreneurs.ng", "info@omokupreneurs.ng"], // list of receivers separated by a comma
                        subject: "MANUAL BUSINESS MONTHLY CSR PAYMENT", // Subject line
                        text: `Hello Admin, \n\nWe are glad to inform you that an admin (${data.emailAddress}) just manually made a CSR payment for a business vendor for the month of ${data.monthPaidFor}. Here are the deatils: \nBusiness Name: ${data.businessName}, \nBusiness Email: ${data.businessEmailAddress}, \n\nFor more information, please signin at https://omokupreneurs.ng/001/ or visit us.`, // plain text body
                        html: htmlTemplate(`Hello Admin, \n\nWe are glad to inform you that an admin (${data.emailAddress}) just manually made a CSR payment for a business vendor for the month of ${data.monthPaidFor}. Here are the deatils: \nBusiness Name: ${data.businessName}; \nBusiness Email: ${data.businessEmailAddress}; \n\nFor more information, please signin at https://omokupreneurs.ng/001/ or visit us.`, `https://omokupreneurs.ng/001/`), // html body
                    }).then(info => {
                        // console.log({info});
                    }).catch(console.error);
                    console.log("Manual business payment successful..")
                    return res.status(200).json({
                        success: true,
                        message: "Manual business payment successful.. Thank you!",
                    })
                }
            }
        } catch (error) {
            console.log("Error occured during Manual payment!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
    failedPay: async (req, res) => {
        const data = req.body
        const ipAddress = req.socket.remoteAddress;
        function getRandomInt(max) {
            return Math.floor(Math.random() * max);
        }
        var tempId = getRandomInt(99999)
        try {
            const idExist = await failedSubscriptionModel.find({ id: tempId })
            if (idExist.length > 0) {
                console.log("Duplicate id!")
                return res.status(403).json({
                    success: false,
                    message: "Operation failed! Please try again.",
                })
            } else {
                var newFailedPayment = failedSubscriptionModel({
                    id: tempId,
                    status: false,
                    businessCategory: data.businessCategory,
                    businessEmailAddress: data.businessEmailAddress,
                    businessName: data.businessName,
                    csrFee: data.csrFee,
                    monthPaidFor: data.monthPaidFor,
                    yearPaidFor: data.yearPaidFor,
                    receiptNumber: data.receiptNumber,

                })
                var newLog = logModel({
                    logType: "user",
                    success: true,
                    emailAddress: data.businessEmailAddress,
                    ipAddress: ipAddress,
                    description: `Payment failed/canceled.`,

                })
                newFailedPayment.save()
                newLog.save()
                console.log("Payment failed!")
                return res.status(200).json({
                    success: true,
                    message: "Payment failed!",
                })
            }
        } catch (error) {
            console.log("Error occured dwhile registering failed payment!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },

    // User (retrieving)
    fetchCategories_: async (req, res) => {
        try {
            var categoriesExist = await categoryModel.find().sort({ categoryName: 1 })
            if (categoriesExist.length > 0) {
                console.log("Categories retrieved successfully..")
                return res.status(200).send({
                    success: true,
                    message: "Categories retrieved successfully..",
                    data: categoriesExist
                })
            } else {
                console.log("No record found!")
                return res.status(403).send({
                    success: false,
                    message: "No record found!",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured when fetching categories for user!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }

    },
    fetchVendors_: async (req, res) => {
        const data = req.body
        try {
            var vendorsExist = await vendorModel.find({ categoryName: data.categoryName }).sort({ vendorName: 1 })
            if (vendorsExist.length > 0) {
                console.log("Vendors retrieved successfully..")
                return res.status(200).send({
                    success: true,
                    message: "Vendors retrieved successfully..",
                    data: vendorsExist
                })
            } else {
                console.log("No record found!")
                return res.status(403).send({
                    success: false,
                    message: "No record found!",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured when fetching vendors for user!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }

    },
    fetchUnpaidBusinesses_: async (req, res) => {
        const data = req.body
        try {
            var businessExist = await businessModel.find({ vendor: data.vendorName }).sort({ businessName: 1 })
            var subscriptionExist = await subscriptionModel.find({ monthPaidFor: data.monthPaidFor })
            if (businessExist.length > 0) {
                console.log("not empty - businesses exist")
                if (subscriptionExist.length > 0) {
                    console.log(`not empty2 - subs exist for ${data.monthPaidFor}`)
                    for (let index = 0; index < businessExist.length; index++) {
                        // businessExist.forEach((business) => {
                        console.log("not empty3 - looping through businesses")
                        subscriptionExist.forEach((sub) => {
                            console.log("not empty4 - looping through subs")
                            if (businessExist[index]["businessEmailAddress"] === sub["businessEmailAddress"]) {
                                console.log("not empty5 - removing subscribed businesses from list")
                                // console.log(`-------== ${business}`)
                                // index = businessExist.indexOf(business)
                                // console.log(index)
                                businessExist.splice(index, 1);
                            }
                        })
                    }
                    // console.log(`unpaidB = ${businessExist}`)
                    console.log(`Unpaid businesses retrieved successfully for ${data.monthPaidFor}`)
                    return res.status(200).send({
                        success: true,
                        message: "Unpaid businesses retrieved successfully..",
                        data1: businessExist,
                        data2: subscriptionExist,
                    })
                } else {
                    console.log(`Unpaid businesses retrieved successfully for ${data.monthPaidFor}. no subscription yet!`)
                    return res.status(200).send({
                        success: true,
                        message: "No subscription yet..",
                        data1: businessExist,
                        data2: subscriptionExist,
                    })

                }
            } else {
                console.log("No record found!")
                return res.status(403).send({
                    success: false,
                    message: "No record found!",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured when fetching unpaid businesses!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }

    },
    fetchUnpaidBusinessesVendors_: async (req, res) => {
        const data = req.body
        try {
            var vendorExist = await vendorModel.findOne({ vendorName: data.vendorName })
            if (vendorExist) {
                return res.status(200).send({
                    success: true,
                    message: "Unpaid business vendor retrieved successfully..",
                    data: vendorExist,
                })
            } else {
                console.log("No record found!")
                return res.status(403).send({
                    success: false,
                    message: "No record found!",
                    data: []
                })
            }
        } catch (error) {
            console.log("Error occured when fetching unpaid business vendor!: " + error)
            return res.status(408).json({
                success: false,
                message: "An unexpected error occurred! Please try again later..",
            })
        }
    },
}

module.exports = functions