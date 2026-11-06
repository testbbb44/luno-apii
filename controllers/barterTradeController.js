const { getFirestore } = require("../config/firebase")
const { generateResponse } = require("../utils/helpers")
const { parseTradeDate } = require("../utils/tradeDate")

const createBarterTrade = async (req, res) => {
  try {
    const db = getFirestore()
    const { fullName, tradeType, traceId, tradeNumber, address, zipCode, tradeDate } = req.body
    const createdAt = new Date()
    const tradeData = {
      fullName: fullName.trim(),
      traceId,
      tradeNumber,
      tradeDate: parseTradeDate(tradeDate),
      createdAt,
    }

    if (tradeType !== undefined) tradeData.tradeType = tradeType.trim()
    if (address !== undefined) tradeData.address = address.trim()
    if (zipCode !== undefined) tradeData.zipCode = zipCode.trim()

    const tradeRef = await db.collection("barterTrades").add(tradeData)

    const { response, statusCode } = generateResponse(
      true,
      "Barter trade submitted successfully",
      {
        tradeId: tradeRef.id,
        ...tradeData,
        tradeDate: tradeData.tradeDate.toISOString(),
        createdAt: createdAt.toISOString(),
      },
      201,
    )

    return res.status(statusCode).json(response)
  } catch (error) {
    console.error("Create barter trade error:", error)
    const { response, statusCode } = generateResponse(false, "Internal server error", null, 500)
    return res.status(statusCode).json(response)
  }
}

module.exports = { createBarterTrade }
