const test = require("node:test")
const assert = require("node:assert/strict")
const { createBarterTradeSchema } = require("../validators/barterTradeValidator")

const validTrade = {
  fullName: "Jane Doe",
  tradeType: "goods for services",
  traceId: "1234567890123456",
  tradeNumber: "001",
  address: "123 Example Street",
  zipCode: "10001",
  tradeDate: "2099-12-31T12:00:00.000Z",
}

test("barter trade schema accepts valid future trade details", () => {
  assert.equal(createBarterTradeSchema.validate(validTrade).error, undefined)
})

test("barter trade schema accepts future dates that are not ISO formatted", () => {
  assert.equal(
    createBarterTradeSchema.validate({
      ...validTrade,
      tradeDate: "December 31, 2099",
    }).error,
    undefined,
  )
})

test("barter trade schema interprets MM/YY as a future month and year", () => {
  assert.equal(
    createBarterTradeSchema.validate({ ...validTrade, tradeDate: "09/29" }).error,
    undefined,
  )
  assert.ok(createBarterTradeSchema.validate({ ...validTrade, tradeDate: "09/20" }).error)
  assert.ok(createBarterTradeSchema.validate({ ...validTrade, tradeDate: "13/29" }).error)
})

test("barter trade schema accepts omitted trade type, address, and zip code", () => {
  const { tradeType, address, zipCode, ...tradeWithoutOptionalFields } = validTrade
  assert.equal(createBarterTradeSchema.validate(tradeWithoutOptionalFields).error, undefined)
})

test("barter trade schema rejects invalid identifiers and non-future dates", () => {
  for (const invalidTrade of [
    { ...validTrade, traceId: "123456789012345" },
    { ...validTrade, traceId: "123456789012345x" },
    { ...validTrade, tradeNumber: "12" },
    { ...validTrade, tradeNumber: "12a" },
    { ...validTrade, fullName: "Jane" },
    { ...validTrade, tradeDate: "2000-01-01T00:00:00.000Z" },
    { ...validTrade, tradeDate: "not-a-date" },
  ]) {
    assert.ok(createBarterTradeSchema.validate(invalidTrade).error)
  }
})

test("barter trade submissions persist required and optional fields", async () => {
  const savedTrades = []
  const firebase = require("../config/firebase")
  const originalGetFirestore = firebase.getFirestore
  const controllerPath = require.resolve("../controllers/barterTradeController")
  const cachedController = require.cache[controllerPath]
  delete require.cache[controllerPath]
  firebase.getFirestore = () => ({
    collection(name) {
      assert.equal(name, "barterTrades")
      return {
        async add(data) {
          savedTrades.push(data)
          return { id: `trade-${savedTrades.length}` }
        },
      }
    },
  })

  try {
    const { createBarterTrade } = require("../controllers/barterTradeController")
    const createResponse = () => ({
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        this.payload = payload
        return this
      },
    })

    const standardResponse = createResponse()
    await createBarterTrade({ body: validTrade }, standardResponse)

    assert.equal(standardResponse.statusCode, 201)
    assert.equal(savedTrades[0].traceId, validTrade.traceId)
    assert.equal(savedTrades[0].tradeNumber, validTrade.tradeNumber)
    assert.equal(standardResponse.payload.data.tradeId, "trade-1")
    assert.equal(standardResponse.payload.data.tradeDate, validTrade.tradeDate)

    const monthYearResponse = createResponse()
    await createBarterTrade({ body: { ...validTrade, tradeDate: "09/29" } }, monthYearResponse)

    assert.equal(monthYearResponse.statusCode, 201)
    assert.equal(savedTrades[1].tradeDate.toISOString(), "2029-09-01T00:00:00.000Z")
    assert.equal(monthYearResponse.payload.data.tradeDate, "2029-09-01T00:00:00.000Z")

    const { tradeType, address, zipCode, ...tradeWithoutOptionalFields } = validTrade
    const optionalResponse = createResponse()
    await createBarterTrade({ body: tradeWithoutOptionalFields }, optionalResponse)

    assert.equal(optionalResponse.statusCode, 201)
    assert.equal(savedTrades[2].tradeType, undefined)
    assert.equal(savedTrades[2].address, undefined)
    assert.equal(savedTrades[2].zipCode, undefined)
    assert.equal(optionalResponse.payload.data.tradeId, "trade-3")
  } finally {
    firebase.getFirestore = originalGetFirestore
    delete require.cache[controllerPath]
    if (cachedController) require.cache[controllerPath] = cachedController
  }
})
