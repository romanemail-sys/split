# Relay-Based Location Tracker — Design

**Date:** 2026-05-22
**Status:** Approved design — ready for implementation planning

## Goal

Rebuild the location tracker so it no longer depends on a central application
server with a database. Devices share live location and history with each other
through a tiny, blind relay; each device owns its own data and all access control
and encryption happen on-device.

## Motivation

- **No server cost / upkeep:** the operator should not run or pay for a real
  backend. The relay is a minimal free-tier process with no database.
- **Offline-tolerant:** location recording must continue with no network; data
  syncs opportunistically when devices are online.

## Architecture Overview

The existing `tracker-api/` (Express + Prisma + PostgreSQL) is **deleted
entirely**. It is replaced by:

1. **`tracker-relay/`** — a new Node + TypeScript WebSocket service. It is
   *completely blind*: it only ever sees ciphertext, sender/recipient device IDs,
   and a coarse message type. No database, no business logic (~150 lines).
   Deployed on a free always-on tier (Fly.io / Railway).

2. **The mobile app as source of truth** — each phone stores its own location
   history locally in SQLite (the "ledger"). Encryption, access control, group
   rosters, and blocking all happen on-device.

```
tracker-relay/     ← new, replaces tracker-api/
tracker-mobile/    ← same app, networking + storage layer rewritten
```

### What the relay does — only this

- Authenticates a connecting device (proves it owns its keypair).
- Routes an encrypted message from sender → recipient device ID.
- Holds a tiny in-memory mailbox (latest live location per sender, latest group
  roster, pending join requests) with a short TTL, so a briefly-offline device
  catches up on reconnect.

Restarting the relay loses nothing important — live pings are ephemeral, history
lives on the phones.

### Mobile app changes

- **New:** a crypto module, an SQLite location ledger, a relay WebSocket client.
- **Replaced:** `services/api.ts` (axios/REST) and `services/socket.ts` → one
  `services/relay.ts`.
- **Adapted:** `locationTask.ts` now writes recordings into local SQLite instead
  of POSTing them; the AsyncStorage offline buffer is removed (SQLite *is* the
  store).
- **Reworked:** the device/group stores and the screens (map reads from local
  SQLite; group screens read the roster).

## Identity & Encryption

### Keypairs replace the random UUID

On first run, the app generates two keypairs using `tweetnacl`:

- An **Ed25519 signing keypair** — for signing location records and proving
  identity to the relay.
- An **X25519 box keypair** — for encrypting/decrypting messages.

Both secret keys are stored in **`expo-secure-store`** (OS keychain/keystore,
encrypted at rest), not AsyncStorage.

The **device ID is the Ed25519 signing public key**, hex-encoded — the string a
user shares (QR code / copy-paste) to be added to a group. Because the device ID
*is* the signing public key, the relay can verify a device's auth signature
directly against its device ID, with no key lookup.

The **X25519 box public key** is separate and is distributed as part of group
membership: a `join-req` carries it, and the owner records it in the roster.
This is how members learn each other's encryption keys.

`tweetnacl` needs a secure random source, so `react-native-get-random-values` is
imported once at app entry.

### Relay authentication

On connect, the relay sends a random challenge nonce. The app signs it with its
Ed25519 key and returns the signature. The relay verifies the signature directly
against the claimed device ID (which *is* the Ed25519 signing public key). A
mismatch drops the connection. A device can only ever send *as itself*.

### Per-recipient encryption

When broadcasting location to a group, the app does **not** use a shared group
key. For each non-blocked member it runs
`nacl.box(payload, nonce, recipientPublicKey, mySecretKey)`, producing a
**separate ciphertext per recipient**:

```
{ from: <myDeviceId>, type: "loc",
  recipients: { "<memberId>": { nonce, ciphertext }, ... } }
```

The relay splits this and delivers each member only their own slice. A location
payload is ~50 bytes, so encrypting N copies is trivial for realistic group
sizes.

**Why per-recipient and not a shared group key:** it makes blocking
cryptographically real. A blocked member never has a ciphertext produced for
them — they cannot decrypt your location even if the relay malfunctioned. With a
shared group key, a blocked member would still hold the key.

### Signed records

Every location record is signed by the originating device's Ed25519 key.
Receivers verify the signature before storing — origin is tamper-evident. This is
the append-only signed-log ("blockchain-like") integrity model.

## Relay Protocol

WebSocket messages.

*Client → relay:*
- `hello` — `{ deviceId }`, sent on connect.
- `auth` — `{ signature }`, the signed challenge nonce.
- `send` — `{ to, type, payload }` where `type` is `loc` | `sync` | `roster` |
  `join-req`, and `payload` is always ciphertext. Routed to `to`.

*Relay → client:*
- `challenge` — `{ nonce }`, sent immediately on connect.
- `message` — `{ from, type, payload }`, a forwarded message.
- `error` — `{ reason }`.

The relay never inspects `payload`.

### Relay state (in-memory, bounded)

- `connections`: `deviceId → WebSocket`.
- `mailbox`: `deviceId →` { latest `loc` per sender, latest `roster`, pending
  `join-req`s }. TTL ~10 min for `loc`, ~24 h for `roster` and `join-req`.
  `join-req` is queued so an offline group owner receives pending join requests
  on reconnect. `sync` is forwarded live only (never queued) — it is a bulk
  request/response that only makes sense when both devices are online.

## On-Device Data Model

SQLite via `expo-sqlite`.

### `location_records` — the ledger (append-only, grow-only)

