# Player lobby and account rooms

Owner scope: #201, #202 and #194. Direct implementation in the current chat. This changes the public entry flow; it does not constitute Owner acceptance of the whole Phase 2 product or substitute for novice playtests.

## Player flow

- Single Player starts immediately, without an account. New worlds get independent seeds and IndexedDB saves. Continue uses the last committed save, never an unsaved new world. Legacy Phase 1 worlds can continue or upgrade to Colony while retaining their saved identity and state.
- Multiplayer uses the Vercel game origin. On GitHub Pages, the Multiplayer/Login actions open that origin so session cookies work as first-party cookies. Existing solo saves remain in their original browser/origin; they are not automatically copied to Vercel.
- Register a username (3–24 letters/numbers/underscores) and password (15–128 characters). Save the one-time recovery code. It can reset a forgotten password and produces a replacement recovery code. There is no email recovery, social login or cross-device solo-save synchronization in this release.
- Choose Pioneer, Azure or Moss. These are cosmetic palette variants of the existing colonist artwork, not a skin marketplace. Account selection persists remotely; solo selection persists on the device.
- Click your account name to set a 2–24 Unicode-code-point display name. It defaults to the login username for older accounts, persists through re-login, and applies on room rejoin. The server supplies chat/nameplate identity; a client cannot claim a different sender.
- Host with a room name (3–32 characters) and room password (4–64 characters). Join with the same two fields. Room lists and invitation links carry names, never passwords or owner tokens. Room names are visible to signed-in players; entry remains password protected.
- Owners can continue, rename/change password, save/export and remove their room. Guests cannot manage it. Changing a password invalidates guest permission on the next connection; already connected players remain until they disconnect. Stop all players and allow the authority lease to expire before deleting; export a backup first if needed.
- A three-shot arrival introduces exploration and base building. Enter advances; Escape/Skip enters the world immediately. Returning to a committed save does not replay it. Unavailable cosmetic/intro preference storage never blocks solo play.
- Settings contains return-to-lobby. Solo saves before returning and preserves the current page when the navigation bookmark cannot be written. A host saves the shared world before leaving; a guest leaves the shared authority running for remaining players.

## Authority and storage

Account/session data lives in Redis. Passwords use random salts and asynchronous scrypt (N=131072, r=8, p=1); comparisons are constant time. Opaque browser sessions are HttpOnly, SameSite=Lax, 24 hours, and Secure with a __Host- prefix on Vercel. A session is bound to a random credential version so password recovery invalidates it even across concurrent login/recovery. Profile and password updates compare the previous record atomically. Authentication and room-entry attempts are bounded per address and subject. Credentialed CORS replies use an origin selected from the configured allowlist.

Named-room metadata is separate from world checkpoints. Ownership is validated against the session account. Each account receives its own persistent private colonist key per room; the authority uses that binding rather than a supplied resume credential to prevent another account's character being claimed. Scene replication includes cosmetic skins and display names; inventory and commands retain existing server authority rules.

Existing anonymous room records are retained. Locally cached invitations have a Continue link in Multiplayer; their existing private invitation/owner-token policy remains. They are not silently transferred to a different account. The old anonymous server API is retained for compatibility; the public lobby uses authenticated named rooms.

The free store remains bounded: at most eight shared worlds in the production namespace, two MiB per new checkpoint; legacy checkpoints retain their prior four MiB bound. Creation is throttled. This increases headroom without deleting the four pre-existing worlds. Account registration is capped at 500. Capacity errors remain possible and are shown in player language. Preview branches use separate namespaces; preview/test records must be removed after verification and are not promoted into production worlds.

## Verification and release

Required evidence includes password/Unicode validation; real Redis registration, login, recovery, ownership, password-change and stable-identity tests; browser solo cutscene/skin/save/continue/responsive tests; three real browsers host/join/gather/save/reconnect and cosmetic replication; standard quality gates. The live test is opt-in with PILOT_PUBLIC_URL and may add a rotation soak with PILOT_SOAK_SECONDS. Its cleanup removes only the new room ID returned to that test, never other production rooms.

Record exact commit, PR, deployment identity, screenshots and live results in the completion notice. #199 (genuine novice evidence) and #187 (Owner acceptance) remain separate, truthful gates.
