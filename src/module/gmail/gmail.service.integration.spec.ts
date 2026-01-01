import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { AppConfigService } from '../config/config.service';

describe('Gmail Integration Tests (Real Email)', () => {
  let service: GmailService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        GmailService,
        {
          provide: AppConfigService,
          useValue: {
            getConfig: jest.fn().mockReturnValue({
              googleApis: {
                email: {
                  serviceAccountJsonKeyFilePathname:
                    'src/assets/gmail/auth/constantcontact2-1034-d1a0ae8c30a2.json',
                  userEmail: 'adam.cox@vorba.com',
                  senderName: 'Adam Cox (Vorba)',
                  scopes: [
                    'https://www.googleapis.com/auth/gmail.send',
                    'https://www.googleapis.com/auth/gmail.compose',
                    'https://www.googleapis.com/auth/gmail.modify',
                    'https://www.googleapis.com/auth/gmail.readonly',
                  ],
                },
              },
            }),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GmailService>(GmailService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Real Gmail API Integration', () => {
    // Skip these tests by default - only run when explicitly needed
    // Remove .skip to run actual integration tests

    it('should send real email using environment credentials', async () => {
      // This test requires real Gmail credentials in environment variables:
      // GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI, GMAIL_REFRESH_TOKEN

      const testEmail =
        process.env.INTEGRATION_TEST_EMAIL || 'your-email@example.com';
      const timestamp = new Date().toISOString();

      console.log(`📧 Sending integration test email to: ${testEmail}`);

      // Use configured userEmail from config - should be adam.cox@vorba.com
      const fromEmail = 'adam.cox@vorba.com';

      const result = await service.sendSimpleEmail(
        fromEmail,
        testEmail,
        `Gmail Integration Test - ${timestamp}`,
        `
        🧪 Gmail Service Integration Test
        
        This is a real email sent from your Gmail service integration test.
        
        Test Details:
        - Timestamp: ${timestamp}
        - Service: GmailService
        - Method: sendSimpleEmail()
        
        If you received this email, your Gmail integration is working correctly! ✅
        
        You can safely delete this test email.
        `,
        false,
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();

      console.log('✅ Integration test email sent successfully!');
      console.log(`📬 Message ID: ${result.messageId}`);
      console.log(`📧 Check your inbox at: ${testEmail}`);
    }, 30000); // 30 second timeout

    it.skip('should send HTML email with formatting', async () => {
      const testEmail =
        process.env.INTEGRATION_TEST_EMAIL || 'your-email@example.com';
      const timestamp = new Date().toISOString();

      console.log(`📧 Sending HTML integration test email to: ${testEmail}`);

      const result = await service.sendSimpleEmail(
        'adam.cox@vorba.com',
        testEmail,
        `HTML Gmail Test - ${timestamp}`,
        `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #4CAF50;">🧪 Gmail HTML Integration Test</h1>
              
              <p>This is a <strong>real HTML email</strong> sent from your Gmail service integration test.</p>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Test Details:</h3>
                <ul>
                  <li><strong>Timestamp:</strong> ${timestamp}</li>
                  <li><strong>Service:</strong> GmailService</li>
                  <li><strong>Method:</strong> sendSimpleEmail() with HTML</li>
                </ul>
              </div>
              
              <p style="color: #4CAF50;">
                ✅ If you received this email, your Gmail HTML integration is working correctly!
              </p>
              
              <hr style="margin: 20px 0; border: 1px solid #eee;">
              
              <p style="font-size: 12px; color: #666;">
                This is an automated integration test email. You can safely delete it.
              </p>
            </div>
          </body>
        </html>
        `,
        true, // HTML format
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();

      console.log('✅ HTML integration test email sent successfully!');
      console.log(`📬 Message ID: ${result.messageId}`);
      console.log(`📧 Check your inbox at: ${testEmail}`);
    }, 30000);

    it.skip('should test Gmail connection', async () => {
      console.log('🔌 Testing Gmail API connection...');

      const isConnected = await service.testConnection();

      expect(isConnected).toBe(true);

      console.log('✅ Gmail API connection successful!');
    }, 15000);

    it.skip('should send password reset email integration test', async () => {
      const testEmail =
        process.env.INTEGRATION_TEST_EMAIL || 'your-email@example.com';
      const tempPassword = 'TempPass123!';
      const resetToken = 'test-reset-token-' + Date.now();

      console.log(
        `🔐 Sending password reset integration test to: ${testEmail}`,
      );

      // Set required environment variables for the test
      process.env.APP_BASE_URL = 'http://localhost:3000';
      process.env.SYSTEM_EMAIL = 'adam.cox@vorba.com';

      const result = await service.sendPasswordResetEmail(
        testEmail,
        tempPassword,
        resetToken,
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();

      console.log('✅ Password reset integration test email sent!');
      console.log(`📬 Message ID: ${result.messageId}`);
      console.log(`🔑 Temporary Password: ${tempPassword}`);
      console.log(`🔗 Reset Token: ${resetToken}`);
      console.log(`📧 Check your inbox at: ${testEmail}`);

      // Clean up
      delete process.env.APP_BASE_URL;
      delete process.env.SYSTEM_EMAIL;
    }, 30000);
  });

  describe('Integration Test Setup Instructions', () => {
    it('should display setup instructions', () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   Gmail Integration Test Setup                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║ To run real Gmail integration tests:                         ║
║                                                              ║
║ 1. Set up Gmail OAuth2 credentials:                         ║
║    - Go to Google Cloud Console                              ║
║    - Enable Gmail API                                        ║
║    - Create OAuth2 credentials                               ║
║                                                              ║
║ 2. Set environment variables:                                ║
║    GMAIL_CLIENT_ID=your_client_id                           ║
║    GMAIL_CLIENT_SECRET=your_client_secret                   ║
║    GMAIL_REDIRECT_URI=http://localhost:3000/callback        ║
║    GMAIL_REFRESH_TOKEN=your_refresh_token                   ║
║    GMAIL_FROM_EMAIL=your-sender@gmail.com                   ║
║    INTEGRATION_TEST_EMAIL=your-test-recipient@gmail.com     ║
║                                                              ║
║ 3. Remove .skip from test methods above                      ║
║                                                              ║
║ 4. Run integration tests:                                    ║
║    npm test -- --testMatch="**/*.integration.spec.ts"       ║
║                                                              ║
║ 5. Check your email inbox for real test emails! 📧          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);

      expect(true).toBe(true); // This test always passes, just shows instructions
    });
  });
});
