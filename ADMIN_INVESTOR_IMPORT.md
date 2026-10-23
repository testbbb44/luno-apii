# Admin investor import

POST /api/admin/import-investor

Creates an account for an existing investor with one original deposit and one
profit transaction per completed 24-hour period. No email or message is sent.
The administrator supplies and privately shares the username/email and password.
Only the password hash is saved; responses never contain the password.

## Setup

Admin login is a client-side check in the React admin page. No API key, server
login endpoint, or session token is required. The create-user form posts directly
to /api/admin/import-investor. The client-side credentials are not API security:
admin endpoints can be called directly without signing in. Use only where that
access model is intended, or restrict API access at the deployment boundary.

## Example request

```http
POST /api/admin/import-investor
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phoneNumber": "+2348012345678",
  "username": "jane_doe",
  "password": "ChooseAStrongPassword123!",
  "confirmPassword": "ChooseAStrongPassword123!",
  "importReference": "legacy-investor-0001",
  "investmentPlanId": "starter",
  "amount": 3000,
  "currency": "USD",
  "investedAt": "2026-10-01T00:00:00Z"
}
```

Optional amountInCrypto and cryptoCoinName must be supplied together. No historical
crypto conversion rate is inferred. Username uses 3�32 letters, numbers, or
underscores and is stored lowercase. Password follows normal signup requirements.
Use an ISO investment timestamp with an explicit UTC `Z` or offset. Future dates
are rejected. Email and phone follow the normal signup requirements.

Server plan definitions are in config/investmentPlans.js:

| Plan ID | Daily simple interest | Duration | Minimum USD |
| --- | --- | --- | --- |
| starter | 3% | 30 days | 3000 |
| professional | 3% | 45 days | 5000 |
| enterprise | 3% | 60 days | 10000 |

Rates are snapshotted onto the investment. Earnings start after 24 hours, include
weekends, and stop at the selected plan's maturity. Each daily amount is rounded
to cents before summing. Deposit day gets a deposit entry, with first profit one
full day later. No partial day's earnings are credited. Cron runs at midnight UTC;
subsequent eligible credits appear on its next run.

The 201 response includes userId, planId, username, email, amountInvested,
dailyEarning, creditedDays, totalProfit, currentBalance, investmentValue,
transactionCount, currency, and creditedThrough. currentBalance is credited profit;
principal is tracked separately in totalAmountInvested. investmentValue is
principal plus earnings before withdrawals. This import assumes no previous
withdrawals or additional deposits. It does not make principal withdrawable.

All records are committed atomically (at most 63 writes for current plans).
Retry the identical request with the same importReference after a timeout. A
completed reference returns its original result with replayed=true and HTTP 200,
without creating anything again. A reference identifies one immutable import;
changing its payload will not modify its original records. Existing email, phone,
or username returns 409. Validation returns 400. Unexpected failure returns 500.

Users log in through POST /api/auth/login with either:

```json
{"username":"jane_doe","password":"ChooseAStrongPassword123!"}
```

or the existing email/password body. Send one identifier, not both.
Their history is available through the existing GET
/api/investment/transactions/:userId endpoint, including its pagination.
Account creation dates remain the import date; investment/transaction dates reflect
the original investment. Imported records include importReference and importedAt.

The profit service now credits only completed days, catches up after downtime,
and commits transactions and balances together. Existing investments continue from
their last recorded calculation timestamp; this does not repair prior overcredits.
Imported investments enforce maturity; legacy investments retain their existing
uncapped duration behavior.

## Verification

Run `node --test tests/importInvestor.test.js` from lunovest-api.
Tests cover calculation boundaries, maturity, rounding, authentication, validation,
password hashing, atomic import writes in a mock database, duplicate identities,
repeat imports, and repeat daily-credit runs. A live Firestore deployment check is
still required; the tests use an in-memory Firestore substitute.
