const { earnings, asDate, money, DAY_MS } = require('../utils/earnings')
async function creditDailyProfits(db, now = new Date()) {
  const plans = await db.collection('investmentPlans').where('isActive', '==', true).get()
  let processedPlans = 0
  const users = new Set()
  for (const doc of plans.docs) {
    // Each chunk stays below Firestore's transaction write limit. Retries resume from the cursor.
    let more = true
    while (more) {
      const outcome = await db.runTransaction(async tx => {
        const snapshot = await tx.get(doc.ref)
        const plan = snapshot.data()
        if (!plan || !plan.isActive || !(plan.totalAmountInvested > 0)) return null
        const userRef = db.collection('users').doc(plan.userId)
        const user = await tx.get(userRef)
        if (!user.exists) throw new Error('Investment owner missing')
        const start = asDate(plan.accrualStartAt || plan.lastProfitCalculated || plan.createdAt)
        const cap = plan.accrualDurationDays || Infinity
        const calculated = earnings(plan.totalAmountInvested, plan.dailyPercentage, start, now, cap)
        const credited = plan.accrualStartAt ? (plan.creditedDays || 0) : 0
        if (calculated.days <= credited) return null
        const through = Math.min(calculated.days, credited + 200)
        const amount = money((through - credited) * calculated.daily)
        for (let day = credited + 1; day <= through; day++) {
          tx.create(db.collection('transactions').doc(doc.id + '_profit_' + day), {
            userId: plan.userId, investmentPlanId: plan.investmentPlanId, planDocId: doc.id,
            transactionType: 'profit', amount: calculated.daily, currency: plan.currency,
            title: 'Daily Profit - ' + plan.investmentPlanName, description: 'Automatic daily profit, day ' + day,
            status: 'success', tags: ['daily profit', 'auto-approved'], createdAt: new Date(+start + day * DAY_MS),
          })
        }
        tx.update(doc.ref, { accrualStartAt: start, creditedDays: through,
          totalAmountGained: money((plan.totalAmountGained || 0) + amount),
          lastProfitCalculated: new Date(+start + through * DAY_MS), updatedAt: now })
        tx.update(userRef, { currentBalance: money((user.data().currentBalance || 0) + amount),
          totalProfit: money((user.data().totalProfit || 0) + amount), updatedAt: now })
        return { more: through < calculated.days, userId: plan.userId }
      })
      more = !!(outcome && outcome.more)
      if (outcome) { users.add(outcome.userId); if (!more) processedPlans++ }
    }
  }
  return { processedPlans, usersUpdated: users.size }
}
module.exports = { creditDailyProfits }
