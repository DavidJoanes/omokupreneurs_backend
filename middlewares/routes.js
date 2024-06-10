const express = require("express")
const actions = require("../methods/actions")
const router = express.Router()


router.get("/", (req, res) => {
    const ipAddress = req.socket.remoteAddress;
    res.send(`Welcome to Omokuprenuers! ${ipAddress}`)
})


// USER APIS
//fetch pk
router.post("/api/csr/v1/fetch-pk", actions.fetchPK)
//send otp
router.post("/api/csr/v1/send-otp", actions.sendUserOtp)
//verify otp
router.post("/api/csr/v1/verify-otp", actions.verifyUserOtp)
//file upload
router.post("/api/csr/v1/upload-file", actions.fileUploader3)
//register
router.post("/api/csr/v1/register", actions.register)
//pay
router.post("/api/csr/v1/pay", actions.pay)
//failed payment
router.post("/api/csr/v1/failed-pay", actions.failedPay)
//fetch categories
router.post("/api/csr/v1/fetch-categories", actions.fetchCategories_)
//fetch vendors
router.post("/api/csr/v1/fetch-vendors", actions.fetchVendors_)
//fetch unpaid businesses
router.post("/api/csr/v1/fetch-unpaid", actions.fetchUnpaidBusinesses_)
//fetch unpaid businesses vendor
router.post("/api/csr/v1/fetch-unpaid2", actions.fetchUnpaidBusinessesVendors_)


// ADMIN APIS
//sign up
router.post("/api/csr/v2/admin-signup", actions.adminSignup)
//verify email
router.post("/api/csr/v2/admin-email-verification", actions.verifyAdminEmail)
//password reset
router.post("/api/csr/v2/admin-reset-password", actions.adminResetPassword)
//send otp
router.post("/api/csr/v2/fetch-otp", actions.validateAdminEmailAndSendOtp)
//signin
router.post("/api/csr/v2/admin-signin", actions.adminSignin)
//signout
router.post("/api/csr/v2/admin-signout", actions.adminSignout)
//verify token
router.post("/api/csr/v2/verify-token", actions.verifyToken)
//add category
router.post("/api/csr/v2/add-category", actions.addCategory)
//rename category
router.post("/api/csr/v2/rename-category", actions.renameCategory)
//add vendor
router.post("/api/csr/v2/add-vendor", actions.addVendor)
//modify vendor fee
router.post("/api/csr/v2/modify-vendor-fee", actions.modifyVendorFee)
//confirm business
router.post("/api/csr/v2/confirm-business", actions.confirmBusiness)
//unconfirm business
router.post("/api/csr/v2/reject-business", actions.rejectBusiness)
//modify business category and vendor
router.post("/api/csr/v2/modify-business-catven", actions.modifyCategoryAndVendor)
//suspend business
router.post("/api/csr/v2/suspend-business", actions.suspendBusiness)
//unsuspend business
router.post("/api/csr/v2/unsuspend-business", actions.unsuspendBusiness)
//edit profile
router.post("/api/csr/v2/edit-profile", actions.editProfile)

//fetch businesses
router.post("/api/csr/v2/fetch-businesses", actions.fetchBusinesses)
//fetch vendors
router.post("/api/csr/v2/fetch-vendors", actions.fetchVendors)
//fetch categories
router.post("/api/csr/v2/fetch-categories", actions.fetchCategories)
//fetch unconfirmed businesses
router.post("/api/csr/v2/fetch-unconfirmed-business", actions.fetchUnconfirmedBusinesses)
//fetch valid subs
router.post("/api/csr/v2/fetch-valid-subs", actions.fetchTotalValidSubscriptions)
//fetch pending subs
router.post("/api/csr/v2/fetch-pending-subs", actions.fetchUnpaidBusinesses)
//fetch pending subs vendor
router.post("/api/csr/v2/fetch-pending-subs-vendor", actions.fetchUnpaidBusinessesVendors)
//fetch invalid subs
router.post("/api/csr/v2/fetch-invalid-subs", actions.fetchTotalInvalidSubscriptions)
//fetch valid subs volume
router.post("/api/csr/v2/fetch-valid-subs-volume", actions.fetchTotalValidSubscriptionsVolume)
//fetch expected monthly revenue
router.post("/api/csr/v2/fetch-expected-monthly-revenue", actions.fetchTotalExpectedMonthlyRevenue)
//fetch revenue by category
router.post("/api/csr/v2/fetch-category-revenue", actions.fetchCategoryRevenue)
//fetch expected revenue by category
router.post("/api/csr/v2/fetch-expected-category-revenue", actions.fetchExpectedCategoryRevenue)


module.exports = router