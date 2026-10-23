const bcrypt = require("bcryptjs")

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const hashPassword = async (password) => {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword)
}

const formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, "")

  // Add country code if not present
  if (!cleaned.startsWith("1") && cleaned.length === 10) {
    return "+1" + cleaned
  }

  if (!cleaned.startsWith("+")) {
    return "+" + cleaned
  }

  return cleaned
}

const generateResponse = (success, message, data = null, statusCode = 200) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
  }

  if (data) {
    response.data = data
  }

  return { response, statusCode }
}

module.exports = {
  generateOTP,
  hashPassword,
  comparePassword,
  formatPhoneNumber,
  generateResponse,
}
