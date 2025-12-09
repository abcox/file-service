import { google } from 'googleapis';
import * as path from 'path';

async function testDomainWideDelegation() {
  try {
    console.log('🔍 Testing Domain-Wide Delegation Setup');
    console.log('='.repeat(50));

    // Path to service account file
    const keyFilePath = path.resolve('./src/assets/gmail/auth/constantcontact2-1034-d1a0ae8c30a2.json');
    
    console.log('Service account file:', keyFilePath);
    console.log();

    // Create JWT client with same scopes as Gmail service
    const jwtClient = new google.auth.JWT({
      keyFile: keyFilePath,
      scopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.readonly'
      ],
      subject: 'adam.cox@vorba.com' // Domain user to impersonate
    });

    console.log('✅ JWT Client created successfully');
    console.log('Attempting to authorize...');

    // Try to authorize
    await jwtClient.authorize();
    console.log('✅ Authorization successful!');

    // Try to create Gmail service
    const gmail = google.gmail({ version: 'v1', auth: jwtClient });
    console.log('✅ Gmail service created successfully');

    // Try a simple API call
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log('✅ Gmail API call successful!');
    console.log('Email address:', profile.data.emailAddress);
    console.log('Messages total:', profile.data.messagesTotal);

    console.log();
    console.log('🎉 Domain-wide delegation is working correctly!');

  } catch (error) {
    console.error('❌ Domain-wide delegation test failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
    
    console.log();
    console.log('💡 Troubleshooting tips:');
    console.log('1. Verify domain-wide delegation is enabled for client_id: 112586962467534823545');
    console.log('2. Check scopes in Google Admin Console');
    console.log('3. Ensure adam.cox@vorba.com exists and has Gmail access');
    console.log('4. Wait up to 24 hours after setting up delegation');
  }
}

testDomainWideDelegation();