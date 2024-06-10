const multer = require("multer")

const storagePath = multer.diskStorage({
    destination: (req, file, callback) => {
        // callback(null, "public/assets/owner_id")
        // callback(null, true)
        if (req.body.fileType == "ownerId") {
            callback(null, "public/assets/owner_id")
        }
    },
    filename: (req, file, callback) => {
        callback(null, `${Date.now()}_${file.originalname}`)
    },
})

const fileFilter = (req, file, callback) => {
    if (file.mimetype == "image/jpeg" || file.mimetype == "image/jpg" || file.mimetype == "image/png" || file.mimetype == "application/pdf") {
        callback(null, true)
    }else {
        callback(null, false)
    }
}

const fileUploader = multer({
    storage: storagePath,
    limits: {
        fileSize: 1024 * 1024 * 20
    },
    fileFilter: fileFilter,
}).single("image")

module.exports = fileUploader