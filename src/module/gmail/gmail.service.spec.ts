/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GmailService, MimeMessageRequest } from './gmail.service';
import { AppConfigService } from '../config/config.service';
import { google } from 'googleapis';
import * as fs from 'fs';

// Mock the googleapis module
jest.mock('googleapis', () => {
  const mockSendMessage = jest.fn();
  const mockGetProfile = jest.fn();
  const mockSetCredentials = jest.fn();
  const mockGenerateAuthUrl = jest.fn();
  const mockGetToken = jest.fn();
  const mockRefreshAccessToken = jest.fn();

  // Store mocks in global for later access
  (global as any).mockSendMessage = mockSendMessage;
  (global as any).mockGetProfile = mockGetProfile;

  return {
    google: {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => ({
          setCredentials: mockSetCredentials,
          generateAuthUrl: mockGenerateAuthUrl.mockReturnValue(
            'https://mock-auth-url.com',
          ),
          getToken: mockGetToken.mockResolvedValue({
            tokens: { access_token: 'mock-access-token' },
          }),
          refreshAccessToken: mockRefreshAccessToken.mockResolvedValue({
            credentials: { access_token: 'new-mock-token' },
          }),
        })),
        JWT: jest.fn().mockImplementation(() => ({
          authorize: jest.fn(),
        })),
        GoogleAuth: jest.fn().mockImplementation(() => ({
          getClient: jest.fn(),
        })),
      },
      gmail: jest.fn().mockReturnValue({
        users: {
          messages: {
            send: mockSendMessage,
          },
          getProfile: mockGetProfile,
        },
      }),
    },
  };
});

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Mock path module
jest.mock('path', () => ({
  resolve: jest.fn().mockReturnValue('/resolved/path'),
  basename: jest.fn().mockReturnValue('test.pdf'),
  extname: jest.fn().mockImplementation((filePath: string) => {
    if (filePath.includes('.jpg')) return '.jpg';
    if (filePath.includes('.txt')) return '.txt';
    if (filePath.includes('.pdf')) return '.pdf';
    return '.unknown';
  }),
}));

