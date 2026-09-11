# Ticket 20 — concrete activation unblock proposal

Status: prepared for owner scope approval, not implemented/provisioned. September 11, 2026.

## Observed prerequisite

Production and Git main remain at821e2a47976e161d81d0f4e0e80754e2a97af8d8; production deployment dpl_2cBwwkvcDmoTMBPhRPqP8sZAdrc6 remains READY. Authenticated project Storage UI shows no connected store and offers only the team's unrelated bass-binge-catalog database. Leave it unconnected and untouched. CLI auth metadata is expired and has a refresh credential; no authenticated CLI command or refresh was performed. Vercel connector and existing dashboard remain signed in. Local feature regression and whitespace checks still pass.

## Proposed smallest full fix

Create one dedicated private Vercel Blob store named `dude-mcgee-featured-drop-production`, in existing team `dirt-cat-records-projects`, region `iad1`, used only by project `dude-mcgee-website` production. Retain the current Hobby plan; no trial, upgrade, paid allowance or other project connections. Current official pricing states Hobby is free within included limits and stops access when limits are exceeded; this availability limitation must remain visible.

Move the authoritative current-drop pointer and immutable revision/attempt records into that store. The Website reads that selection at runtime. Code deployment installs the reader; it does not select a campaign. Future campaign activation updates the pointer using the previously observed ETag with `ifMatch`; first initialization must use no-overwrite creation. A stale writer gets a precondition failure instead of replacing a newer drop. Store immutable exact manifest/media and previous-success references. Preserve the full catalog independently of feature lookup failures and show an honest feature-unavailable state; never fall back silently to a packaged older drop.

Persist write intent before mutation, retain the activation ID for the campaign revision, reconcile unknown results using immutable records/current pointer, and never blindly retry or roll back. Public exact media/feature/product readback and mobile browser observation still determine VERIFIED. A rollback is a new guarded pointer transition after separate authority, preserving success history. Disable automatic SDK write retries for uncertain operations; stale reads can only cause rejected writes, not weaken the ETag condition. Verify provider behavior and concurrent stale-write rejection in an isolated prefix before real activation.

This resolves **campaign activation concurrency** by changing the activation primitive from deployment promotion to a guarded data write. It does not claim to make Vercel promotion atomic or prevent an administrator restoring pre-integration Website code. Bootstrap is a supervised installation of the reader against verified current source, followed by guarded campaign activation. No background publisher or social submission is included. Owner approval includes this explicit contract adjustment; do not silently mark the old promotion-CAS requirement satisfied.

## Exact requested scope expansion

- Create this one private production Blob store and connect only the Website runtime and owning local activation adapter.
- Authorize only the Vercel credential setup/refresh necessary for provisioning and using that store; reuse signed-in connectors where supported, without broadening unrelated account grants.
- Approve protected Vercel production environment storage as the runtime copy of a required application credential, in addition to durable local macOS Keychain. Never use source, .env files, command arguments, screenshots or ordinary temporary files for issued values.
- Install the reader/activation adapter, run relevant checks, deploy the bounded Website change, activate approved Drop000 and observe public readback. Social source/database wiring remains a separately recorded boundary.
- No paid upgrade/spending, other-brand storage use, social/profile edits, email, schedule, account security changes or background activation.

## Secret capture prerequisite before any issuance

No secret created or refreshed during preparation. Existing social worktree has a built native Keychain helper at `/Users/josh/.codex/worktrees/1c8d/dude-mcgee-social-automations/dist/keychain-helper`; its reviewed caller uses length-framed stdin/stdout pipes and create-only plus retrieval-match verification. Reuse this helper read-only from the Website setup process rather than edit social source. Do not invoke an issuance tool that outputs the secret to chat or an unprotected file. Native provider API response must stay in the owning process's memory and immediately pass into Keychain; only success/failure may leave that process. If the available provider route cannot do this, stop before creation.

Proposed resolved references (check absence and Keychain availability before issuance; collisions require the next distinct version, never overwrite):

| Provider/application/environment | Principal and purpose | Keychain service | Account |
| --- | --- | --- | --- |
| Vercel / Dude McGee Website / production | featured-drop store read-write credential | com.dudemcgee.website.vercel.production | featured-drop-store.read-write.v01 |
| Vercel / Dude McGee Website / production |870dudemcgee access token, only if a CLI-session refresh is necessary and authorized | com.dudemcgee.website.vercel.production |870dudemcgee.cli-access.v01 |
| Vercel / Dude McGee Website / production |870dudemcgee replacement refresh token, only if returned by that same refresh | com.dudemcgee.website.vercel.production |870dudemcgee.cli-refresh.v01 |

Verify every issued value by timing-safe retrieval comparison before use or further setup, including paired refresh credentials. Record creation/expiry, purpose, exact references and verified time in `gates/merch-pilot/featured-drop-credential-inventory.json`, never values. Preserve existing CLI credential references and integrations; no automatic CLI refresh/file write. Before using OIDC or any auto-refresh library, explicitly reconcile its token persistence behavior with the owner's rule; default to a verified static application credential when provider support permits. Do not create a temporary test credential merely to test capture.

## Sources verified September 11

- https://vercel.com/docs/vercel-blob/using-blob-sdk — `ifMatch` conditional put and precondition failure.
- https://vercel.com/docs/vercel-blob/usage-and-pricing — Hobby included limits and access suspension, no additional-usage charges.
- https://vercel.com/docs/vercel-blob — private storage and credential/connection behavior.
- Signed-in project Storage: https://vercel.com/dirt-cat-records-projects/dude-mcgee-website/stores .
