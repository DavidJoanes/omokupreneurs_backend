const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_SECRET_NAME,
    api_key: process.env.CLOUDINARY_SECRET_API,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
    secure: true,
  });

module.exports = cloudinary