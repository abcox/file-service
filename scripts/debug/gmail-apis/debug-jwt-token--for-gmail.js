const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load service account
const serviceAccountPath = path.join(__dirname, '../../src/assets/gmail/auth/constantcontact2-1034-d1a0ae8c30a2.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

console.log('🔍 Debugging JWT Token Generation');
console.log('='.repeat(50));
console.log('Service Account Info:');
console.log('- Project ID:', serviceAccount.project_id);
console.log('- Client Email:', serviceAccount.client_email);
console.log('- Client ID:', serviceAccount.client_id);
console.log('- Private Key ID:', serviceAccount.private_key_id);
console.log('- Auth URI:', serviceAccount.auth_uri);
console.log('- Token URI:', serviceAccount.token_uri);
console.log();

// Create JWT payload
const now = Math.floor(Date.now() / 1000);
const exp = now + 3600; // 1 hour

const payload = {
  iss: serviceAccount.client_email,
  sub: 'adam.cox@vorba.com', // Domain user to impersonate
  scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.readonly',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: exp
};

console.log('JWT Payload:');
console.log(JSON.stringify(payload, null, 2));
console.log();

// Generate JWT
try {
  const token = jwt.sign(payload, serviceAccount.private_key, {
    algorithm: 'RS256',
    keyid: serviceAccount.private_key_id
  });
  
  console.log('✅ JWT Token Generated Successfully');
  console.log('Token length:', token.length);
  console.log('Token preview (first 100 chars):', token.substring(0, 100) + '...');
  
  // Decode header to verify
  const decoded = jwt.decode(token, { complete: true });
  console.log();
  console.log('JWT Header:');
  console.log(JSON.stringify(decoded.header, null, 2));
  console.log();
  console.log('JWT Payload (decoded):');
  console.log(JSON.stringify(decoded.payload, null, 2));
  
} catch (error) {
  console.error('❌ Error generating JWT:', error.message);
}

console.log();
console.log('🔍 Checking Domain-Wide Delegation Requirements:');
console.log('1. Service account client_id should be:', serviceAccount.client_id);
console.log('2. Domain admin should have authorized this client_id');
console.log('3. Scopes should include Gmail scopes');
console.log('4. Subject (sub) should be a valid domain user:', 'adam.cox@vorba.com');