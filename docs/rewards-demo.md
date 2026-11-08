# Rewards demonstration — 1 November 2026

Branch: `rewards`.

## Navigation

- `/rewards`: My Passport, including existing earned stamps, XP, milestones and Daily Challenge Coins.
- `/rewards/redeem`: demo reward catalogue and persisted demo wallet.
- `/profile` and `/profile/account`: account settings only. User icons point directly to `/profile/account`.
- `/profile/rewards`: redirects to `/rewards/redeem` for old links.

## Demo behaviour

Each signed-in account starts with a separate allowance of **200 demo coins**. It is calculated on the server minus that account’s persisted demo redemptions; reloading or using a second device does not reset it. It does not change earned Daily Challenge Coins, XP, stamps, legacy vouchers or real money.

Default samples:

| Sample reward | Demo coins |
| --- | ---: |
| Yas Island day-out pass | 80 |
| Dubai Frame admission pass | 35 |
| Dubai Mall AED 50 sample gift card | 50 |
| Mall of the Emirates AED 50 sample gift card | 50 |

Every generated code begins with `DEMO-`. Samples have no cash value and are not valid for admission or purchases. No provider checkout, booking or merchant partnership is implemented. A demo pass can be marked used once; repeating the request is idempotent and never spends coins again.

## Deployment

Deploy the frontend and backend together. This change adds the migration `20261101_coin_redemptions`, following `20261031_daily_promotions`. Follow `deploy/UPDATE_BACKEND.md`, including a database restore point, deployment checks and `alembic upgrade head`. No new required environment variables or worker services are added.

Optional server settings:

- `COIN_REWARDS_ENABLED=false` pauses new demo redemptions while keeping wallet history readable.
- `COIN_REWARD_COSTS` can override demo costs with a JSON object keyed by catalogue offer ID. Values must be positive integers. The server checks the confirmed price and rejects stale or tampered prices.

## API

- `GET /api/v1/passport/coin-rewards`: demo catalogue, demo balance, earned daily balance and owner’s demo wallet.
- `POST /api/v1/passport/coin-rewards/{offer_id}/redeem`: `idempotency_key` and `expected_coins`; issues one persisted demo reward and charges its server-controlled demo cost.
- `POST /api/v1/passport/coin-redemptions/{id}/demo-use`: marks an owned demo pass as used, without another debit.

The existing Passport transaction dependency serializes changes by user, including a PostgreSQL row lock and the local test lock. Database constraints enforce positive costs, valid states and one record per owner/idempotency key.

## Verification

Backend tests cover catalogue/balance, persistence, separate earned coins/XP, duplicate requests, stale/tampered prices, disabled redemptions, simultaneous spending, another owner’s isolation, repeated use and migration upgrade/downgrade. Frontend tests cover Passport relocation, account links, tabs, demo costs and insufficient balances. Browser verification uses a synthetic account and disposable SQLite database, with no production account or provider involved.
