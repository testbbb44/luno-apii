const { getFirestore } = require("../config/firebase")
const { generateOTP, hashPassword, comparePassword, formatPhoneNumber, generateResponse } = require("../utils/helpers")

class AuthController {
  async signup(req, res) {
    try {
      const db = getFirestore() // Get db instance inside the method
      const {  firstName, lastName, email, phoneNumber, password } = req.body

      // Check if user already exists
      const userSnapshot = await db.collection("users").where("email", "==", email.toLowerCase()).get()

      if (!userSnapshot.empty) {
        const { response, statusCode } = generateResponse(false, "User with this email already exists")
        return res.status(statusCode).json(response)
      }

      // Check if phone number already exists
      const formattedPhone = formatPhoneNumber(phoneNumber)
      const phoneSnapshot = await db.collection("users").where("phoneNumber", "==", formattedPhone).get()

      if (!phoneSnapshot.empty) {
        const { response, statusCode } = generateResponse(false, "User with this phone number already exists")
        return res.status(statusCode).json(response)
      }

      // Hash password
      const hashedPassword = await hashPassword(password)

      // Create user document
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phoneNumber: formattedPhone,
        password: hashedPassword,
        isEmailVerified: true, // Set to true by default
        registeredAt: new Date(),
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Save user to Firestore
      const userRef = await db.collection("users").add(userData)

      const { response, statusCode } = generateResponse(
        true,
        "Account created successfully! You can now login.",
        {
          userId: userRef.id,
          email: email.toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        },
        201,
      )

      res.status(statusCode).json(response)
    } catch (error) {
      console.error("Signup error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }

  async login(req, res) {
    try {
      const db = getFirestore() // Get db instance inside the method
      const { email, username, password } = req.body

      // Find user by email
      const userSnapshot = await db.collection("users").where(email ? "email" : "username", "==", (email || username).trim().toLowerCase()).get()

      if (userSnapshot.empty) {
        const { response, statusCode } = generateResponse(false, "Invalid email or password")
        return res.status(statusCode).json(response)
      }

      const userDoc = userSnapshot.docs[0]
      const userData = userDoc.data()

      // Verify password
      const isPasswordValid = await comparePassword(password, userData.password)

      if (!isPasswordValid) {
        const { response, statusCode } = generateResponse(false, "Invalid email or password")
        return res.status(statusCode).json(response)
      }

      // Update last login
      const currentTime = new Date()
      await userDoc.ref.update({
        lastLogin: currentTime,
        updatedAt: currentTime,
      })

      // Prepare response data
      const responseData = {
        userId: userDoc.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        registeredAt: userData.registeredAt.toDate().toISOString(),
        lastLogin: currentTime.toISOString(),
      }

      const { response, statusCode } = generateResponse(true, "Login successful!", responseData)

      res.status(statusCode).json(response)
    } catch (error) {
      console.error("Login error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }
}

module.exports = new AuthController()
