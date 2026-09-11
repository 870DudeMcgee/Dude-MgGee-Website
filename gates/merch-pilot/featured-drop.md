# Campaign ticket 20 — Website featured drop

Executing the accepted Website task: solo implementation, Ponytail full, focused checks and one bounded review. Worker launches: 0. Owner explicitly authorizes this Website change and deployment; social package approval, profile installation, social submission, credentials and new services remain excluded.

Contract: /Users/josh/.codex/worktrees/1c8d/dude-mcgee-social-automations/planning/campaigns/issues/20-campaign-bio-link.md and docs/campaigns/providers/campaign-bio-link.md. This is the Website execution leaf of the existing merch-pilot tracker.

- [x] W1: Exact owner-confirmed Drop 000 identity, listing revision and media provenance recorded; neutral Website copy preserves launch boundaries.
  EVIDENCE: Exact listing stable hash and original JPEG verified; Website-only manifest and provenance below.
- [x] W2: Current feature renders above intact catalog, with exact canonical route, honest sold-out/removed behavior and current-drop-data marker; staging validates immutable content and rejects stale intent.
  CHECK: node scripts/test-current-drop.js
  EXPECT: Current drop checks passed
  EVIDENCE: Current drop checks passed; immutable preparation repeat verified.
- [x] W3: Required local checks and one bounded review pass, including mobile-sized visual and catalog journey checks.
  EVIDENCE: Browser and review section below; required checks passed, one review and one repair cycle.
- [x] W4: Durable activation intent, real remote concurrency guard, deployment scope preserving current production, public visual/product readback and rollback preparation verified.
  EVIDENCE: Owner-approved Blob CAS activation VERIFIED with immutable remote receipt, cleared pending intent, public exact-byte and mobile product journey checks. See final execution below.

## Initial source and deployment evidence — September 11, 2026

Saved checkout main at 5c1eea9; pre-existing dirty README.md plus untracked .scratch/, .unlazy-routing-audit/, GATES.md, PLAN.md, gates/. Existing .vercelignore excludes these. No local root AGENTS.md at inspection. Ancestor /Users/josh/AGENTS.md read; fetched origin/main includes AGENTS.md and docs/commerce-reference.md, read via git show before implementation. No context graph required there. Existing .scratch/merch-pilot/map.md and decision 01 read. Dirty historical records remain untouched.

Authenticated Vercel project prj_I2zmcDZqJQ6xO2uZ88ziOULSt1Uu, team_c76q0CsojvRxyA2hHVP85ncP. Current production dpl_2cBwwkvcDmoTMBPhRPqP8sZAdrc6, READY, aliases include www.dudemcgee.com. Git source 821e2a47976e161d81d0f4e0e80754e2a97af8d8, commit “Fix complete merchandise catalog and shared Google product policies”. Previous 5c1eea9 checkout is behind. Origin fetched read-only; upstream contains catalog pagination, shared policies, product/feed/sitemap fixes. Must integrate those before any release; never deploy this older tree wholesale. Several upstream-added historical tracker files differ from existing untracked local records; preserve both rather than blindly overwrite.

Public exact listing readback: product gid://shopify/Product/10332079161651, /products/unisex-t-shirt, available, 9 variants. Stable product JSON SHA256 matches recorded public-sha256:7be5f211b557bb8c45c2a32abddac3170393eb10cd7b29b61ddb8ff47b63d008. Public catalog has 11 products. These are dated measurements, not fixed inventory counts.

Remote guard prerequisite: https://openapi.vercel.sh inspected; POST /v10/projects/{projectId}/promote/{deploymentId} has projectId, deploymentId, teamId, slug only, no conditional current revision/body/header. An immediate remote GET then promote would still race. Existing Git deployment does not establish protection against dashboard/CLI promotions. No CAS-backed writer or exclusive remote enforcement has been established. No production call issued. New credentials/services/access changes are excluded.

## Implemented preparation and supported invocation

