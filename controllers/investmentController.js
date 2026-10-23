

const { getFirestore } = require("../config/firebase")
const { generateResponse } = require("../utils/helpers")

class InvestmentController {
  async createInvestmentPlan(req, res) {
    try {
      const db = getFirestore()
      const {
        userId,
        investmentPlanName,
        investmentPlanId,
        dailyPercentage,
        withdrawalDay,
        amount,
        currency,
        amountInCrypto,
        cryptoCoinName,
      } = req.body

      // Check if user exists
      const userDoc = await db.collection("users").doc(userId).get()
      if (!userDoc.exists) {
        const { response, statusCode } = generateResponse(false, "User not found")
        return res.status(statusCode).json(response)
      }

      // Check if investment plan ID already exists for this user
      const existingPlan = await db
        .collection("investmentPlans")
        .where("userId", "==", userId)
        .where("investmentPlanId", "==", investmentPlanId)
        .get()

      if (!existingPlan.empty) {
        const { response, statusCode } = generateResponse(false, "Investment plan ID already exists for this user")
        return res.status(statusCode).json(response)
      }

      const currentTime = new Date()
      const withdrawalDate = new Date(currentTime.getTime() + withdrawalDay * 24 * 60 * 60 * 1000)

      // Create investment plan document with initial amount as 0 (pending approval)
      const investmentPlanData = {
        userId,
        investmentPlanName: investmentPlanName.trim(),
        investmentPlanId: investmentPlanId.trim(),
        dailyPercentage: Number.parseFloat(dailyPercentage),
        withdrawalDay: Number.parseInt(withdrawalDay),
        withdrawalDate,
        totalAmountInvested: 0, // Will be updated when deposit is approved
        currency: currency.toUpperCase(),
        totalAmountInCrypto: 0, // Will be updated when deposit is approved
        cryptoCoinName: cryptoCoinName.toUpperCase(),
        totalAmountGained: 0,
        isActive: true,
        createdAt: currentTime,
        updatedAt: currentTime,
        lastProfitCalculated: currentTime,
      }

      // Save investment plan to Firestore
      const planRef = await db.collection("investmentPlans").add(investmentPlanData)

      // Create initial transaction record with PENDING status
      const transactionData = {
        userId,
        investmentPlanId: investmentPlanId.trim(),
        planDocId: planRef.id,
        transactionType: "deposit",
        amount: Number.parseFloat(amount),
        currency: currency.toUpperCase(),
        amountInCrypto: Number.parseFloat(amountInCrypto),
        cryptoCoinName: cryptoCoinName.toUpperCase(),
        title: `Initial Investment - ${investmentPlanName}`,
        description: `Initial deposit for investment plan: ${investmentPlanName}`,
        status: "pending", // Changed to pending
        tags: ["deposit"],
        createdAt: currentTime,
      }

      await db.collection("transactions").add(transactionData)

      const { response, statusCode } = generateResponse(
        true,
        "Investment plan created successfully! Your deposit is pending approval.",
        {
          planId: planRef.id,
          investmentPlanId: investmentPlanId.trim(),
          investmentPlanName: investmentPlanName.trim(),
          depositAmount: Number.parseFloat(amount),
          status: "pending",
          withdrawalDate: withdrawalDate.toISOString(),
        },
        201,
      )

      res.status(statusCode).json(response)
    } catch (error) {
      console.error("Create investment plan error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }

  async depositToPlan(req, res) {
    try {
      const db = getFirestore()
      const { investmentPlanId, userId, amount, amountInCrypto, cryptoCoinName } = req.body

      // Find the investment plan
      const planSnapshot = await db
        .collection("investmentPlans")
        .where("userId", "==", userId)
        .where("investmentPlanId", "==", investmentPlanId)
        .where("isActive", "==", true)
        .get()

      if (planSnapshot.empty) {
        const { response, statusCode } = generateResponse(false, "Investment plan not found or inactive")
        return res.status(statusCode).json(response)
      }

      const planDoc = planSnapshot.docs[0]
      const planData = planDoc.data()
      const currentTime = new Date()

      // Create transaction record with PENDING status
      const transactionData = {
        userId,
        investmentPlanId,
        planDocId: planDoc.id,
        transactionType: "deposit",
        amount: Number.parseFloat(amount),
        currency: planData.currency,
        amountInCrypto: Number.parseFloat(amountInCrypto),
        cryptoCoinName: cryptoCoinName.toUpperCase(),
        title: `Additional Deposit - ${planData.investmentPlanName}`,
        description: `Additional deposit to investment plan: ${planData.investmentPlanName}`,
        status: "pending", // Changed to pending
        tags: ["deposit"],
        createdAt: currentTime,
      }

      await db.collection("transactions").add(transactionData)

      const { response, statusCode } = generateResponse(true, "Deposit submitted successfully! Awaiting approval.", {
        investmentPlanId,
        depositAmount: Number.parseFloat(amount),
        status: "pending",
      })

      res.status(statusCode).json(response)
    } catch (error) {
      console.error("Deposit to plan error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }

  async getUserPlans(req, res) {
    try {
      const db = getFirestore()
      const { userId } = req.params

      // Get all active investment plans for the user
      const plansSnapshot = await db
        .collection("investmentPlans")
        .where("userId", "==", userId)
        .where("isActive", "==", true)
        .get()

      if (plansSnapshot.empty) {
        const { response, statusCode } = generateResponse(true, "No investment plans found", [])
        return res.status(statusCode).json(response)
      }

      const currentTime = new Date()
      const plans = []

      for (const planDoc of plansSnapshot.docs) {
        const planData = planDoc.data()

        // Calculate days left until withdrawal
        const withdrawalDate = planData.withdrawalDate.toDate()
        const daysLeft = Math.max(0, Math.ceil((withdrawalDate - currentTime) / (1000 * 60 * 60 * 24)))

        // Calculate daily amount earned (only if there's invested amount)
        const matured = planData.accrualDurationDays && currentTime >= planData.withdrawalDate.toDate()
        const dailyAmountEarned =
          planData.totalAmountInvested > 0 && !matured ? (planData.totalAmountInvested * planData.dailyPercentage) / 100 : 0

        // Calculate total profit gained so far
        const daysSinceCreation = Math.floor((currentTime - planData.createdAt.toDate()) / (1000 * 60 * 60 * 24))
        const totalProfitGained = planData.totalAmountGained || 0

        plans.push({
          planId: planDoc.id,
          investmentPlanId: planData.investmentPlanId,
          investmentPlanName: planData.investmentPlanName,
          totalAmountInvested: planData.totalAmountInvested,
          dailyPercentage: planData.dailyPercentage,
          daysLeft,
          dailyAmountEarned: Number.parseFloat(dailyAmountEarned.toFixed(2)),
          totalProfitGained: Number.parseFloat(totalProfitGained.toFixed(2)),
          currency: planData.currency,
          cryptoCoinName: planData.cryptoCoinName,
          createdAt: planData.createdAt.toDate().toISOString(),
        })
      }

      const { response, statusCode } = generateResponse(true, "Investment plans retrieved successfully", plans)

      res.status(statusCode).json(response)
    } catch (error) {
      console.error("Get user plans error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }

  async getTransactionHistory(req, res) {
    try {
      const db = getFirestore()
      const { userId } = req.params
      const { page = 1, limit = 50 } = req.query

      // Simple query without orderBy to avoid index issues
      const transactionsSnapshot = await db.collection("transactions").where("userId", "==", userId).get()

      // Sort in memory and paginate
      const allTransactions = []
      transactionsSnapshot.forEach((doc) => {
        const transactionData = doc.data()
        allTransactions.push({
          transactionId: doc.id,
          investmentPlanId: transactionData.investmentPlanId,
          transactionType: transactionData.transactionType,
          amount: transactionData.amount,
          currency: transactionData.currency,
          title: transactionData.title,
          description: transactionData.description,
          status: transactionData.status,
          tags: transactionData.tags,
          dateTime: transactionData.createdAt.toDate().toISOString(),
          amountInCrypto: transactionData.amountInCrypto || 0,
          cryptoCoinName: transactionData.cryptoCoinName || "",
          createdAt: transactionData.createdAt.toDate(), // For sorting
        })
      })

      // Sort by date (newest first)
      allTransactions.sort((a, b) => b.createdAt - a.createdAt)

      // Remove the createdAt field used for sorting
      allTransactions.forEach((transaction) => delete transaction.createdAt)

      // Paginate
      const startIndex = (Number.parseInt(page) - 1) * Number.parseInt(limit)
      const endIndex = startIndex + Number.parseInt(limit)
      const paginatedTransactions = allTransactions.slice(startIndex, endIndex)

      const totalCount = allTransactions.length

      const { response, statusCode } = generateResponse(true, "Transaction history retrieved successfully", {
        transactions: paginatedTransactions,
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
      console.error("Get transaction history error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }

  async getUserInvestmentSummary(req, res) {
    try {
      const db = getFirestore()
      const { userId } = req.params

      // Get user data to include current balance
      const userDoc = await db.collection("users").doc(userId).get()
      if (!userDoc.exists) {
        const { response, statusCode } = generateResponse(false, "User not found")
        return res.status(statusCode).json(response)
      }

      const userData = userDoc.data()

      // Get all active investment plans for the user
      const plansSnapshot = await db
        .collection("investmentPlans")
        .where("userId", "==", userId)
        .where("isActive", "==", true)
        .get()

      if (plansSnapshot.empty) {
        const { response, statusCode } = generateResponse(true, "No investment data found", {
          totalInvestment: 0,
          currentBalance: userData.currentBalance || 0,
          totalProfit: userData.totalProfit || 0,
          activePlansCount: 0,
          todaysProfit: 0,
          daysInvested: 0,
          investmentPeriod: "0 days",
        })
        return res.status(statusCode).json(response)
      }

      const currentTime = new Date()
      let totalInvestment = 0
      let todaysProfit = 0
      let earliestInvestmentDate = null

      const activePlansCount = plansSnapshot.size

      plansSnapshot.forEach((planDoc) => {
        const planData = planDoc.data()

        // Add to total investment (only approved amounts)
        totalInvestment += planData.totalAmountInvested

        // Calculate today's profit for this plan (only if there's invested amount)
        if (planData.totalAmountInvested > 0 && !(planData.accrualDurationDays && currentTime >= planData.withdrawalDate.toDate())) {
          const dailyAmountEarned = (planData.totalAmountInvested * planData.dailyPercentage) / 100
          todaysProfit += dailyAmountEarned
        }

        // Track earliest investment date
        const createdAt = planData.createdAt.toDate()
        if (!earliestInvestmentDate || createdAt < earliestInvestmentDate) {
          earliestInvestmentDate = createdAt
        }
      })

      // Calculate days invested and format period
      const daysInvested = earliestInvestmentDate
        ? Math.floor((currentTime - earliestInvestmentDate) / (1000 * 60 * 60 * 24))
        : 0

      let investmentPeriod = "0 days"
      if (daysInvested > 0) {
        if (daysInvested >= 365) {
          const years = Math.floor(daysInvested / 365)
          const remainingDays = daysInvested % 365
          const months = Math.floor(remainingDays / 30)
          investmentPeriod = `${years} year${years > 1 ? "s" : ""}`
          if (months > 0) {
            investmentPeriod += `, ${months} month${months > 1 ? "s" : ""}`
          }
        } else if (daysInvested >= 30) {
          const months = Math.floor(daysInvested / 30)
          const remainingDays = daysInvested % 30
          investmentPeriod = `${months} month${months > 1 ? "s" : ""}`
          if (remainingDays > 0) {
            investmentPeriod += `, ${remainingDays} day${remainingDays > 1 ? "s" : ""}`
          }
        } else {
          investmentPeriod = `${daysInvested} day${daysInvested > 1 ? "s" : ""}`
        }
      }

      const summaryData = {
        totalInvestment: Number.parseFloat(totalInvestment.toFixed(2)),
        investmentValue: Number.parseFloat((totalInvestment + (userData.totalProfit || 0)).toFixed(2)),
        currentBalance: Number.parseFloat((userData.currentBalance || 0).toFixed(2)),
        totalProfit: Number.parseFloat((userData.totalProfit || 0).toFixed(2)),
        activePlansCount,
        todaysProfit: Number.parseFloat(todaysProfit.toFixed(2)),
        daysInvested,
        investmentPeriod,
      }

      const { response, statusCode } = generateResponse(true, "Investment summary retrieved successfully", summaryData)

      res.status(statusCode).json(response)
    } catch (error) {
      console.error("Get investment summary error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }

  // Background job to calculate daily profits (automated via cron)
  async calculateDailyProfits() {
    return require('../services/profitService').creditDailyProfits(getFirestore())
  }

  // Manual trigger for daily profits (for testing)
  async triggerDailyProfits(req, res) {
    try {
      const result = await this.calculateDailyProfits()
      const { response, statusCode } = generateResponse(
        true,
        `Daily profits calculated successfully for ${result.processedPlans} plans and ${result.usersUpdated} users`,
        result,
      )
      res.status(statusCode).json(response)
    } catch (error) {
      console.error("Trigger daily profits error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }

  // Admin function to approve/reject deposits
  async updateTransactionStatus(req, res) {
    try {
      const db = getFirestore()
      const { transactionId, status, adminNote } = req.body

      // Validate status
      if (!["success", "failed"].includes(status)) {
        const { response, statusCode } = generateResponse(false, "Invalid status. Must be 'success' or 'failed'")
        return res.status(statusCode).json(response)
      }

      // Get the transaction
      const transactionDoc = await db.collection("transactions").doc(transactionId).get()
      if (!transactionDoc.exists) {
        const { response, statusCode } = generateResponse(false, "Transaction not found")
        return res.status(statusCode).json(response)
      }

      const transactionData = transactionDoc.data()

      // Only allow updating pending transactions
      if (transactionData.status !== "pending") {
        const { response, statusCode } = generateResponse(false, "Only pending transactions can be updated")
        return res.status(statusCode).json(response)
      }

      const currentTime = new Date()

      // Update transaction status
      await transactionDoc.ref.update({
        status,
        adminNote: adminNote || "",
        updatedAt: currentTime,
      })

      // If it's a successful deposit, update the investment plan
      if (status === "success" && transactionData.transactionType === "deposit") {
        const planDoc = await db.collection("investmentPlans").doc(transactionData.planDocId).get()
        if (planDoc.exists) {
          const planData = planDoc.data()
          const newTotalAmount = planData.totalAmountInvested + transactionData.amount
          const newTotalCrypto = planData.totalAmountInCrypto + (transactionData.amountInCrypto || 0)

          await planDoc.ref.update({
            totalAmountInvested: newTotalAmount,
            totalAmountInCrypto: newTotalCrypto,
            updatedAt: currentTime,
          })
        }
      }

      const { response, statusCode } = generateResponse(true, `Transaction ${status} successfully`, {
        transactionId,
        status,
        adminNote: adminNote || "",
      })

      res.status(statusCode).json(response)
    } catch (error) {
      console.error("Update transaction status error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }

  // Admin function to get all pending transactions
  async getPendingTransactions(req, res) {
    try {
      const db = getFirestore()
      const { page = 1, limit = 50 } = req.query

      // Get all pending transactions
      const transactionsSnapshot = await db.collection("transactions").where("status", "==", "pending").get()

      // Sort in memory and paginate
      const allTransactions = []
      transactionsSnapshot.forEach((doc) => {
        const transactionData = doc.data()
        allTransactions.push({
          transactionId: doc.id,
          userId: transactionData.userId,
          investmentPlanId: transactionData.investmentPlanId,
          transactionType: transactionData.transactionType,
          amount: transactionData.amount,
          currency: transactionData.currency,
          title: transactionData.title,
          description: transactionData.description,
          status: transactionData.status,
          tags: transactionData.tags,
          dateTime: transactionData.createdAt.toDate().toISOString(),
          amountInCrypto: transactionData.amountInCrypto || 0,
          cryptoCoinName: transactionData.cryptoCoinName || "",
          createdAt: transactionData.createdAt.toDate(), // For sorting
        })
      })

      // Sort by date (newest first)
      allTransactions.sort((a, b) => b.createdAt - a.createdAt)

      // Remove the createdAt field used for sorting
      allTransactions.forEach((transaction) => delete transaction.createdAt)

      // Paginate
      const startIndex = (Number.parseInt(page) - 1) * Number.parseInt(limit)
      const endIndex = startIndex + Number.parseInt(limit)
      const paginatedTransactions = allTransactions.slice(startIndex, endIndex)

      const totalCount = allTransactions.length

      const { response, statusCode } = generateResponse(true, "Pending transactions retrieved successfully", {
        transactions: paginatedTransactions,
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
      console.error("Get pending transactions error:", error)
      const { response, statusCode } = generateResponse(false, "Internal server error")
      res.status(statusCode).json(response)
    }
  }
}

module.exports = new InvestmentController()
