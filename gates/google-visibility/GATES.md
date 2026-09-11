# Gates: Google product visibility investigation and plan
Scope: Read relevant email, establish current gaps, update repository documentation and deliver a reviewable Wayfinder plan; no production implementation.

- [x] G1: Relevant Google product and indexing warning emails read; search scope and findings recorded.
  EVIDENCE: evidence.md lists all 11 relevant messages from all-time in:anywhere searches with exhausted pagination, classifications and mailbox links.

- [x] G2: Prior completion evidence and current technical/account paths checked; unknowns distinguished from facts.
  EVIDENCE: evidence.md records authenticated September 11 Merchant and Search Console findings, full 55-page worker and parent sweeps, exact public catalog/feed counts, failed Bass export and unresolved discovery identities. Recognized, approved, indexed and impressions are distinct.

- [x] G3: Wayfinder map and implementation criteria cover every available product/variant, every issue including non-critical warnings, parity and recurrence.
  EVIDENCE: PLAN.md, map.md and six research records; one closed evidence classification and five explicitly open questions. Independent review corrections incorporated, including query boundaries, cross-brand capabilities, hidden add-ons, genuine reviews and post-sync domain checks.

- [x] G4: All original repository documentation reviewed and current-state corrections verified without rewriting historical outcomes.
  EVIDENCE: documentation-audit.md contains 51 original file dispositions. Parent measured 61 current Markdown files, 51 inventory entries, 0 broken local links; git diff --check passes. Pilot deployment and Bass published/verified policy corrections confirmed independently.

- [x] G5: Plan reviewed and handoff prepared for owner review before a separate implementation task.
  CHECK: python3 -c "from pathlib import Path; p=Path('gates/google-visibility'); assert all((p/f).is_file() for f in ['PLAN.md','map.md','evidence.md','documentation-audit.md']); assert '## New task handoff' in (p/'PLAN.md').read_text(); print('planning handoff PASS')"
  EXPECT: planning handoff PASS
  EVIDENCE: PLAN.md opened in Codex (queued) and linked in the final handoff. No implementation task, deployment, feed refresh, account setting or production code change performed.

Planning gate completion is not product visibility completion. The five open research questions, future implementation acceptance gates and Google processing outcomes remain open.