`lib/current-drop.json` is the exact Website-only manifest approved by this task's instruction. It is not a social Campaign Package, and no social campaign hash or approval is invented. `lib/current-drop.js` derives a content-addressed Website campaign revision, landing revision and activation identity from that manifest. Marker exposes the approved listing revision under `approvedListingRevision`, separately from live availability. The social app must read current product-data itself, as its existing checker already does.

Exact JPEG copied without transformation from `/Volumes/SAMSUNG/Dude McGee/Merch Pilot/dm-shirt-pilot-01/creative/exports/carousel/01-wear-the-signal.jpg` to `assets/drops/drop-000-wear-the-signal.jpg`: 185278 bytes, SHA256 `eee3ec8acb3c78b3e4bf592f7c35570c482e5d2b3ae5d949fe32ce0d305d5faf`, 1080×1350. Source bytes matched before copying. Build-time verification rejects changed media. Website copy says current featured Drop 000 and describes the product; it makes no launch-date or “is here” announcement.

Run from `/Users/josh/Desktop/Dude McGee Website`:

```sh
node scripts/prepare-current-drop.js --expected-current none --previous-deployment dpl_2cBwwkvcDmoTMBPhRPqP8sZAdrc6
node scripts/test-current-drop.js
```

`none` means an observed absence of current-drop-data, not a fictitious previous landing revision. Re-observe the exact current Vercel deployment before using its ID; preparation does not authenticate or verify that caller-supplied deployment ID. The command checks fixed public HTTPS landing/product destinations with redirects refused, rejects stale landing or changed listing identity/revision/availability, verifies exact media, then writes/fsyncs and rereads an exclusive immutable plan. A repeat with the same identity and inputs returns the same file; different contents under that identity fail for reconciliation. No deployment, credential, arbitrary destination fetch or social database operation is available in this command.

Prepared plan: `featured-drop-prepared/c6206d8556a9a38b07654624c94d0e86339df68263522fb07a5e269ba57b21df.json`. Successful preparation and repeat readback verified September 11. Status remains PREPARED / BLOCKED_REMOTE_CAS. This is a staged proposal, not a durable WRITING intent or a production adapter. No production attempt exists to retry.

For future Website revisions, edit the manifest and exact media only under matching owner authority, rerun preparation against freshly observed previous landing/deployment, review the resulting immutable plan, and use the eventual guarded activation writer. A manifest edit is not itself evidence of approval. Do not pass this Website-only plan as a social `LandingPlan`: social hash and media array remain separate adapter inputs.

## Production baseline preservation

Reconciled source without a new checkout or commit: restored only clean runtime/test paths from observed production commit821e2a4 using `git restore --source origin/main --worktree`. These are api/sitemap.js; lib/dude-product-route.js, google-product-feed.js, product-policies.js, shopify-catalog.js; and the associated discovery/pagination/product/feed tests. Also brought its absent AGENTS.md and commerce reference into this checkout, then appended only this task's facts to the reference. Those runtime changes are exactly the already-deployed source, not newly proposed policy work. HEAD remains5c1eea9; inherited README and historical tracker files remain byte-preserved. No commits, index changes or resets.

Task feature scope: merch.html, merch.css, lib/dude-merch-route.js, lib/current-drop.js, lib/current-drop.json, assets/drops/drop-000-wear-the-signal.jpg, scripts/prepare-merch-template.js, scripts/prepare-current-drop.js, scripts/test-current-drop.js; evidence here and the commerce-reference addition. Existing Vercel build/rewrites remain in use. Existing .vercelignore excludes local preparation scripts, gates and historical dirty files; the build helper remains included. The source must be rechecked against current production again before activation.

## Browser and review evidence

