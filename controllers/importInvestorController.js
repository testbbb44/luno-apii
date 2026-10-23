const { getFirestore } = require('../config/firebase')
const { hashPassword, formatPhoneNumber } = require('../utils/helpers')
const plans = require('../config/investmentPlans')
const schema = require('../validators/importInvestorValidator')
const { earnings, DAY_MS } = require('../utils/earnings')
module.exports = async (req, res) => {
  const { value: input, error } = schema.validate(req.body, { abortEarly: false })
  if (error) return res.status(400).json({ success: false, message: 'Validation error', errors: error.details.map(d => d.message) })
  const now = new Date()
  const start = new Date(input.investedAt)
  const plan = plans[input.investmentPlanId]
  if (start > now || input.amount < plan.minimumAmount) return res.status(400).json({ success: false, message: `Date must not be in the future; minimum investment is USD ${plan.minimumAmount}` })
  try {
    const db = getFirestore()
    const email = input.email.trim().toLowerCase()
    const phoneNumber = formatPhoneNumber(input.phoneNumber)
    const password = await hashPassword(input.password)
    const ref = db.collection('investorImports').doc(input.importReference)
    const userRef = db.collection('users').doc()
    const planRef = db.collection('investmentPlans').doc()
    const calculated = earnings(input.amount, plan.dailyPercentage, start, now, plan.durationDays)
    const result = await db.runTransaction(async tx => {
      const existing = await tx.get(ref)
      if (existing.exists) return { ...existing.data().result, replayed: true }
      for (const [field, value] of [['email', email], ['phoneNumber', phoneNumber], ['username', input.username]]) {
        const found = await tx.get(db.collection('users').where(field, '==', value).limit(1))
        if (!found.empty) { const error = new Error(`An account with this ${field} already exists`); error.status = 409; throw error }
      }
      const result = { userId: userRef.id, planId: planRef.id, username: input.username, email,
        amountInvested: input.amount, dailyEarning: calculated.daily, creditedDays: calculated.days,
        totalProfit: calculated.total, currentBalance: calculated.total,
        investmentValue: Math.round((input.amount + calculated.total) * 100) / 100,
        transactionCount: calculated.days + 1, currency: input.currency,
        creditedThrough: calculated.lastDate.toISOString() }
      tx.create(userRef, { firstName: input.firstName.trim(), lastName: input.lastName.trim(), email, phoneNumber,
        username: input.username, password, isEmailVerified: false, registeredAt: now, lastLogin: null,
        createdAt: now, updatedAt: now, currentBalance: calculated.total, totalProfit: calculated.total,
        importReference: input.importReference, accountSource: 'admin-import' })
      tx.create(planRef, { userId: userRef.id, investmentPlanId: input.investmentPlanId,
        investmentPlanName: plan.name, dailyPercentage: plan.dailyPercentage, withdrawalDay: plan.durationDays,
        withdrawalDate: new Date(+start + plan.durationDays * DAY_MS), totalAmountInvested: input.amount,
        totalAmountInCrypto: input.amountInCrypto || 0, cryptoCoinName: input.cryptoCoinName || '', currency: input.currency,
        totalAmountGained: calculated.total, isActive: true, createdAt: start, investedAt: start,
        updatedAt: now, importedAt: now, importReference: input.importReference,
        accrualStartAt: start, accrualDurationDays: plan.durationDays, creditedDays: calculated.days,
        lastProfitCalculated: calculated.lastDate })
      const common = { userId: userRef.id, investmentPlanId: input.investmentPlanId, planDocId: planRef.id,
        currency: input.currency, status: 'success', importedAt: now, importReference: input.importReference }
      tx.create(db.collection('transactions').doc(`${planRef.id}_deposit`), { ...common,
        transactionType: 'deposit', amount: input.amount, amountInCrypto: input.amountInCrypto || 0,
        cryptoCoinName: input.cryptoCoinName || '', title: `Initial Investment - ${plan.name}`,
        description: 'Historical deposit recorded by admin', tags: ['deposit', 'imported'], createdAt: start })
      for (let day = 1; day <= calculated.days; day++) {
        tx.create(db.collection('transactions').doc(`${planRef.id}_profit_${day}`), { ...common,
          transactionType: 'profit', amount: calculated.daily, title: `Daily Profit - ${plan.name}`,
          description: `Historical daily profit, day ${day}`, tags: ['daily profit', 'imported'],
          createdAt: new Date(+start + day * DAY_MS) })
      }
      tx.create(ref, { createdAt: now, createdBy: req.admin?.username || 'admin', result })
      return result
    })
    return res.status(result.replayed ? 200 : 201).json({ success: true, message: 'Investor account and history ready. Share the supplied login credentials with the customer.', data: result })
  } catch (error) {
    if (!error.status) console.error('Investor import failed:', error.code || error.name)
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Investor import failed; retry with the same importReference' })
  }
}