| column | notes |
|---|---|
| `id` | hash of the record contents — makes merging idempotent |
| `device_id` | whose location this is (yours, or a synced peer's) |
| `latitude`, `longitude`, `accuracy` | |
| `timestamp` | |
| `signature` | Ed25519 signature by `device_id`'s key |

Merging two ledgers = `INSERT OR IGNORE` by `id`. No conflicts ever, because each
device only authors its own location records.

### `groups`

| column | notes |
|---|---|
| `group_id` | random, generated by the owner |
| `name`, `owner_id`, `interval_seconds` | |
| `roster` | JSON array of members, each `{ deviceId, boxPublicKey }` |
| `roster_version` | integer, bumped on every change |
| `roster_signature` | owner's Ed25519 signature over `{roster, version, interval}` |

`deviceId` is a member's Ed25519 signing public key; `boxPublicKey` is their
X25519 encryption public key. Both are needed: the signing key to verify that
member's records, the box key to encrypt live location to them.

### `blocks` — purely local, never leaves the device

| column |
|---|
| `blocked_device_id` |

### Group roster authority

The group owner holds the authoritative roster. Any roster change is re-signed by
the owner and broadcast. Members reject a roster whose signature does not verify
against `owner_id`, or whose `roster_version` is older than the one already held.
`interval_seconds` is part of the signed roster blob — that is how "group owner
sets the interval" propagates.

## Runtime Flows

**First run.** Generate both keypairs → store secret keys in `expo-secure-store`
→ device ID = public box key. No network call.

**Create a group.** Owner picks a name and interval → app generates a random
`group_id` → roster = `[{ownerId, ownerBoxPublicKey}]` → owner signs
`{roster, version: 1, interval}` → saved locally. The owner shares a join code
containing `group_id` + the owner's signing public key (`ownerId`) + the owner's
box public key, as a QR / copyable code. The box public key is included so a
joiner can encrypt their join request to the owner.

**Join a group.** New member scans/enters the code → connects to relay → `send`
a `join-req` addressed to `ownerId`. The request carries the joiner's X25519 box
public key, is signed with the joiner's Ed25519 key, and is then encrypted with
`nacl.box` to the owner's box public key (known from the join code) — so the
relay payload is still ciphertext. If the owner is offline the relay queues it.
The owner's app receives it, decrypts it, verifies the signature, shows a
confirmation, and on accept: appends the member `{ deviceId, boxPublicKey }` to
the roster, bumps `roster_version`, re-signs, and `send`s the new roster to every
member (online members live; offline members from the mailbox on reconnect).
Each member verifies the owner's signature and stores the roster.

**Recording location.** The background task (`expo-location`) fires every
`interval_seconds`. Each fix is signed and written to the local
`location_records` table. This happens regardless of network — recording never
depends on the relay.

**Sharing live location.** While the app is active and connected: for each
group, for each non-blocked member, the app encrypts the latest fix with
`nacl.box` and `send`s it via the relay. Recipients get a `message`, decrypt,
verify the signature, store the peer record in SQLite, and update the live map
dot.

**History sync.** When two members are both online (e.g. opening a group
screen), the app sends a `sync` request to each member for a time range. Each
member responds with their *own* signed records in range, encrypted for the
requester. The requester verifies every signature and merges with
`INSERT OR IGNORE`. If a member is offline, their history syncs next time they
are online.

**Blocking.** Entirely local. Block someone → the app stops encrypting live
location for them, drops incoming messages from them, and excludes them from
history responses. Unblock → reverse it. The relay is never told. Bidirectional
in effect: you block B, so B gets nothing from you, and you ignore everything
from B.

**Viewing the map.** The map screen reads straight from local SQLite — your own
route renders instantly and fully offline. Peer routes render from whatever has
been synced.

## Error Handling & Offline Behavior

- **Relay unreachable:** location recording continues into local SQLite
  uninterrupted. Live sharing pauses; your own map still works. On reconnect, the
  client resends the latest fix.
- **WebSocket drops:** auto-reconnect with exponential backoff; re-run the
  challenge/auth handshake on each reconnect.
- **Mailbox TTL exceeded:** an offline-too-long device misses intermediate live
  pings — harmless; it gets the next live fix and fills gaps via history sync.
- **Decryption or signature failure:** the message is dropped and logged, never
  stored. A bad signature never enters the ledger.
- **Roster conflicts:** a roster with an invalid owner signature, or an older
  `roster_version`, is rejected.

## Testing

- **Relay (Jest):** challenge/signature auth (valid + forged), message routing,
  mailbox queue + TTL, and a test asserting the relay handles payloads opaquely.
- **Crypto module (Jest):** encrypt→decrypt round-trip; isolation test — a
  ciphertext addressed to member C cannot be decrypted by member B; signature
  verify accepts valid and rejects tampered records.
- **SQLite ledger (Jest):** `INSERT OR IGNORE` idempotency — merging the same
  record twice is a no-op.

## Out of Scope (v1)

- True Bluetooth / offline phone-to-phone sync (relay-only was chosen).
- Gossip — relaying *other* members' records through intermediaries.
- Receiving others' live location while the app is fully closed (needs push
  notifications). v1: live updates arrive while the app is open; your own
  recording still runs in the background.
- Any admin web panel — there is no central admin in this architecture.

## Tech Stack

- **Relay:** Node, TypeScript, `ws` (WebSocket), `tweetnacl` (signature
  verification), Jest.
- **Mobile:** Expo SDK 54, `tweetnacl` + `react-native-get-random-values`
  (crypto), `expo-secure-store` (key storage), `expo-sqlite` (ledger),
  `expo-location` + `expo-task-manager` (recording, already built),
  `react-native-maps` (map), Zustand (state), Jest.
