// middleware/upload.middleware.js
const multer = require("multer");
const AppError = require("../utils/AppError");
const STATUS_CODES = require("../utils/statusCode");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extName = allowedTypes.test(
    file.originalname.toLowerCase()
  );
  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  }

  cb(
    new AppError(
      "Only JPG, JPEG, and PNG files are allowed",
      STATUS_CODES.BAD_REQUEST
    )
  );
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
}).single("profile_pic");

module.exports = upload;