September11 CUA in-app browser, viewport390×844: local SSR feature with live public catalog GET; exact full JPEG loads at natural1080×1350. Screenshot visually verifies original front/back tee artwork and complete framing, readable neutral copy and CTA. DOM width390 equals viewport390, no horizontal overflow. Catalog JS renders11cards. “Choose your size” actually navigated to public canonical https://www.dudemcgee.com/products/unisex-t-shirt; heading identifies Digital Fauna Signal Tee - DM Logo - Black, available checkout, nine sizes. Choosing M selected URL variant53699578954035. No checkout or purchase performed. Back navigation and “Browse the full catalog” verified11named products including earlier Digital Fauna/HeartWave/Neon Leaf items. Viewport override reset. This is **local feature → public product** evidence; neither a deployed feature nor profile-link traversal is claimed.

One solo bounded adversarial review traced actual rendering, manifest identity, escaping, canonical/product match, sold-out/removed paths, catalog preservation, exact media, stale preparation, crash/conflict behavior and deployment scope. Found missing build-time media verification and ambiguous listingRevision marker naming; fixed both in one repair cycle. Build tests exercise matching media success and tampered-media failure before template removal. No remaining blocker in the local preparation/rendering subset. Full acceptance still blocked at W4; fixture or local checks do not satisfy it.

Checks passed: current-drop regression/build checks; SSR discovery; catalog pagination; product route/schema/browser behavior; feed; measurement/attribution/cart API; catalog detail/order checks; local SEO and artist identity; git diff --check. Tests distinguish exact identity from availability and keep earlier catalog entries. No social source, operational database, composers, profile, settings, credential, message or schedule touched.

## Activation and rollback prerequisite — incomplete

The existing Vercel promotion API exposes no expected-current revision guard. Do not replace that requirement with a local lock, a GET-then-promote sequence, a Git push, or post-deployment detection. Need an authorized remote atomic compare-and-swap writer or remotely enforced exclusive deployment path covering all writers. Provisioning storage/services/credentials or broadening access is outside this task, and none was done. This is a technical prerequisite, not a request to reauthorize the already-approved Website deployment.

Once a supported mechanism exists: integrate it with the existing social LandingState contract; persist and retrieval-verify WRITING before its first provider call; pass the expected remote revision atomically; preserve operation/deployment IDs and previous revision. Uncertain response/readback leaves WRITING/UNCERTAIN blocking further writes, reconcile that operation before any retry. Mark VERIFIED only after full public feature/media/product/availability readback and browser validation. Never automatically roll back an uncertain result.

Rollback preparation is saved in `featured-drop-rollback.json`: known previous deployment and planned expected feature revision. It is a proposal only. After separate rollback authority and the same remote concurrency prerequisite, persist rollback intent, restore the exact previous deployment, verify its public output, and append evidence without erasing any successful activation. No previous deployment was deleted or mutated.

Remaining social wiring: approved real Campaign Package → Website plan/activation bridge; returned actual Website landing revision in separately approved bio binding; actual installed public @thedudemcgee link/title → feature → product traversal; refreshed preflight near scheduling; exact caption/schedule approval and one combined Business Suite route. No automatic/background publisher is activated here.

Historical abandoned result: W4 No authorized remote concurrency primitive established in the existing Vercel deployment seam. Production activation, durable WRITING lifecycle, deployed browser/readback and rollback execution remain incomplete; do not report a deployed integration.

Final checker: exact owning file with --timeout60 reports3met/1abandoned. W4 remains incomplete despite the helper’s “ALL MET” label. Source SHA256 snapshot: featured-drop-source.json. No deployment or live activation claimed.

## Owner requested blocker resolution — September 11

Reopened W4 investigation after “Let’s address the blockers please.” Production/main unchanged. Existing authenticated Storage UI shows no Website store; only unrelated bass-binge-catalog is offered. CLI credential expiry inspected without values; no refresh performed. Feature regression and diff checks pass.

