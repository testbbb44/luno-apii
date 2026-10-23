const multer = require("multer")
const path = require("path")

// Configure multer for memory storage
const storage = multer.memoryStorage()

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = /jpeg|jpg|png|pdf/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)

  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb(new Error("Only JPEG, JPG, PNG, and PDF files are allowed"))
  }
}

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
})

// Middleware for handling file upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 10MB.",
        timestamp: new Date().toISOString(),
      })
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Too many files or unexpected field name.",
        timestamp: new Date().toISOString(),
      })
    }
  }

  if (error.message === "Only JPEG, JPG, PNG, and PDF files are allowed") {
    return res.status(400).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    })
  }

  next(error)
}

module.exports = {
  upload,
  handleUploadError,
}
