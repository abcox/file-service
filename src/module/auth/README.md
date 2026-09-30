# Auth Module

## Soft registration and account reclaim

### Intent

A visitor starts the survey by supplying only a name and email. We want to keep
whatever they produce (survey answers, uploaded files, generated reports) without
asking them to choose a password up front, and without letting anyone else reach
that data later by typing the same email address.

The approach is a **soft-registered account**: a real user record with a password
nobody knows, including the account owner. The owner claims the account later by
proving control of the email address.

### What happens today

`register()` in `auth.service.ts`:

1. Looks up the email. If a user already exists, it returns
   `requiresAuthentication: true` with **no tokens** and no password check. The
   client then opens the sign-in dialog with the email prefilled.
2. If the email is new, it creates the user with
   `passwordHash = pending:<32 random bytes as hex>` and `roles: ['guest']`, then
   issues a normal access/refresh token pair.

The `pending:` prefix marks the account as never having had a
user-chosen password. The random suffix means no password can succeed against it,
so the account cannot be entered except through a reclaim flow.

The guest is fully authenticated for that session. This is deliberate: they need a
token to run the survey and upload files. The protection is that the session is the
only way in, and it cannot be re-established by re-entering the email.

### Why the duplicate-email branch matters

Before this change, submitting an existing user's email returned a valid token
pair. Anyone who knew a registered email could take over that account. The
`requiresAuthentication` branch closes that hole: an existing email can only ever
lead to sign-in.

### The missing half: reclaim

A soft-registered user has no way to get back in. They never had a password, so
"forgot password" is the natural route, but the current `passwordReset()` does not
implement the intended flow. It currently:

- generates a 12-character temp password,
- writes it into `passwordHash`,
- logs it in plaintext via `logger.log`,
- emails it to the address.

The intended flow is:

1. User enters their email and requests a code.
2. Service emails a short, single-use, expiring code. The response is generic
   whether or not the account exists, so the endpoint cannot be used to discover
   which emails are registered.
3. User submits the code plus a new password and confirmation.
4. On success, the password is set, the `pending:` marker is cleared, the role is
   promoted from `guest`, and a token pair is returned so the user lands back in
   their session.

Rate limiting and a hashed, single-use code stored server-side are required for
step 2 and 3.

### Known gaps

- **Passwords are not hashed.** `validatePassword()` compares
  `user.passwordHash !== password` directly. The field name is misleading; values
  are stored as plaintext. Soft-registered accounts are unaffected in practice
  because their value is random and never transmitted, but real passwords are
  exposed to anyone who can read the datastore. Tracked in
  `docs/TECHNICAL_DEBT.md`.
- **`passwordReset()` logs the temp password.** Remove that log regardless of
  which reset design wins.
- **No terms acceptance.** The survey start form collects name, email, and a
  newsletter opt-in. If soft registration is meant to be gated on accepting terms,
  that checkbox still needs to be added and recorded on the user.
- **Nothing consumes the `pending:` marker.** Login does not distinguish a
  never-set password from a wrong one, so the user gets a generic "Invalid
  password" rather than a prompt to claim the account.

### Where this is heading

Once reclaim works, the same account record becomes the anchor for returning-user
experience: showing prior survey state, past generated reports, and any further
offers tied to that email. Keeping the guest record from the first interaction is
what makes that continuity possible, so the reclaim flow is the prerequisite for
all of it.

### Related client code

- `vorba-web/src/module/survey/feature/quiz-start-page/` — start form, "Already
  started a survey?" sign-in link.
- `vorba-web/src/app/core/auth/auth.service.ts` — `register()` returns the full
  response so the caller can branch on `requiresAuthentication`.
- `vorba-web/src/app/component/dialog/login-dialog/` — accepts a prefill email.
