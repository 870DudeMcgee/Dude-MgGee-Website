# Project operating knowledge

Before investigating merchandise, shipping, returns, Merchant Center, or Google
product visibility, read [the commerce reference](docs/commerce-reference.md).
It contains previously verified facts, source locations, account/profile IDs,
verification dates, and the specific unresolved questions.

Reuse recorded facts. Reopen a settled policy only when the owner changes it,
the relevant product/profile changes, a live result contradicts it, or the task
explicitly calls for a current audit. A new session or a Google warning alone
is not a reason to repeat the entire policy investigation. Check the affected
product's mapping or the deployed output first.

Update that reference in the same change that establishes or changes a fact.
Keep current facts separate from historical logs, code/deployment status, and
Google processing status. Link the reference in handoffs; include these files
when transferring unfinished work to another checkout. Never store secrets here.

For this cross-brand recovery, Bass facts are indexed in the same reference;
its source repository remains authoritative for Bass implementation. Do not
overwrite that repository's existing owner changes.
