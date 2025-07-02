import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Token details interface
interface TokenDetailsConfig {
  secret?: string;
  subject: string;
  issuer: string;
  audience: string;
  expiresIn: number;
  tokenType: string;
  generatedAt?: string;
}

// File paths
const TOKEN_DETAILS_FILE = path.join(__dirname, 'token-details.json');
const OUT_DIR = path.join(__dirname, 'out');

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Get the next available file index
function getNextFileIndex(): number {
  const files = fs.readdirSync(OUT_DIR);
  const tokenFiles = files.filter(
    (file) => file.startsWith('token-details-') && file.endsWith('.json'),
  );
  if (tokenFiles.length === 0) {
    return 1;
  }
  const indices = tokenFiles.map((file) => {
    const match = file.match(/token-details-(\d+)\.json/);
    return match ? parseInt(match[1], 10) : 0;
  });
  return Math.max(...indices) + 1;
}

// Always generate a new secret and token, using config as template
function createTokenFile(): void {
  // Check if token-details.json exists
  if (!fs.existsSync(TOKEN_DETAILS_FILE)) {
    console.error(
      'Error: token-details.json not found in the current directory',
    );
    process.exit(1);
  }

  // Read the config template
  const tokenDetailsContent = fs.readFileSync(TOKEN_DETAILS_FILE, 'utf8');
  const template = JSON.parse(tokenDetailsContent) as {
    config: TokenDetailsConfig;
  };
  const config = template.config;

  // Generate new secret
  const secret = crypto.randomBytes(64).toString('hex');

  // Prepare payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: config.subject,
    iss: config.issuer,
    aud: config.audience,
    iat: now,
    exp: now + config.expiresIn,
    type: config.tokenType,
  };

  // Generate token
  const token = jwt.sign(payload, secret);

  // Get the next file index
  const fileIndex = getNextFileIndex();
  const outputFileName = `token-details-${fileIndex}.json`;
  const outputPath = path.join(OUT_DIR, outputFileName);

  // Create output with actual token and secret
  const outputData = {
    config: {
      ...config,
      secret: secret,
      generatedAt: new Date().toISOString(),
    },
    token: token,
    generatedAt: new Date().toISOString(),
    fileIndex: fileIndex,
  };

  // Write the output file
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

  console.log(`\n✅ Token file created successfully!`);
  console.log(`📁 Output file: ${outputPath}`);
  console.log(`🔢 File index: ${fileIndex}`);
  console.log(`📅 Generated at: ${outputData.generatedAt}`);

  console.log('\n📋 Token Details:');
  console.log('- Subject: ' + config.subject);
  console.log('- Issuer: ' + config.issuer);
  console.log('- Audience: ' + config.audience);
  console.log('- Expires In: ' + config.expiresIn / (24 * 60 * 60) + ' days');
  console.log('- Token Type: ' + config.tokenType);

  console.log('\n🔐 Security Notes:');
  console.log(
    '- Token and secret are included in output files (out/ folder is gitignored)',
  );
  console.log('- Store the secret in Azure Key Vault for production use');
  console.log('- Key Vault secret name: auth--secret');
  console.log('- Config path: auth.secret');
}

createTokenFile();
