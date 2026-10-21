# ABYSS OCEAN 2.0
Next.js renders the dashboard; Phaser renders server snapshots. NestJS exposes versioned REST. Colyseus owns movement, food, collision, evolution and arena timers. PostgreSQL is the source of truth for sessions, inventory, orders and survival leases. Rarity is cosmetic. Redis/BullMQ schedules Devnet verification retries. No payments or Mainnet are supported.

Authentication uses Wallet Standard signed messages with SIWS fields, exact challenge bytes, a one-time database challenge, an expiry, and a hashed opaque session cookie. Mutations require the configured Origin. Colyseus seats require one-use join tickets bound to the authenticated session and owned fish. Room recovery ends stale runs at process startup.

Acquisition freezes the integer price, treasury and unique memo intent. Fulfillment, inventory grant, transaction reservation and audit record commit together. OwnedFish.orderId is unique. A partial unique survival index prevents concurrent active runs for a fish across rooms.

The first release uses a single simulation process. Horizontal simulation servers require a shared Colyseus presence/driver and a distributed startup recovery lease before deployment. Room capacity is a configured target, not a verified capacity claim.
