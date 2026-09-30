# Technical Debt

## Passwords Stored and Compared in Plaintext

### Current Status
- **Issue**: `UserEntity.passwordHash` holds raw passwords, not hashes
- **Severity**: High — blocks production launch
- **Location**: `src/module/auth/auth.service.ts`, `validatePassword()`

### What Is Wrong
The field is named `passwordHash`, but nothing hashes it. Validation is a direct
string comparison:

```typescript
if (user.passwordHash !== password) {
```

Registration writes the value straight through, and `passwordReset()` writes a
generated temp password the same way. Anyone able to read the user collection can
read every password, and those passwords are likely reused on other sites.

Soft-registered survey accounts are not exposed in practice, because their value
is `pending:<32 random bytes>` and is never sent to the user. The risk applies to
accounts where a person chose the password.

### Future Tasks
- [ ] Hash with argon2id (or bcrypt) on registration and password reset
- [ ] Replace the equality check with a verify call from the same library
- [ ] Migrate existing rows: force reset, or rehash on next successful login
- [ ] Remove the plaintext temp-password log in `passwordReset()`
- [ ] Keep the `pending:` prefix meaningful after hashing, so soft-registered
      accounts can still be detected (store a separate flag rather than relying on
      the stored credential's shape)

### Related
- `src/module/auth/README.md` — soft registration and account reclaim design

## Key Vault Authentication Bypass

### Current Status
- **Issue**: Key Vault authentication is failing with IMDS endpoint errors
- **Temporary Solution**: Using `AZURE_STORAGE_CONNECTION_STRING` environment variable as fallback
- **Location**: `src/config/config.service.ts` lines 35-42

### What Was Done
1. Added environment variable check before Key Vault resolution
2. If `AZURE_STORAGE_CONNECTION_STRING` is present, use it directly
3. Only attempt Key Vault if environment variable is not available
4. Added graceful fallback logging

### Code Changes
```typescript
// TEMPORARY BYPASS: Check for environment variable first
// TODO: Remove this bypass once Key Vault authentication is working properly
const envConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (envConnectionString && config.storage.type === 'azure') {
  logger.info('Using AZURE_STORAGE_CONNECTION_STRING from environment variable (Key Vault bypass)');
  config.storage.azure.connectionString = envConnectionString;
  logger.info('Storage connection string loaded from environment variable');
}
```

### Future Tasks
- [ ] Fix Key Vault Managed Identity authentication
- [ ] Remove environment variable bypass
- [ ] Ensure all secrets are properly stored in Key Vault
- [ ] Add proper error handling for Key Vault failures

### Security Considerations
- Environment variables are encrypted at rest in Azure App Service
- This is a temporary solution for development/testing
- Production should use Key Vault for all secrets

### Related Issues
- IMDS endpoint not available error
- Managed Identity authentication chain issues
- Azure environment variable interference with authentication

### Notes
- The bypass only affects storage connection string
- Auth secrets still attempt to load from Key Vault
- Key Vault infrastructure remains in place for future use 