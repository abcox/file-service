#!/usr/bin/env node

// Debug script for Gmail service account configuration
const fs = require('fs');
const path = require('path');

const serviceAccountPath = './src/assets/gmail/auth/constantcontact2-1034-d1a0ae8c30a2.json';

try {
  console.log('🔍 Gmail Service Account Debug Information\n');
  
  const credentials = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  console.log('📋 Service Account Details:');
  console.log(`   Project ID: ${credentials.project_id}`);
  console.log(`   Client Email: ${credentials.client_email}`);
  console.log(`   Client ID: ${credentials.client_id || 'MISSING!'}`);
  console.log(`   Private Key ID: ${credentials.private_key_id}`);
  
  // Extract client ID from client email if missing
  if (!credentials.client_id && credentials.client_email) {
    // For App Engine service accounts, client ID is often derived from the email
    console.log('\n⚠️  Client ID is missing from service account file');
    console.log('   This is required for domain-wide delegation');
    
    // Try to extract from the email format
    const emailParts = credentials.client_email.split('@');
    if (emailParts[1] === 'appspot.gserviceaccount.com') {
      console.log('   This appears to be an App Engine service account');
      console.log('   You may need to get the Client ID from Google Cloud Console');
    }
  }
  
  console.log('\n🔧 Domain-Wide Delegation Setup Required:');
  console.log('1. Go to Google Admin Console (admin.google.com)');
  console.log('2. Navigate to: Security → API Controls → Domain-wide Delegation');
  console.log('3. Add this service account with Client ID (not email)');
  console.log('4. Authorize these scopes:');
  console.log('   - https://www.googleapis.com/auth/gmail.send');
  console.log('   - https://www.googleapis.com/auth/gmail.compose');
  console.log('   - https://www.googleapis.com/auth/gmail.modify');
  
  console.log('\n📍 To find Client ID:');
  console.log('1. Go to Google Cloud Console');
  console.log('2. Navigate to: IAM & Admin → Service Accounts');
  console.log(`3. Find service account: ${credentials.client_email}`);
  console.log('4. Click on it and look for "Unique ID" - this is your Client ID');
  
} catch (error) {
  console.error('❌ Error reading service account file:', error.message);
}