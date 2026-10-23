const express = require("express")
const createRateLimiter = require("../middleware/rateLimiter")
const databaseStorageService = require("../services/databaseStorageService")
const { generateResponse } = require("../utils/helpers")

const router = express.Router()

// Rate limiting for image endpoints


// Get image by ID
router.get("/:imageId",  async (req, res) => {
  try {
    const { imageId } = req.params

    const image = await databaseStorageService.getImageFromDatabase(imageId)

    if (!image) {
      const { response, statusCode } = generateResponse(false, "Image not found")
      return res.status(statusCode).json(response)
    }

    const { response, statusCode } = generateResponse(true, "Image retrieved successfully", image)
    res.status(statusCode).json(response)
  } catch (error) {
    console.error("Get image error:", error)
    const { response, statusCode } = generateResponse(false, "Internal server error")
    res.status(statusCode).json(response)
  }
})

// Get image as actual image file (for displaying in browser)
router.get("/:imageId/file",  async (req, res) => {
  try {
    const { imageId } = req.params

    const image = await databaseStorageService.getImageFromDatabase(imageId)

    if (!image) {
      return res.status(404).json({ error: "Image not found" })
    }

    // Convert base64 back to buffer
    const imageBuffer = Buffer.from(image.base64Data, "base64")

    // Set appropriate headers
    res.set({
      "Content-Type": image.mimeType,
      "Content-Length": imageBuffer.length,
      "Cache-Control": "public, max-age=31536000", // Cache for 1 year
      "Content-Disposition": `inline; filename="${image.originalName}"`,
    })

    res.send(imageBuffer)
  } catch (error) {
    console.error("Get image file error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get all images for a user
router.get("/user/:userId",  async (req, res) => {
  try {
    const { userId } = req.params

    const images = await databaseStorageService.getUserImages(userId)

    const { response, statusCode } = generateResponse(true, "User images retrieved successfully", {
      userId,
      images,
      totalImages: images.length,
    })

    res.status(statusCode).json(response)
  } catch (error) {
    console.error("Get user images error:", error)
    const { response, statusCode } = generateResponse(false, "Internal server error")
    res.status(statusCode).json(response)
  }
})

// Delete an image (admin only)
router.delete("/:imageId",  async (req, res) => {
  try {
    const { imageId } = req.params

    const deleted = await databaseStorageService.deleteImageFromDatabase(imageId)

    if (!deleted) {
      const { response, statusCode } = generateResponse(false, "Image not found or could not be deleted")
      return res.status(statusCode).json(response)
    }

    const { response, statusCode } = generateResponse(true, "Image deleted successfully", {
      deletedImageId: imageId,
    })

    res.status(statusCode).json(response)
  } catch (error) {
    console.error("Delete image error:", error)
    const { response, statusCode } = generateResponse(false, "Internal server error")
    res.status(statusCode).json(response)
  }
})

// Get storage statistics (admin only)
router.get("/admin/stats",  async (req, res) => {
  try {
    const stats = await databaseStorageService.getStorageStats()

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
      users: Object.keys(stats.users).reduce((acc, userId) => {
        acc[userId] = {
          ...stats.users[userId],
          sizeFormatted: formatBytes(stats.users[userId].size),
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

// Cleanup old images (admin only)
router.post("/admin/cleanup",  async (req, res) => {
  try {
    const { olderThanDays = 30 } = req.body

    const deletedCount = await databaseStorageService.cleanupOldImages(olderThanDays)

    const { response, statusCode } = generateResponse(true, "Cleanup completed successfully", {
      deletedImages: deletedCount,
      olderThanDays,
    })

    res.status(statusCode).json(response)
  } catch (error) {
    console.error("Cleanup error:", error)
    const { response, statusCode } = generateResponse(false, "Internal server error")
    res.status(statusCode).json(response)
  }
})

console.log("✅ Image management routes configured successfully")

module.exports = router
