const parseTradeDate = (value) => {
  if (typeof value === "string") {
    const monthYear = value.trim().match(/^(0[1-9]|1[0-2])\/(\d{2})$/)
    if (monthYear) {
      const year = 2000 + Number(monthYear[2])
      return new Date(Date.UTC(year, Number(monthYear[1]) - 1, 1))
    }
  }

  const date = value instanceof Date ? new Date(value) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

module.exports = { parseTradeDate }
