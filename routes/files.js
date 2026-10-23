const express = require("express")
const createRateLimiter = require("../middleware/rateLimiter")
const fileStorageService = require("../services/fileStorageService")
const { generateResponse } = require("../utils/helpers")

const router = express.Router()

// Rate limiting for file endpoints

// Get file info
router.get("/info/:userId/:fileType/:fileName",  async (req, res) => {
  try {
    const { userId, fileType, fileName } = req.params
    const fullPath = `users/${userId}/${fileType}/${fileName}`

    const fileInfo = await fileStorageService.getFileInfo(fullPath)

    if (!fileInfo) {
      const { response, statusCode } = generateResponse(false, "File not found")
      return res.status(statusCode).json(response)
    }

    const { response, statusCode } = generateResponse(true, "File info retrieved successfully", fileInfo)
    res.status(statusCode).json(response)
  } catch (error) {
    console.error("Get file info error:", error)
    const { response, statusCode } = generateResponse(false, "Internal server error")
    res.status(statusCode).json(response)
  }
})

// Get all files for a user
router.get("/user/:userId",  async (req, res) => {
  try {
    const { userId } = req.params

    const files = await fileStorageService.getUserFiles(userId)

    const { response, statusCode } = generateResponse(true, "User files retrieved successfully", {
      userId,
      files,
      totalFiles: files.length,
    })

    res.status(statusCode).json(response)
  } catch (error) {
    console.error("Get user files error:", error)
    const { response, statusCode } = generateResponse(false, "Internal server error")
    res.status(statusCode).json(response)
  }
})

// Delete a file (admin only)
router.delete("/:userId/:fileType/:fileName",  async (req, res) => {
  try {
    const { userId, fileType, fileName } = req.params
    const fullPath = `users/${userId}/${fileType}/${fileName}`

    const deleted = await fileStorageService.deleteFile(fullPath)

    if (!deleted) {
      const { response, statusCode } = generateResponse(false, "File not found or could not be deleted")
      return res.status(statusCode).json(response)
    }

    const { response, statusCode } = generateResponse(true, "File deleted successfully", {
      deletedFile: fullPath,
    })

    res.status(statusCode).json(response)
  } catch (error) {
    console.error("Delete file error:", error)
    const { response, statusCode } = generateResponse(false, "Internal server error")
    res.status(statusCode).json(response)
  }
})

// Get storage statistics (admin only)
router.get("/admin/stats",  async (req, res) => {
  try {
    const stats = await fileStorageService.getStorageStats()

    if (!stats) {
      const { response, statusCode } = generateResponse(false, "Could not retrieve storage statistics")
      return res.status(statusCode).json(response)
    }

    // Format file sizes for better readability
    const formatBytes = (bytes) => {
      if (bytes === 0) return "0 Bytes"
      const k = 1024
      const sizes = ["Bytes", "KB", "MB", "GB"]
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    const formattedStats = {
      ...stats,
      totalSizeFormatted: formatBytes(stats.totalSize),
      directories: Object.keys(stats.directories).reduce((acc, key) => {
        acc[key] = {
          ...stats.directories[key],
          sizeFormatted: formatBytes(stats.directories[key].size),
        }
        return acc
      }, {}),
    }

    const { response, statusCode } = generateResponse(true, "Storage statistics retrieved successfully", formattedStats)
    res.status(statusCode).json(response)
  } catch (error) {
    console.error("Get storage stats error:", error)
    const { response, statusCode } = generateResponse(false, "Internal server error")
    res.status(statusCode).json(response)
  }
})

// Cleanup temporary files (admin only)
router.post("/admin/cleanup",  async (req, res) => {
  try {
    const { olderThanHours = 24 } = req.body

    const deletedCount = await fileStorageService.cleanupTempFiles(olderThanHours)

    const { response, statusCode } = generateResponse(true, "Cleanup completed successfully", {
      deletedFiles: deletedCount,
      olderThanHours,
    })

    res.status(statusCode).json(response)
  } catch (error) {
    console.error("Cleanup error:", error)
    const { response, statusCode } = generateResponse(false, "Internal server error")
    res.status(statusCode).json(response)
  }
})

console.log("✅ File management routes configured successfully")

module.exports = router
