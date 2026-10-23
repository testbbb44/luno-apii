const DAY_MS = 86400000
const money = value => Math.round((value + Number.EPSILON) * 100) / 100
const asDate = value => value && typeof value.toDate === 'function' ? value.toDate() : new Date(value)
function earnings(amount, rate, start, now, maxDays = Infinity) {
  const days = Math.max(0, Math.min(maxDays, Math.floor((asDate(now) - asDate(start)) / DAY_MS)))
  const daily = money(amount * rate / 100)
  return { days, daily, total: money(daily * days), lastDate: new Date(+asDate(start) + days * DAY_MS) }
}
module.exports = { DAY_MS, money, asDate, earnings }
