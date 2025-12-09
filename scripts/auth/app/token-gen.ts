import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Token details interface
interface TokenConfig {
  claims: Record<string, any>;
  generatedAt?: string;
  secret?: string;
  token?: string;
}

// Get command line arguments with defaults
const args = process.argv.slice(2);
const tokenId = args[0] || '3'; // ***** CHANGE ME! *****
const tokenSubject = args[1] || 'token';

// File paths
const TOKEN_TEMPLATE_FILE = path.join(__dirname, 'token.json');
const TOKEN_OUTPUT_FILE = path.join(
  __dirname,
  'token',
  `token-${tokenId}.json`,
);
const TOKEN_OUTPUT_DIR = path.join(__dirname, 'token');

// Ensure output directory exists
if (!fs.existsSync(TOKEN_OUTPUT_DIR)) {
  fs.mkdirSync(TOKEN_OUTPUT_DIR, { recursive: true });
}

function generateToken(): void {
  // Check if token template exists
  if (!fs.existsSync(TOKEN_TEMPLATE_FILE)) {
    console.error('Error: token.json template not found');
    process.exit(1);
  }

  // Read the template
  const templateContent = fs.readFileSync(TOKEN_TEMPLATE_FILE, 'utf8');
  const template = JSON.parse(templateContent) as TokenConfig;

  // Check if output file exists and has a secret
  let existingSecret = '';
  if (fs.existsSync(TOKEN_OUTPUT_FILE)) {
    try {
      const existingContent = fs.readFileSync(TOKEN_OUTPUT_FILE, 'utf8');
      const existing = JSON.parse(existingContent) as TokenConfig;
      existingSecret = existing.secret || '';
    } catch {
      console.warn(
        'Warning: Could not read existing token file, will generate new secret',
      );
    }
  }

  // Generate or reuse secret
  const secret = existingSecret || crypto.randomBytes(64).toString('hex');
  const isNewSecret = !existingSecret;

  // Prepare payload from template claims
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    ...template.claims,
    sub: tokenSubject,
    id: tokenId,
    iat: now,
    exp: (template.claims.exp as number) || now + 365 * 24 * 60 * 60, // Default 1 year
  } as Record<string, any>;

  // Generate token
  const token = jwt.sign(payload, secret);

  // Create output data
  const outputData: TokenConfig = {
    claims: template.claims,
    secret: secret,
    token: token,
    generatedAt: new Date().toISOString(),
  };

  // Write the output file
  fs.writeFileSync(TOKEN_OUTPUT_FILE, JSON.stringify(outputData, null, 2));

  console.log(`\nToken generated successfully!`);
  console.log(`Token ID: ${tokenId}`);
  console.log(`Subject: ${tokenSubject}`);
  console.log(`Output file: ${TOKEN_OUTPUT_FILE}`);
  console.log(`Generated at: ${outputData.generatedAt}`);
  console.log(`Secret: ${isNewSecret ? 'Generated new' : 'Reused existing'}`);

  console.log('\nToken Details:');
  console.log('- Subject: ' + payload.sub);
  console.log('- ID: ' + payload.id);
  console.log('- Type: ' + payload.type);
  console.log('- Expires: ' + new Date(payload.exp * 1000).toISOString());

  if (payload.aud) {
    console.log(
      '- Audience: ' +
        (Array.isArray(payload.aud) ? payload.aud.join(', ') : payload.aud),
    );
  }

  if (payload.roles) {
    console.log(
      '- Roles: ' +
        (Array.isArray(payload.roles)
          ? payload.roles.join(', ')
          : payload.roles),
    );
  }

  if (payload.permissions) {
    console.log(
      '- Permissions: ' +
        (Array.isArray(payload.permissions)
          ? payload.permissions.join(', ')
          : payload.permissions),
    );
  }

  console.log('\nSecurity Notes:');
  console.log('- Token and secret are included in output file');
  console.log('- Store the secret in Azure Key Vault for production use');
  console.log('- Key Vault secret name: auth--secret');
  console.log('- Config path: auth.secret');
}

generateToken();
