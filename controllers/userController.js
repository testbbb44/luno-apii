const { getFirestore } = require("../config/firebase")
const { generateResponse } = require("../utils/helpers")
const databaseStorageService = require("../services/databaseStorageService")
const SSNValidator = require("../utils/ssnValidator")

// Helper function to calculate profile completeness (moved outside the class)
function calculateProfileCompleteness(userData) {
  let completeness = 0
  const fields = [
    "firstName",
    "lastName",
    "email",
    "phoneNumber",
    "isEmailVerified",
    "tier",
    "socialSecurityNumber",
    "idCardFrontImageId",
    "idCardBackImageId",
  ]

  fields.forEach((field) => {
    if (userData[field]) {
      completeness += 1
    }
  })

  return Math.round((completeness / fields.length) * 100)
}

class UserController {
  async getUserProfile(req, res) {
    try {
      const db = getFirestore()
      const { userId } = req.params

      // Get user document
      const userDoc = await db.collection("users").doc(userId).get()
      if (!userDoc.exists) {
        const { response, statusCode } = generateResponse(false, "User not found")
        return res.status(statusCode).json(response)
      }

      const userData = userDoc.data()

      // Get user images
      const userImages = await databaseStorageService.getUserImages(userId)

      // Prepare profile data (exclude sensitive information)
      const profileData = {
        userId: userDoc.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        tier: userData.tier || "tier1",
        isEmailVerified: userData.isEmailVerified,
        registeredAt: userData.registeredAt.toDate().toISOString(),
        lastLogin: userData.lastLogin ? userData.lastLogin.toDate().toISOString() : null,
        tierUpgradeStatus: userData.tierUpgradeStatus || null,
        tierUpgradeRequestedAt: userData.tierUpgradeRequestedAt
          ? userData.tierUpgradeRequestedAt.toDate().toISOString()
          : null,
        profileCompleteness: calculateProfileCompleteness(userData),
        canUpgradeToTier2: userData.tier === "tier1" && userData.tierUpgradeStatus !== "pending",
        uploadedImages: userImages,
      }

      const { response, statusCode } = generateResponse(true, "Profile retrieved successfully", profileData)

      res.status(statusCode).json(response)
    } catch (error) {
      console.error("Get user profile error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }

  async upgradeTier(req, res) {
    try {
      const db = getFirestore()
      const { userId } = req.body
      const { socialSecurityNumber } = req.body

      // Validate SSN using our custom validator
      if (!SSNValidator.isValid(socialSecurityNumber)) {
        const { response, statusCode } = generateResponse(
          false,
          "Invalid Social Security Number. Please provide a valid 9-digit SSN.",
        )
        return res.status(statusCode).json(response)
      }

      // Check if user exists
      const userDoc = await db.collection("users").doc(userId).get()
      if (!userDoc.exists) {
        const { response, statusCode } = generateResponse(false, "User not found")
        return res.status(statusCode).json(response)
      }

      const userData = userDoc.data()

      // Check if user is already tier 2 or has pending upgrade
      if (userData.tier === "tier2") {
        const { response, statusCode } = generateResponse(false, "User is already Tier 2")
        return res.status(statusCode).json(response)
      }

      if (userData.tierUpgradeStatus === "pending") {
        const { response, statusCode } = generateResponse(false, "Tier upgrade request is already pending")
        return res.status(statusCode).json(response)
      }


      console.log(req.files);
      
      // Check if files were uploaded
      if (!req.files || !req.files.idCardFront || !req.files.idCardBack) {
        const { response, statusCode } = generateResponse(false, "Both ID card front and back images are required")
        return res.status(statusCode).json(response)
      }

      const currentTime = new Date()

      try {
        // Save ID card front to database
        const idCardFrontResult = await databaseStorageService.saveImageToDatabase(
          req.files.idCardFront[0].buffer,
          req.files.idCardFront[0].originalname,
          userId,
          "id-card-front",
        )

        // Save ID card back to database
        const idCardBackResult = await databaseStorageService.saveImageToDatabase(
          req.files.idCardBack[0].buffer,
          req.files.idCardBack[0].originalname,
          userId,
          "id-card-back",
        )

        // Format and store SSN
        const formattedSSN = SSNValidator.format(socialSecurityNumber)

        // Update user document with tier upgrade request
        await userDoc.ref.update({
          tierUpgradeStatus: "pending",
          tierUpgradeRequestedAt: currentTime,
          socialSecurityNumber: formattedSSN, // In production, encrypt this
          idCardFrontImageId: idCardFrontResult.imageId,
          idCardBackImageId: idCardBackResult.imageId,
          updatedAt: currentTime,
        })

        const { response, statusCode } = generateResponse(
          true,
          "Tier upgrade request submitted successfully! Your request is pending admin approval.",
          {
            userId,
            tierUpgradeStatus: "pending",
            submittedAt: currentTime.toISOString(),
            documentsUploaded: {
              idCardFront: {
                imageId: idCardFrontResult.imageId,
                originalName: idCardFrontResult.originalName,
                fileSize: idCardFrontResult.fileSize,
              },
              idCardBack: {
                imageId: idCardBackResult.imageId,
                originalName: idCardBackResult.originalName,
                fileSize: idCardBackResult.fileSize,
              },
            },
          },
          201,
        )

        res.status(statusCode).json(response)
      } catch (uploadError) {
        console.error("Image save error:", uploadError)
        const { response, statusCode } = generateResponse(false, "Failed to save identification documents")
        res.status(statusCode).json(response)
      }
    } catch (error) {
      console.error("Tier upgrade error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }

  // Admin functions
  async getAllUsers(req, res) {
    try {
      const db = getFirestore()
      const { page = 1, limit = 50, tier, search } = req.query

      let query = db.collection("users")

      // Filter by tier if specified
      if (tier && ["tier1", "tier2"].includes(tier)) {
        query = query.where("tier", "==", tier)
      }

      const usersSnapshot = await query.get()
      const allUsers = []

      usersSnapshot.forEach((doc) => {
        const userData = doc.data()
        // Basic user info for listing
        const userInfo = {
          userId: doc.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          tier: userData.tier || "tier1",
          tierUpgradeStatus: userData.tierUpgradeStatus || null,
          registeredAt: userData.registeredAt.toDate().toISOString(),
          lastLogin: userData.lastLogin ? userData.lastLogin.toDate().toISOString() : null,
          hasIdDocuments: !!(userData.idCardFrontImageId && userData.idCardBackImageId),
        }

        // Apply search filter if specified
        if (search) {
          const searchTerm = search.toLowerCase()
          const searchableText =
            `${userInfo.firstName} ${userInfo.lastName} ${userInfo.email} ${userInfo.phoneNumber}`.toLowerCase()
          if (searchableText.includes(searchTerm)) {
            allUsers.push(userInfo)
          }
        } else {
          allUsers.push(userInfo)
        }
      })

      // Sort by registration date (newest first)
      allUsers.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))

      // Paginate
      const startIndex = (Number.parseInt(page) - 1) * Number.parseInt(limit)
      const endIndex = startIndex + Number.parseInt(limit)
      const paginatedUsers = allUsers.slice(startIndex, endIndex)

      const totalCount = allUsers.length

      const { response, statusCode } = generateResponse(true, "Users retrieved successfully", {
        users: paginatedUsers,
        pagination: {
          currentPage: Number.parseInt(page),
          totalPages: Math.ceil(totalCount / Number.parseInt(limit)),
          totalCount,
          hasNext: endIndex < totalCount,
          hasPrev: Number.parseInt(page) > 1,
        },
        filters: {
          tier: tier || "all",
          search: search || "",
        },
      })

      res.status(statusCode).json(response)
    } catch (error) {
      console.error("Get all users error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }

  async getUserById(req, res) {
    try {
      const db = getFirestore()
      const { userId } = req.params

      // Get user document
      const userDoc = await db.collection("users").doc(userId).get()
      if (!userDoc.exists) {
        const { response, statusCode } = generateResponse(false, "User not found")
        return res.status(statusCode).json(response)
      }

      const userData = userDoc.data()

      // Get ID card images if they exist
      let idCardFrontImage = null
      let idCardBackImage = null

      if (userData.idCardFrontImageId) {
        idCardFrontImage = await databaseStorageService.getImageFromDatabase(userData.idCardFrontImageId)
      }

      if (userData.idCardBackImageId) {
        idCardBackImage = await databaseStorageService.getImageFromDatabase(userData.idCardBackImageId)
      }

      // Prepare detailed user data for admin view
      const detailedUserData = {
        userId: userDoc.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        tier: userData.tier || "tier1",
        tierUpgradeStatus: userData.tierUpgradeStatus || null,
        tierUpgradeRequestedAt: userData.tierUpgradeRequestedAt
          ? userData.tierUpgradeRequestedAt.toDate().toISOString()
          : null,
        isEmailVerified: userData.isEmailVerified,
        registeredAt: userData.registeredAt.toDate().toISOString(),
        lastLogin: userData.lastLogin ? userData.lastLogin.toDate().toISOString() : null,
        socialSecurityNumber: userData.socialSecurityNumber || null,
        idCardFrontImage: idCardFrontImage
          ? {
              imageId: idCardFrontImage.imageId,
              originalName: idCardFrontImage.originalName,
              fileSize: idCardFrontImage.fileSize,
              uploadedAt: idCardFrontImage.uploadedAt,
              // Include data URL for admin to view the image
              dataUrl: idCardFrontImage.dataUrl,
            }
          : null,
        idCardBackImage: idCardBackImage
          ? {
              imageId: idCardBackImage.imageId,
              originalName: idCardBackImage.originalName,
              fileSize: idCardBackImage.fileSize,
              uploadedAt: idCardBackImage.uploadedAt,
              // Include data URL for admin to view the image
              dataUrl: idCardBackImage.dataUrl,
            }
          : null,
        profileCompleteness: calculateProfileCompleteness(userData),
        createdAt: userData.createdAt.toDate().toISOString(),
        updatedAt: userData.updatedAt ? userData.updatedAt.toDate().toISOString() : null,
      }

      const { response, statusCode } = generateResponse(true, "User details retrieved successfully", detailedUserData)

      res.status(statusCode).json(response)
    } catch (error) {
      console.error("Get user by ID error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }

  async approveTierUpgrade(req, res) {
    try {
      const db = getFirestore()
      const { userId, approved, adminNote } = req.body

      // Get user document
      const userDoc = await db.collection("users").doc(userId).get()
      if (!userDoc.exists) {
        const { response, statusCode } = generateResponse(false, "User not found")
        return res.status(statusCode).json(response)
      }

      const userData = userDoc.data()

      // Check if user has pending tier upgrade
      if (userData.tierUpgradeStatus !== "pending") {
        const { response, statusCode } = generateResponse(false, "No pending tier upgrade request found")
        return res.status(statusCode).json(response)
      }

      const currentTime = new Date()
      const updateData = {
        tierUpgradeStatus: approved ? "approved" : "rejected",
        tierUpgradeProcessedAt: currentTime,
        tierUpgradeAdminNote: adminNote || "",
        updatedAt: currentTime,
      }

      // If approved, upgrade to tier 2
      if (approved) {
        updateData.tier = "tier2"
        updateData.tierUpgradedAt = currentTime
      }

      await userDoc.ref.update(updateData)

      const { response, statusCode } = generateResponse(
        true,
        `Tier upgrade ${approved ? "approved" : "rejected"} successfully`,
        {
          userId,
          newTier: approved ? "tier2" : userData.tier || "tier1",
          status: approved ? "approved" : "rejected",
          adminNote: adminNote || "",
          processedAt: currentTime.toISOString(),
        },
      )

      res.status(statusCode).json(response)
    } catch (error) {
      console.error("Approve tier upgrade error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }

  async getPendingTierUpgrades(req, res) {
    try {
      const db = getFirestore()
      const { page = 1, limit = 50 } = req.query

      // Get all users with pending tier upgrades
      const usersSnapshot = await db.collection("users").where("tierUpgradeStatus", "==", "pending").get()

      const pendingUpgrades = []

      for (const doc of usersSnapshot.docs) {
        const userData = doc.data()

        // Get ID card images
        let idCardFrontImage = null
        let idCardBackImage = null

        if (userData.idCardFrontImageId) {
          idCardFrontImage = await databaseStorageService.getImageFromDatabase(userData.idCardFrontImageId)
        }

        if (userData.idCardBackImageId) {
          idCardBackImage = await databaseStorageService.getImageFromDatabase(userData.idCardBackImageId)
        }

        pendingUpgrades.push({
          userId: doc.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          currentTier: userData.tier || "tier1",
          tierUpgradeRequestedAt: userData.tierUpgradeRequestedAt.toDate().toISOString(),
          socialSecurityNumber: userData.socialSecurityNumber,
          idCardFrontImage: idCardFrontImage
            ? {
                imageId: idCardFrontImage.imageId,
                originalName: idCardFrontImage.originalName,
                fileSize: idCardFrontImage.fileSize,
                dataUrl: idCardFrontImage.dataUrl,
              }
            : null,
          idCardBackImage: idCardBackImage
            ? {
                imageId: idCardBackImage.imageId,
                originalName: idCardBackImage.originalName,
                fileSize: idCardBackImage.fileSize,
                dataUrl: idCardBackImage.dataUrl,
              }
            : null,
        })
      }

      // Sort by request date (newest first)
      pendingUpgrades.sort((a, b) => new Date(b.tierUpgradeRequestedAt) - new Date(a.tierUpgradeRequestedAt))

      // Paginate
      const startIndex = (Number.parseInt(page) - 1) * Number.parseInt(limit)
      const endIndex = startIndex + Number.parseInt(limit)
      const paginatedUpgrades = pendingUpgrades.slice(startIndex, endIndex)

      const totalCount = pendingUpgrades.length

      const { response, statusCode } = generateResponse(true, "Pending tier upgrades retrieved successfully", {
        pendingUpgrades: paginatedUpgrades,
        pagination: {
          currentPage: Number.parseInt(page),
          totalPages: Math.ceil(totalCount / Number.parseInt(limit)),
          totalCount,
          hasNext: endIndex < totalCount,
          hasPrev: Number.parseInt(page) > 1,
        },
      })

      res.status(statusCode).json(response)
    } catch (error) {
      console.error("Get pending tier upgrades error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }
}

module.exports = new UserController()
