const { getFirestore } = require("../config/firebase")
const { generateResponse } = require("../utils/helpers")

class DatabaseStorageService {
  constructor() {
    console.log("💾 Database storage initialized - images will be saved in Firestore")
  }

  generateUniqueId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 9)
    return `${timestamp}_${random}`
  }

  async saveImageToDatabase(fileBuffer, originalName, userId, fileType) {
    try {
      const db = getFirestore()

      // Convert buffer to base64
      const base64Data = fileBuffer.toString("base64")
      const fileExtension = originalName.split(".").pop().toLowerCase()
      const mimeType = this.getContentType(fileExtension)

      // Create image document
      const imageData = {
        userId,
        fileType,
        originalName,
        fileName: `${fileType}_${this.generateUniqueId()}.${fileExtension}`,
        mimeType,
        fileSize: fileBuffer.length,
        base64Data,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Save to Firestore
      const imageRef = await db.collection("images").add(imageData)

      console.log(`✅ Image saved to database: ${originalName} -> ${imageRef.id}`)

      return {
        imageId: imageRef.id,
        fileName: imageData.fileName,
        originalName,
        fileSize: fileBuffer.length,
        mimeType,
        storageType: "database",
        uploadedAt: new Date().toISOString(),
        // Create a data URL for immediate use
        dataUrl: `data:${mimeType};base64,${base64Data}`,
      }
    } catch (error) {
      console.error("❌ Database image save error:", error)
      throw new Error(`Failed to save image to database: ${error.message}`)
    }
  }

  async getImageFromDatabase(imageId) {
    try {
      const db = getFirestore()

      const imageDoc = await db.collection("images").doc(imageId).get()

      if (!imageDoc.exists) {
        return null
      }

      const imageData = imageDoc.data()

      return {
        imageId: imageDoc.id,
        ...imageData,
        dataUrl: `data:${imageData.mimeType};base64,${imageData.base64Data}`,
        uploadedAt: imageData.uploadedAt.toDate().toISOString(),
        createdAt: imageData.createdAt.toDate().toISOString(),
        updatedAt: imageData.updatedAt.toDate().toISOString(),
      }
    } catch (error) {
      console.error("❌ Get image from database error:", error)
      return null
    }
  }

  async getUserImages(userId) {
    try {
      const db = getFirestore()

      const imagesSnapshot = await db.collection("images").where("userId", "==", userId).get()

      const images = []

      imagesSnapshot.forEach((doc) => {
        const imageData = doc.data()
        images.push({
          imageId: doc.id,
          fileName: imageData.fileName,
          originalName: imageData.originalName,
          fileType: imageData.fileType,
          mimeType: imageData.mimeType,
          fileSize: imageData.fileSize,
          uploadedAt: imageData.uploadedAt.toDate().toISOString(),
          // Don't include base64Data in list view for performance
          hasData: !!imageData.base64Data,
        })
      })

      return images
    } catch (error) {
      console.error("❌ Get user images error:", error)
      return []
    }
  }

  async deleteImageFromDatabase(imageId) {
    try {
      const db = getFirestore()

      const imageDoc = await db.collection("images").doc(imageId).get()

      if (!imageDoc.exists) {
        return false
      }

      await imageDoc.ref.delete()
      console.log(`🗑️ Deleted image from database: ${imageId}`)

      return true
    } catch (error) {
      console.error("❌ Delete image from database error:", error)
      return false
    }
  }

  async updateImageMetadata(imageId, metadata) {
    try {
      const db = getFirestore()

      await db
        .collection("images")
        .doc(imageId)
        .update({
          ...metadata,
          updatedAt: new Date(),
        })

      return true
    } catch (error) {
      console.error("❌ Update image metadata error:", error)
      return false
    }
  }

  getContentType(extension) {
    const contentTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      pdf: "application/pdf",
      gif: "image/gif",
      webp: "image/webp",
    }
    return contentTypes[extension] || "application/octet-stream"
  }

  // Get database storage statistics
  async getStorageStats() {
    try {
      const db = getFirestore()

      const imagesSnapshot = await db.collection("images").get()

      const stats = {
        totalImages: 0,
        totalSize: 0,
        userCount: 0,
        fileTypes: {},
        users: {},
      }

      const userSet = new Set()

      imagesSnapshot.forEach((doc) => {
        const imageData = doc.data()

        stats.totalImages++
        stats.totalSize += imageData.fileSize || 0

        userSet.add(imageData.userId)

        // Count by file type
        const ext = imageData.originalName.split(".").pop().toLowerCase()
        stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1

        // Count by user
        if (!stats.users[imageData.userId]) {
          stats.users[imageData.userId] = {
            count: 0,
            size: 0,
          }
        }
        stats.users[imageData.userId].count++
        stats.users[imageData.userId].size += imageData.fileSize || 0
      })

      stats.userCount = userSet.size

      return stats
    } catch (error) {
      console.error("❌ Get storage stats error:", error)
      return null
    }
  }

  // Clean up old images (older than specified days)
  async cleanupOldImages(olderThanDays = 30) {
    try {
      const db = getFirestore()
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

      const oldImagesSnapshot = await db.collection("images").where("uploadedAt", "<", cutoffDate).get()

      let deletedCount = 0
      const batch = db.batch()

      oldImagesSnapshot.forEach((doc) => {
        batch.delete(doc.ref)
        deletedCount++
      })

      if (deletedCount > 0) {
        await batch.commit()
        console.log(`🧹 Cleaned up ${deletedCount} old images`)
      }

      return deletedCount
    } catch (error) {
      console.error("❌ Cleanup old images error:", error)
      return 0
    }
  }
}

module.exports = new DatabaseStorageService()
