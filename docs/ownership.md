# Ownership decision

Life OS is a single-owner installation. The database sign-in account
(`credential_id = 1`), browser sessions, API token, state documents, habits and
attachments belong to that owner. Changing credentials changes the owner's
sign-in details; it does not create a new account or transfer data. Separate
owners must use separate deployments and databases.

This is the explicit scope decision for #19. Multi-user support is a separate
schema and authorization project, rather than a column added without isolation.
The Gmail integration (#12) must initially be owner-only. Before accepting
multiple accounts, it requires:

* Stable user IDs with user-scoped credentials, sessions and API tokens.
* Owner keys on state, habits, categories, logs and attachments, with ownership
  enforced in every read, write, relationship and file download.
* OAuth credentials stored per owner, with encryption and revocation, and tests
  proving one owner cannot read or mutate another owner's data.
* A backed-up migration assigning existing records to the installation owner,
  preserving their IDs and content, with a rollback plan.

Until that project is implemented, no endpoint promises per-user isolation.
