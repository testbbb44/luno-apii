const test = require('node:test')
const assert = require('node:assert/strict')
const { earnings, DAY_MS } = require('../utils/earnings')
const { creditDailyProfits } = require('../services/profitService')
const schema = require('../validators/importInvestorValidator')
const { loginSchema } = require('../validators/authValidator')
function fakeDb() {
  const data = new Map(); let count = 0
  const ref = (collection, id) => ({ id, path: collection + '/' + id })
  const snapshot = r => ({ id: r.id, ref: r, exists: data.has(r.path), data: () => data.get(r.path) })
  const query = (name, filters = []) => ({
    where: (key, op, value) => query(name, [...filters, [key, value]]),
    limit() { return this },
    async get() { const docs = [...data].filter(([p, d]) => p.startsWith(name + '/') && filters.every(([k,v]) => d[k] === v)).map(([p]) => snapshot(ref(name, p.slice(name.length + 1)))); return { docs, empty: !docs.length } },
    doc: id => ref(name, id || String(++count)),
  })
  return { data, collection: query, async runTransaction(fn) {
    const writes = []
    const result = await fn({ get: r => r.get ? r.get() : Promise.resolve(snapshot(r)),
      create: (r,d) => writes.push(() => { assert.equal(data.has(r.path), false); data.set(r.path,d) }),
      update: (r,d) => writes.push(() => data.set(r.path, {...data.get(r.path), ...d})),
    }); writes.forEach(f => f()); return result
  } }
}
test('completed days, exact boundary, cent rounding and maturity', () => {
  const start = new Date('2026-01-01T12:00:00Z')
  assert.equal(earnings(3000,3,start,new Date(+start + DAY_MS - 1),30).days,0)
  assert.deepEqual(earnings(3000,3,start,new Date(+start + DAY_MS),30).total,90)
  assert.equal(earnings(3000,3,start,new Date(+start + 90 * DAY_MS),30).total,2700)
  assert.equal(earnings(10.01,3,start,new Date(+start + 3 * DAY_MS)).total,0.9)
})
test('daily credits catch up once and stop at imported maturity', async () => {
  const db = fakeDb(); const start = new Date('2026-01-01T00:00:00Z')
  db.data.set('users/u', {currentBalance:0,totalProfit:0})
  db.data.set('investmentPlans/p', {userId:'u',isActive:true,totalAmountInvested:3000,dailyPercentage:3,
    investmentPlanId:'starter',investmentPlanName:'Starter',currency:'USD',accrualStartAt:start,accrualDurationDays:30,creditedDays:0})
  await creditDailyProfits(db,new Date(+start + 40 * DAY_MS))
  assert.equal(db.data.get('users/u').currentBalance,2700)
  assert.equal([...db.data.keys()].filter(k => k.startsWith('transactions/')).length,30)
  await creditDailyProfits(db,new Date(+start + 41 * DAY_MS))
  assert.equal(db.data.get('users/u').currentBalance,2700)
})
test('import creates hashed account and history; retry does not duplicate', async () => {
  const db=fakeDb(); const firebasePath=require.resolve('../config/firebase')
  require.cache[firebasePath]={id:firebasePath,filename:firebasePath,loaded:true,exports:{getFirestore:()=>db}}
  const controller=require('../controllers/importInvestorController')
  const body={firstName:'Jane',lastName:'Doe',email:'jane@example.com',phoneNumber:'+2348012345678',
    username:'jane_doe',password:'ExamplePass123!',confirmPassword:'ExamplePass123!',importReference:'import-0001',
    investmentPlanId:'starter',amount:3000,investedAt:new Date(Date.now()-3*DAY_MS-60000).toISOString()}
  const response=()=>({status(code){this.code=code;return this},json(payload){this.payload=payload;return this}})
  let res=response(); await controller({body},res)
  assert.equal(res.code,201); assert.equal(res.payload.data.creditedDays,3)
  assert.equal(res.payload.data.currentBalance,270); assert.equal(res.payload.data.investmentValue,3270)
  const user=db.data.get('users/'+res.payload.data.userId)
  assert.notEqual(user.password,body.password); assert.ok(await require('../utils/helpers').comparePassword(body.password,user.password))
  assert.equal([...db.data.keys()].filter(k=>k.startsWith('transactions/')).length,4)
  const size=db.data.size; res=response(); await controller({body},res)
  assert.equal(res.code,200); assert.equal(res.payload.data.replayed,true); assert.equal(db.data.size,size)
  res=response(); await controller({body:{...body,importReference:'import-0002'}},res); assert.equal(res.code,409)
  res=response(); await controller({body:{...body,investedAt:'2099-01-01T00:00:00Z'}},res); assert.equal(res.code,400)
})
test('validators reject client rates and allow username or email login', () => {
  assert.ok(schema.validate({dailyPercentage:100}).error)
  assert.equal(loginSchema.validate({username:'jane_doe',password:'test'}).error,undefined)
  assert.equal(loginSchema.validate({email:'jane@example.com',password:'test'}).error,undefined)
  assert.ok(loginSchema.validate({password:'test'}).error)
})