describe('GmailService', () => {
  let service: GmailService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      fatal: jest.fn(),
      options: {},
      registerLocalInstanceRef: jest.fn(),
      localInstance: {} as unknown,
    } as unknown as jest.Mocked<Logger>;

    // Mock config service with Gmail configuration
    const mockAppConfigService = {
      getConfig: jest.fn().mockReturnValue({
        gmailApis: {
          email: {
            serviceAccountJsonKeyFilePathname:
              './test/mock-service-account.json',
            userEmail: 'test@example.com',
            senderName: 'Test Sender (Test Org)',
            scopes: [
              'https://www.googleapis.com/auth/gmail.send',
              'https://www.googleapis.com/auth/gmail.compose',
              'https://www.googleapis.com/auth/gmail.modify',
              'https://www.googleapis.com/auth/gmail.readonly',
            ],
          },
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GmailService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
        {
          provide: AppConfigService,
          useValue: mockAppConfigService,
        },
      ],
    }).compile();

    service = module.get<GmailService>(GmailService);
    // Reset all mocks
    jest.clearAllMocks();
    ((global as any).mockSendMessage as jest.Mock).mockResolvedValue({
      data: { id: 'mock-message-id', threadId: 'mock-thread-id' },
    });
    ((global as any).mockGetProfile as jest.Mock).mockResolvedValue({
      data: { emailAddress: 'test@example.com' },
    });
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with null auth clients', () => {
      expect(service.getOAuth2Client()).toBeNull();
      expect(service.getServiceAuth()).toBeNull();
    });
  });

  describe('Gmail Service Creation', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          type: 'service_account',
          project_id: 'test-project',
          private_key:
            '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----',
          client_email: 'test@test-project.iam.gserviceaccount.com',
          client_id: '123456789',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
        }),
      );
    });

    it('should create Gmail service from credentials', () => {
      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
        refreshToken: 'test-refresh-token',
      };

      const gmailService =
        service.createGmailServiceFromCredentials(credentials);

      expect(gmailService).toBeDefined();
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        credentials.clientId,
        credentials.clientSecret,
        credentials.redirectUri,
      );
    });

    it('should create Gmail service from key file', () => {
      const keyFilePath = './test-credentials.json';

      const gmailService = service.createGmailServiceFromKeyFile(keyFilePath);

      expect(gmailService).toBeDefined();
      expect(fs.existsSync).toHaveBeenCalledWith('/resolved/path');
      // Note: fs.readFileSync is no longer called because JWT client handles file reading internally
      // The Gmail service object should have the users property (Gmail API)
      expect(gmailService.users).toBeDefined();
    });

    it('should throw error if key file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      expect(() => {
        service.createGmailServiceFromKeyFile('./nonexistent.json');
      }).toThrow('Service account key file not found');
    });

    it('should create Gmail service from environment variables', () => {
      process.env.GMAIL_CLIENT_ID = 'env-client-id';
      process.env.GMAIL_CLIENT_SECRET = 'env-client-secret';
      process.env.GMAIL_REFRESH_TOKEN = 'env-refresh-token';

      const gmailService = service.createGmailServiceFromEnv();

      expect(gmailService).toBeDefined();
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'env-client-id',
        'env-client-secret',
        'urn:ietf:wg:oauth:2.0:oob',
      );

      // Clean up
      delete process.env.GMAIL_CLIENT_ID;
      delete process.env.GMAIL_CLIENT_SECRET;
      delete process.env.GMAIL_REFRESH_TOKEN;
    });

    it('should throw error if required environment variables are missing', () => {
      delete process.env.GMAIL_CLIENT_ID;
      delete process.env.GMAIL_CLIENT_SECRET;

      expect(() => {
        service.createGmailServiceFromEnv();
      }).toThrow('Missing required Gmail OAuth2 environment variables');
    });
  });

  describe('MIME Message Composition', () => {
    let mockRequest: MimeMessageRequest;

    beforeEach(() => {
      mockRequest = {
        sender: { name: 'Test Sender', email: 'sender@example.com' },
        recipients: [{ email: 'recipient@example.com' }],
        subject: 'Test Subject',
        bodyHtml: '<h1>Test HTML</h1>',
        bodyPlainText: 'Test plain text',
      };
    });

    it('should compose MIME message successfully', () => {
      const mimeMessage = service['composeMimeMessage'](mockRequest);

      expect(mimeMessage).toContain('From: Test Sender <sender@example.com>');
      expect(mimeMessage).toContain('To: recipient@example.com');
      expect(mimeMessage).toContain('Subject: Test Subject');
      expect(mimeMessage).toContain('MIME-Version: 1.0');
    });

    it('should handle multiple recipients', () => {
      mockRequest.recipients = [
        { email: 'recipient1@example.com' },
        { email: 'recipient2@example.com' },
      ];

      const mimeMessage = service['composeMimeMessage'](mockRequest);

      expect(mimeMessage).toContain(
        'To: recipient1@example.com, recipient2@example.com',
      );
    });

    it('should encode non-ASCII subjects', () => {
      mockRequest.subject = 'Test Ñoño Subject 🚀';

      const mimeMessage = service['composeMimeMessage'](mockRequest);

      expect(mimeMessage).toMatch(/Subject: =\?utf-8\?B\?[A-Za-z0-9+/=]+\?=/);
    });

    it('should handle HTML-only messages', () => {
      delete mockRequest.bodyPlainText;

      const mimeMessage = service['composeMimeMessage'](mockRequest);

      expect(mimeMessage).toContain('Content-Type: text/html');
    });

    it('should handle plain text-only messages', () => {
      mockRequest.bodyHtml = '';
      mockRequest.bodyPlainText = 'Plain text only';

      const mimeMessage = service['composeMimeMessage'](mockRequest);

      expect(mimeMessage).toContain('Content-Type: text/plain');
    });
  });

  describe('Email Sending', () => {
    let mockRequest: MimeMessageRequest;

    beforeEach(() => {
      mockRequest = {
        sender: { email: 'sender@example.com' },
        recipients: [{ email: 'recipient@example.com' }],
        subject: 'Test Subject',
        bodyHtml: '<h1>Test</h1>',
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          type: 'service_account',
          client_email: 'test@test-project.iam.gserviceaccount.com',
          private_key:
            '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----',
        }),
      );
    });

    it('should send email successfully', async () => {
      const result = await service.sendEmail(mockRequest);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('mock-message-id');
      expect(result.threadId).toBe('mock-thread-id');
      expect((global as any).mockSendMessage).toHaveBeenCalled();
    });

    it('should handle send email errors', async () => {
      ((global as any).mockSendMessage as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      const result = await service.sendEmail(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error');
    });

    it('should send simple email', async () => {
      const result = await service.sendSimpleEmail(
        'sender@example.com',
        'recipient@example.com',
        'Simple Subject',
        'Simple body',
        false,
      );

      expect(result.success).toBe(true);
      expect((global as any).mockSendMessage).toHaveBeenCalled();
    });

    it('should send simple email to multiple recipients', async () => {
      const result = await service.sendSimpleEmail(
        'sender@example.com',
        ['recipient1@example.com', 'recipient2@example.com'],
        'Simple Subject',
        'Simple body',
        false,
      );

      expect(result.success).toBe(true);
    });

    it('should use sender name from config when sending email', async () => {
      const composeMimeMessageSpy = jest.spyOn(
        service as any,
        'composeMimeMessage',
      );

      await service.sendSimpleEmail(
        'test@example.com',
        'recipient@example.com',
        'Test Subject',
        'Test body',
        false,
      );

      expect(composeMimeMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sender: { email: 'test@example.com', name: 'Test Sender (Test Org)' },
        }),
      );
    });

    it('should send password reset email', async () => {
      process.env.APP_BASE_URL = 'https://myapp.com';
      process.env.SYSTEM_EMAIL = 'system@myapp.com';

      const result = await service.sendPasswordResetEmail(
        'user@example.com',
        'temp123',
        'reset-token-456',
      );

      expect(result.success).toBe(true);
      expect((global as any).mockSendMessage).toHaveBeenCalled();

      // Clean up
      delete process.env.APP_BASE_URL;
      delete process.env.SYSTEM_EMAIL;
    });
  });

  describe('Connection Testing', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          type: 'service_account',
          client_email: 'test@test-project.iam.gserviceaccount.com',
          private_key:
            '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----',
        }),
      );
    });

    it('should test connection successfully', async () => {
      const result = await service.testConnection();

      expect(result).toBe(true);
      expect((global as any).mockGetProfile).toHaveBeenCalledWith({
        userId: 'me',
      });
    });

    it('should handle connection test failure', async () => {
      ((global as any).mockGetProfile as jest.Mock).mockRejectedValue(
        new Error('Connection failed'),
      );

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should send test email', async () => {
      const result = await service.sendTestEmail('test@example.com');

      expect(result.success).toBe(true);
      expect((global as any).mockSendMessage).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should encode for Gmail API correctly', () => {
      const mimeMessage = 'From: test@example.com\r\nSubject: Test\r\n\r\nBody';
      const encoded = service['encodeForGmailAPI'](mimeMessage);

      expect(encoded).toBeDefined();
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('should format mailbox address with name', () => {
      const formatted = service['formatMailboxAddress']({
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(formatted).toBe('John Doe <john@example.com>');
    });

    it('should format mailbox address without name', () => {
      const formatted = service['formatMailboxAddress']({
        email: 'john@example.com',
      });

      expect(formatted).toBe('john@example.com');
    });

    it('should generate unique boundaries', () => {
      const boundary1 = service['generateBoundary']();
      const boundary2 = service['generateBoundary']();

      expect(boundary1).not.toBe(boundary2);
      expect(boundary1).toContain('----=_Part_');
    });

    it('should generate unique message IDs', () => {
      const messageId1 = service['generateMessageId']();
      const messageId2 = service['generateMessageId']();

      expect(messageId1).not.toBe(messageId2);
      expect(messageId1).toContain('@gmail-helper.local');
    });

    it('should get content type for known extensions', () => {
      expect(service['getContentType']('test.pdf')).toBe('application/pdf');
      expect(service['getContentType']('test.jpg')).toBe('image/jpeg');
      expect(service['getContentType']('test.txt')).toBe('text/plain');
      expect(service['getContentType']('test.unknown')).toBe(
        'application/octet-stream',
      );
    });
  });

  describe('OAuth2 Flow', () => {
    it('should generate auth URL', () => {
      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      };

      const authUrl = service.generateAuthUrl(credentials);

      expect(authUrl).toBe('https://mock-auth-url.com');
    });

    it('should exchange auth code for tokens', async () => {
      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      };

      const tokens = await service.getTokensFromAuthCode(
        credentials,
        'auth-code',
      );

      expect(tokens.access_token).toBe('mock-access-token');
    });
  });
});
