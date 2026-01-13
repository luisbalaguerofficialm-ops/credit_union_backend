const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (file, folder) => {
  if (!file || !file.path) {
    throw new Error("File path missing for Cloudinary upload");
  }

  const result = await cloudinary.uploader.upload(file.path, {
    folder,
    resource_type: "image",
  });

  // OPTIONAL: remove file from local uploads after upload
  fs.unlinkSync(file.path);

  return result;
};

module.exports = { uploadToCloudinary };
