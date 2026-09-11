# Featured-drop operations

The production reader selects the manifest from the dedicated private Vercel Blob store `store_rGUzebC3ZZPfZxVr`. Campaign selection is a conditional ETag write, independent of deployment promotion. The owner approved the supervised reader bootstrap; Vercel administrator deployment changes are outside this data-write guard.

Run from the saved Website checkout:

```sh
python3 scripts/run-featured-drop.py reconcile
python3 scripts/run-featured-drop.py activate none
python3 scripts/run-featured-drop.py finalize gates/merch-pilot/featured-drop-operations/public-browser.json
```

`activate none` is only for the first activation. Later activations require the exact observed `website-sha256:` revision and a separately authorized manifest. Never repeat an activation with an existing local intent. Reconcile first. Pending WRITING or READBACK blocks another activation; uncertain WRITING requires operator investigation of the saved intent, remote pointer and immutable objects before a separately reviewed recovery. There are no automatic write retries. Finalize requires actual fresh browser evidence and repeats the public HTTP checks before retaining an immutable success receipt and clearing pending through CAS.

The wrapper reads the verified Keychain service `com.dudemcgee.website.vercel.production`, account `featured-drop-store.read-write.v01`, through private pipes. Production uses the approved encrypted `BLOB_READ_WRITE_TOKEN` environment copy. No secrets belong in commands, evidence, environment files or Git. The existing native Keychain helper path is recorded in the wrapper support module; it is used read-only and must be available on the operator Mac.

The isolated live provider probe already verified stale ETag and duplicate-create rejection. Do not rerun provisioning, connection or probe scripts to troubleshoot. Their durable records describe the completed operations. The older `prepare-current-drop.js` is preparation-only and its immutable blocked plan is historical; it does not activate production.

Rollback is proposal-only. `rollback-plan REVISION` requires a reconciled prior successful feature. This initial activation has no prior feature; its preserved preintegration Vercel deployment is recorded in `gates/merch-pilot/featured-drop-rollback.json`. Restoring that deployment requires separate rollback authority and supervisory checks; it does not have the Blob data CAS guarantee. Never automatically roll back an uncertain operation.

This manifest is Website-only. The social Campaign Package, profile binding and scheduling approval remain separate. See [commerce reference](commerce-reference.md) and [execution evidence](../gates/merch-pilot/featured-drop.md).

Recovery note: compressed JSON responses can carry weak transport ETags, which the conditional writer rejects. Reads request identity encoding and require a strong ETag. `resume-verified-intent` is a single reconciled continuation: it requires the unchanged local/remote WRITING intent and exact existing immutable objects, saves an exclusive recovery intent, and commits with the newly observed strong ETag. It cannot overwrite a changed remote intent or retry an existing recovery.
