# Gmail Authentication Analysis

## Current Issue: "Precondition check failed"

The Gmail service is failing with a 400 error: `Precondition check failed` when attempting to send emails using service account authentication.

## Root Cause Analysis

### Service Account Limitations
Service accounts in Gmail API have strict limitations:
1. **Cannot send emails on behalf of users** without domain-wide delegation
2. **Domain-wide delegation requires Google Workspace admin setup**
3. **Service accounts are designed for server-to-server communication**, not user impersonation

### Current Implementation Problem
- We're trying to use a service account (`service-account-1@constantcontact5.iam.gserviceaccount.com`)
- To send emails from `adam@adamcox.net` 
- Without proper domain-wide delegation setup
- This triggers the "Precondition check failed" error

## Comparison with .NET Implementation

**Need clarification from user:**
- Does your .NET implementation use OAuth2 user authentication?
- Or does it successfully use service accounts with domain-wide delegation?
- What authentication flow does your working .NET code use?

## Available Solutions

### Solution 1: OAuth2 User Authentication (Recommended)
```typescript
// Use OAuth2 to authenticate as the actual user (adam@adamcox.net)
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
```

**Pros:**
- No domain-wide delegation required
- User explicitly grants permission
- Matches typical Gmail API usage patterns

**Cons:**
- Requires OAuth2 setup and refresh token management
- User must authenticate at least once

### Solution 2: Domain-Wide Delegation Setup
For service accounts to work, you need:

1. **Google Workspace Admin Console setup:**
   - Add service account to domain-wide delegation
   - Grant Gmail scopes: `https://www.googleapis.com/auth/gmail.send`

2. **Code modification:**
   ```typescript
   const jwtClient = new google.auth.JWT({
     email: credentials.client_email,
     key: credentials.private_key,
     scopes: ['https://www.googleapis.com/auth/gmail.send'],
     subject: 'adam@adamcox.net' // The user to impersonate
   });
   ```

**Pros:**
- No user interaction required after setup
- Good for automated systems

**Cons:**
- Requires Google Workspace admin privileges
- More complex security setup
- Not available for personal Gmail accounts

### Solution 3: Send from Service Account Email
```typescript
// Send from service account's own email address
await gmail.users.messages.send({
  userId: 'me',
  requestBody: {
    raw: base64EncodedEmail // From: service-account-1@constantcontact5.iam.gserviceaccount.com
  }
});
```

**Pros:**
- Simpler setup
- No domain delegation required

**Cons:**
- Emails come from service account address (not user-friendly)
- May be blocked by spam filters

## Next Steps

1. **Clarify .NET implementation approach** - What authentication method works there?
2. **Choose appropriate solution** based on requirements:
   - If user interaction is acceptable → OAuth2
   - If domain admin access is available → Domain-wide delegation
   - If service account sender is acceptable → Service account email

## Test Results Summary

- ✅ Gmail API enabled
- ✅ Service account credentials loaded
- ✅ JWT authentication working
- ❌ **Service account lacks permissions to send on behalf of users**
- ❌ **Domain-wide delegation not configured**

The error `Precondition check failed` specifically indicates insufficient permissions for the requested operation.