class SSNValidator {
    static isValid(ssn) {
      if (!ssn || typeof ssn !== "string") {
        return false
      }
  
      // Remove any non-digit characters
      const cleanSSN = ssn.replace(/\D/g, "")
  
      // Check if it's exactly 9 digits
      if (cleanSSN.length !== 9) {
        return false
      }
  
      // Check for invalid patterns
      const invalidPatterns = [
        "000000000", // All zeros
        "111111111", // All ones
        "222222222", // All twos
        "333333333", // All threes
        "444444444", // All fours
        "555555555", // All fives
        "666666666", // All sixes
        "777777777", // All sevens
        "888888888", // All eights
        "999999999", // All nines
        "123456789", // Sequential
        "987654321", // Reverse sequential
      ]
  
      if (invalidPatterns.includes(cleanSSN)) {
        return false
      }
  
      // Check area number (first 3 digits)
      const areaNumber = cleanSSN.substring(0, 3)
      if (areaNumber === "000" || areaNumber === "666" || areaNumber.startsWith("9")) {
        return false
      }
  
      // Check group number (middle 2 digits)
      const groupNumber = cleanSSN.substring(3, 5)
      if (groupNumber === "00") {
        return false
      }
  
      // Check serial number (last 4 digits)
      const serialNumber = cleanSSN.substring(5, 9)
      if (serialNumber === "0000") {
        return false
      }
  
      return true
    }
  
    static format(ssn) {
      if (!ssn || typeof ssn !== "string") {
        return ""
      }
  
      const cleanSSN = ssn.replace(/\D/g, "")
      if (cleanSSN.length !== 9) {
        return ssn // Return original if not valid length
      }
  
      return `${cleanSSN.substring(0, 3)}-${cleanSSN.substring(3, 5)}-${cleanSSN.substring(5, 9)}`
    }
  
    static clean(ssn) {
      if (!ssn || typeof ssn !== "string") {
        return ""
      }
      return ssn.replace(/\D/g, "")
    }
  }
  
  module.exports = SSNValidator
  