[Concrete unblock proposal](featured-drop-unblock.md) replaces deployment-based campaign selection with a dedicated private Blob pointer guarded by provider ETag writes. It records exact store/project/region, no-paid-upgrade boundary, immutable attempt/rollback behavior, bootstrap limitation, proposed Keychain references and secure capture prerequisite. New service/credential authority remains required by the original explicit exclusions. This is prepared scope for approval, not a provisioned adapter or completed W4. Previous abandoned gate entry remains historical evidence of the first turn's boundary.

## Approved unblock execution

Owner said Yes to the dedicated store and necessary credential setup, retaining the current plan/no paid upgrade. Approval covers the exact unblock proposal, including guarded data activation and supervised reader bootstrap. Using Vercel storage guidance with the existing Unlazy/Ponytail workflow. Keychain preflight proved unlocked/readable/writable default Keychain and absent proposed references. OAuth refresh captured access and replacement refresh credentials through native private pipes and retrieval-match verified both before any API use. Safe service `com.dudemcgee.website.vercel.production`, accounts `870dudemcgee.cli-access.v01` and `870dudemcgee.cli-refresh.v01`; nonsecret inventory saved. Existing CLI config remains unchanged; no automatic CLI refresh.

Before Blob creation, additionally reserve `featured-drop-store.provisioning-response.v01` under the same service for the complete in-memory provisioning response, so every issued field can be persisted immediately before extracting provider metadata. Its exact response is secret vault material, never ordinary evidence. The read-write credential, if returned, additionally uses the approved `featured-drop-store.read-write.v01` reference.

## Live adapter acceptance review

Dedicated private store and production connection are now provisioned under owner approval. Keychain and production token copies were retrieval-match verified. Live provider probe v2 proves stale ETag and duplicate creation rejection with winner preserved. Reviewed native fetch protocol, fixed-path secret handling, durable intent before writes, immutable media/revision/receipt storage, pending-state guards, no blind retries, honest catalog-only storage failure, public media byte verification and release scope. Fixed local invalid-path error masking; targeted failure tests pass. Supervised Git bootstrap preserves origin/main and does not claim deployment-promotion CAS. Current activation still absent before bootstrap. Supported operations: docs/featured-drop.md.

## Final approved execution — September 11

W4 completed through the explicitly approved Blob data-selection mechanism. Bootstrap source 47b3114d0d1cb60fd3f057c15234fe5b15f9b382 deployed READY as dpl_8LBbjKreCYajmsam7WbbxxUSUM9w, preserving production parent 821e2a4 via an alternate index without modifying the saved checkout HEAD or inherited dirty work. No paid upgrade.

First activation saved local and remote WRITING, plus exact immutable media and manifest. Commit rejected HTTP412 because compressed JSON returned a weak ETag. Reconciliation proved current still exactly that WRITING intent and no live selection; original attempt was not repeated. Identity-encoding GET returned the provider strong ETag. Added a bounded recovery command that verifies exact local/remote intent, listing and existing immutable objects and saves exclusive recovery intent before CAS continuation. Commit succeeded, public HTTP matched full manifest/product/media, and CUA verified mobile390×844, width390 with no overflow, original1080×1350image,11catalog cards, exact CTA product and selected M variant53699578954035. Finalize stored immutable success receipt and CAS-cleared pending. Weak ETag regression test added.

Activation c6206d8556a9a38b07654624c94d0e86339df68263522fb07a5e269ba57b21df; Website revision website-sha256:46f8b3f1c97b52dfd3f39c1a5925b9700a6b7fcd65597669007ae308bc294b00. Evidence: featured-drop-bootstrap.json; featured-drop-connection.json; featured-drop-credential-inventory.json; featured-drop-operations/provider-probe-v2.json; public-browser.json; activation recovery, HTTP and verified records. Exact earlier deployment rollback proposal retained; no rollback executed or prior successful feature invented. Supervised deployment changes remain distinct from the campaign CAS guard.

Earlier blocked/abandoned paragraphs are chronological history superseded by owner approval and this verification. Remaining social package bridge/profile/scheduling work remains separate and untouched.
