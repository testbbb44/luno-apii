const { admin } = require("../config/firebase")
const path = require("path")
const fs = require("fs")

class FileStorageService {
  constructor() {
    try {
      // Try to get the default bucket
      this.bucket = admin.storage().bucket()
      console.log("✅ Firebase Storage bucket initialized")
    } catch (error) {
      console.warn("⚠️ Firebase Storage not available, using local storage fallback")
      this.bucket = null
      this.useLocalStorage = true
      this.ensureUploadDirectory()
    }
  }

  ensureUploadDirectory() {
    const uploadDir = path.join(process.cwd(), "uploads")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
      console.log("📁 Created uploads directory")
    }
  }

  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  async uploadFile(fileBuffer, originalName, userId, fileType) {
    try {
      if (this.useLocalStorage) {
        return await this.uploadToLocal(fileBuffer, originalName, userId, fileType)
      } else {
        return await this.uploadToFirebase(fileBuffer, originalName, userId, fileType)
      }
    } catch (error) {
      console.error("File upload error:", error)
      throw new Error("Failed to upload file")
    }
  }

  async uploadToFirebase(fileBuffer, originalName, userId, fileType) {
    // Generate unique filename
    const fileExtension = originalName.split(".").pop()
    const fileName = `users/${userId}/${fileType}/${this.generateUniqueId()}.${fileExtension}`

    // Create file reference
    const file = this.bucket.file(fileName)

    // Upload file
    await file.save(fileBuffer, {
      metadata: {
        contentType: this.getContentType(fileExtension),
        metadata: {
          originalName: originalName,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      },
    })

    // Make file publicly accessible
    await file.makePublic()

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${fileName}`

    return {
      fileName,
      publicUrl,
      originalName,
      storageType: "firebase",
    }
  }

  async uploadToLocal(fileBuffer, originalName, userId, fileType) {
    // Generate unique filename
    const fileExtension = originalName.split(".").pop()
    const uniqueFileName = `${this.generateUniqueId()}.${fileExtension}`

    // Create directory structure
    const userDir = path.join(process.cwd(), "uploads", "users", userId, fileType)
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true })
    }

    // Save file
    const filePath = path.join(userDir, uniqueFileName)
    fs.writeFileSync(filePath, fileBuffer)

    // Create public URL (you'll need to serve this via Express static middleware)
    const publicUrl = `/uploads/users/${userId}/${fileType}/${uniqueFileName}`
    const fileName = `users/${userId}/${fileType}/${uniqueFileName}`

    return {
      fileName,
      publicUrl,
      originalName,
      storageType: "local",
      localPath: filePath,
    }
  }

  getContentType(extension) {
    const contentTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      pdf: "application/pdf",
    }
    return contentTypes[extension.toLowerCase()] || "application/octet-stream"
  }

  async deleteFile(fileName) {
    try {
      if (this.useLocalStorage) {
        const filePath = path.join(process.cwd(), "uploads", fileName)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
          return true
        }
        return false
      } else {
        const file = this.bucket.file(fileName)
        await file.delete()
        return true
      }
    } catch (error) {
      console.error("File deletion error:", error)
      return false
    }
  }

  getFileUrl(fileName) {
    if (this.useLocalStorage) {
      return `/uploads/${fileName}`
    } else {
      return `https://storage.googleapis.com/${this.bucket.name}/${fileName}`
    }
  }
}

module.exports = new FileStorageService()
