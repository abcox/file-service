const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Gmail OAuth Setup Script
 * 
 * This script helps you get the refresh token needed for Gmail OAuth authentication.
 * 
 * Steps:
 * 1. Run this script: node scripts/auth/gmail-oauth-setup.js
 * 2. Follow the authorization URL in your browser
 * 3. Authorize the application
 * 4. Copy the authorization code back to this script
 * 5. Script will output your refresh token
 * 6. Add the refresh token to your environment variables
 */

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify'
];

const CREDENTIALS_PATH = path.join(__dirname, '../../src/assets/gmail/auth/client_secret_202373718938-ib0soh3d3hdoomm0s15dt0b8apkcrgkf.apps.googleusercontent.com.json');

async function getRefreshToken() {
  try {
    console.log('🔧 Gmail OAuth Setup');
    console.log('==================');
    
    // Load OAuth credentials
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.error(`❌ OAuth credentials file not found: ${CREDENTIALS_PATH}`);
      console.log('Please ensure you have downloaded the OAuth credentials JSON file.');
      process.exit(1);
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_id, client_secret, redirect_uris } = credentials.web || credentials.installed;

    const oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent' // Force consent screen to get refresh token
    });

    console.log('📋 Step 1: Authorize this app by visiting the following URL:');
    console.log('');
    console.log(authUrl);
    console.log('');
    console.log('📋 Step 2: After authorization, copy the authorization code from the callback URL');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('📝 Paste the authorization code here: ', async (code) => {
      rl.close();
      
      try {
        const { tokens } = await oauth2Client.getToken(code);
        
        console.log('');
        console.log('✅ Success! Your refresh token is:');
        console.log('');
        console.log(tokens.refresh_token);
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Add this to your environment variables:');
        console.log(`   GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('');
        console.log('2. Or add to your .env file:');
        console.log(`   GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('');
        console.log('3. Run your Gmail integration test:');
        console.log('   npm run test:gmail-integration');
        
      } catch (error) {
        console.error('❌ Error getting refresh token:', error);
      }
    });

  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

getRefreshToken();