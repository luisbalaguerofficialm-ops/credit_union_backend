const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (file, folder) => {
  if (!file || !file.path) {
    throw new Error("File missing");
  }

  const result = await cloudinary.uploader.upload(file.path, {
    folder,
  });

  fs.unlinkSync(file.path); // delete local file
  return result;
};

module.exports = { uploadToCloudinary };
