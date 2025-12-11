import { Injectable, Logger } from '@nestjs/common';
import { google, gmail_v1 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfigService } from '../config/config.service';

export interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface MailboxAddress {
  name?: string;
  email: string;
}

export interface FileInfo {
  fileName: string;
  contentType: string;
  content: Buffer;
}

export interface MimeMessageRequest {
  sender: MailboxAddress;
  recipients: MailboxAddress[];
  subject: string;
  bodyHtml: string;
  bodyPlainText?: string;
  bodyContentFileInfo?: FileInfo;
  attachmentFilePathName?: string;
  embeddedImages?: Array<{
    cid: string;
    url: string;
    filePath?: string;
  }>;
}

export interface SendEmailResult {
  messageId: string;
  threadId?: string;
  success: boolean;
  error?: string;
}

export interface GmailApisEmailOptions {
  scopes?: string[];
  serviceAccountJsonKeyFilePathname?: string;
  userEmail?: string; // For domain-wide delegation
  senderName?: string; // Display name for email sender
}

export interface GmailApis {
  email?: GmailApisEmailOptions;
}

export interface SendEmailFromTemplateRequestDto {
  sender: MailboxAddress;
  recipients: MailboxAddress[];
  subject: string;
  templatePath: string;
  templateData?: Record<string, any>;
}

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);
  private config: GmailApisEmailOptions | undefined;

  constructor(private appConfigService: AppConfigService) {
    const { email: emailOptions } =
      this.appConfigService.getConfig().gmailApis || {};
    if (!emailOptions) {
      throw new Error('Gmail API email options are not configured');
    }
    this.config = emailOptions;
  }

  //#region public methods

  /**
   * Send email using service account key file
   */
  async sendEmail(request: MimeMessageRequest): Promise<SendEmailResult> {
    try {
      const { serviceAccountJsonKeyFilePathname } = this.config || {};
      // 1. Create Gmail service from key file generated from service account
      const keyFilePath = serviceAccountJsonKeyFilePathname;
      if (!keyFilePath) {
        throw new Error('Service account key file path is not configured');
      }
      const gmail = this.createGmailServiceFromKeyFile(keyFilePath);

      // 2. Send the message
      return await this.sendMimeMessage(gmail, request);
    } catch (error) {
      this.logger.error('Failed to send email with key file', error);
      return {
        messageId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send MIME message using Gmail API
   */
  async sendMimeMessage(
    gmail: gmail_v1.Gmail,
    request: MimeMessageRequest,
  ): Promise<SendEmailResult> {
    try {
      // 1. Compose MIME message with proper multipart handling (similar to .NET MimeKit)
      const mimeMessage = this.composeMimeMessageImproved(request);

      // 2. Convert to Gmail API format (URL-safe base64)
      const rawMessage = this.encodeForGmailAPI(mimeMessage);

      // 3. Send via Gmail API
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
        },
      });

      this.logger.log('Email sent successfully', {
        messageId: result.data.id,
        threadId: result.data.threadId,
        to: request.recipients.map((r) => r.email),
        subject: request.subject,
      });

      return {
        messageId: result.data.id || '',
        threadId: result.data.threadId || undefined,
        success: true,
      };
    } catch (error) {
      this.logger.error('Failed to send MIME message', error);
      throw error;
    }
  }

  /**
   * Send simple text email (convenience method)
   */
  async sendSimpleEmail(
    from: string,
    to: string | string[],
    subject: string,
    body: string,
    isHtml = false,
  ): Promise<SendEmailResult> {
    const recipients = Array.isArray(to)
      ? to.map((email) => ({ email }))
      : [{ email: to }];

    // Get sender name from config if available
    const { senderName } = this.config || {};
    const sender = senderName
      ? { email: from, name: senderName }
      : { email: from };

    const request: MimeMessageRequest = {
      sender,
      recipients,
      subject,
      bodyHtml: isHtml ? body : '',
      bodyPlainText: isHtml ? '' : body,
    };

    return this.sendEmail(request);
  }

  /**
   * Send password reset email (specific to your auth service)
   */
  async sendPasswordResetEmail(
    to: string,
    tempPassword: string,
    resetToken: string,
  ): Promise<SendEmailResult> {
    const resetUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Get sender name from config if available
    const { senderName } = this.config || {};
    const systemEmail = process.env.SYSTEM_EMAIL || 'noreply@fileservice.local';
    const sender = senderName
      ? { email: systemEmail, name: senderName }
      : { email: systemEmail, name: 'File Service' };

    const request: MimeMessageRequest = {
      sender,
      recipients: [{ email: to }],
      subject: 'Password Reset Request',
      bodyHtml: `
        <html>
          <body>
            <h2>Password Reset Request</h2>
            <p>You have requested a password reset for your account.</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            <p>Please use this temporary password to log in, then set a new password.</p>
            <p>You can also use this link to reset your password directly:</p>
            <p><a href="${resetUrl}">Reset Password</a></p>
            <p>This temporary password will expire in 1 hour.</p>
            <hr>
            <p><small>If you did not request this password reset, please contact support immediately.</small></p>
          </body>
        </html>
      `,
      bodyPlainText: `
Password Reset Request

You have requested a password reset for your account.

Temporary Password: ${tempPassword}

Please use this temporary password to log in, then set a new password.

Reset Link: ${resetUrl}

This temporary password will expire in 1 hour.

If you did not request this password reset, please contact support immediately.
      `.trim(),
    };

    return this.sendEmail(request);
  }

  /**
   * Test Gmail service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { serviceAccountJsonKeyFilePathname } = this.config || {};
      if (!serviceAccountJsonKeyFilePathname) {
        throw new Error('Service account key file path is not configured');
      }
      const gmailService = this.createGmailServiceFromKeyFile(
        serviceAccountJsonKeyFilePathname,
      );

      return await this.testGmailService(gmailService);
    } catch (error) {
      this.logger.error('Connection test failed', error);
      return false;
    }
  }

  /**
   * Send test email to verify service is working
   */
  async sendTestEmail(to: string): Promise<SendEmailResult> {
    return this.sendSimpleEmail(
      'test@fileservice.local',
      to,
      'Gmail Service Test',
      '<h1>Test Email</h1><p>Gmail service is working correctly!</p><p>Sent at: ' +
        new Date().toISOString() +
        '</p>',
      true,
    );
  }

  /**
   * Send email using HTML template from assets folder with embedded images
   */
  async sendEmailFromTemplate(
    request: SendEmailFromTemplateRequestDto,
  ): Promise<SendEmailResult> {
    try {
      const { sender, recipients, subject, templatePath, templateData } =
        request;
      // Load HTML template from assets folder
      const htmlContent = this.loadEmailTemplate(templatePath, templateData);

      // For template emails, send HTML-only (no plain text alternative)
      // This ensures email clients display the HTML version with proper styling
      const mimeRequest: MimeMessageRequest = {
        sender,
        recipients,
        subject,
        bodyHtml: htmlContent,
        // bodyPlainText: '', // Don't include plain text for template emails
      };

      return await this.sendEmail(mimeRequest);
    } catch (error) {
      this.logger.error('Failed to send email from template', error);
      return {
        messageId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Compose MIME message with improved multipart handling (similar to .NET MimeKit)
   */
  private composeMimeMessageImproved(request: MimeMessageRequest): string {
    try {
      const mainBoundary = this.generateBoundary();
      const alternativeBoundary = this.generateBoundary();

      // Build MIME headers
      const headers = this.buildImprovedHeaders(request, mainBoundary);

      // Build MIME body with proper multipart structure
      const body = this.buildImprovedMimeBody(
        request,
        mainBoundary,
        alternativeBoundary,
      );

      const mimeMessage = headers + '\r\n' + body;

      return mimeMessage;
    } catch (error) {
      this.logger.error('Failed to compose improved MIME message', error);
      throw error;
    }
  }

  /**
   * Build improved MIME headers with proper multipart structure
   */
  private buildImprovedHeaders(
    request: MimeMessageRequest,
    boundary: string,
  ): string {
    const senderAddress = this.formatMailboxAddress(request.sender);
    const recipientAddresses = request.recipients
      .map((r) => this.formatMailboxAddress(r))
      .join(', ');

    const headers: string[] = [
      `From: ${senderAddress}`,
      `To: ${recipientAddresses}`,
      `Subject: ${this.encodeSubject(request.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${this.generateMessageId()}>`,
      `MIME-Version: 1.0`,
    ];

    // Always use multipart/mixed as the top level (like .NET MimeKit does)
    // This ensures proper handling of HTML with potential embedded resources
    const hasAttachment = !!(
      request.attachmentFilePathName ||
      request.bodyContentFileInfo ||
      (request.embeddedImages && request.embeddedImages.length > 0)
    );
    const hasMultipleBodyTypes = !!(request.bodyHtml && request.bodyPlainText);

    if (hasAttachment || hasMultipleBodyTypes) {
      // Use multipart/mixed when we have attachments or multiple body types
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    } else if (request.bodyHtml) {
      // Simple HTML message - don't use multipart for simple HTML
      headers.push(`Content-Type: text/html; charset=utf-8`);
      headers.push(`Content-Transfer-Encoding: quoted-printable`);
    } else {
      // Simple single-part text message
      headers.push(`Content-Type: text/plain; charset=utf-8`);
      headers.push(`Content-Transfer-Encoding: quoted-printable`);
    }

    return headers.join('\r\n');
  }

  /**
   * Build improved MIME body with proper nesting like .NET MimeKit
   */
  private buildImprovedMimeBody(
    request: MimeMessageRequest,
    mainBoundary: string,
    alternativeBoundary: string,
  ): string {
    const hasAttachment = !!(
      request.attachmentFilePathName ||
      request.bodyContentFileInfo ||
      (request.embeddedImages && request.embeddedImages.length > 0)
    );
    const hasMultipleBodyTypes = !!(request.bodyHtml && request.bodyPlainText);

    if (!hasAttachment && !hasMultipleBodyTypes && !request.bodyHtml) {
      // Simple single-part text message
      return this.encodeQuotedPrintable(request.bodyPlainText || '');
    }

    if (!hasAttachment && !hasMultipleBodyTypes && request.bodyHtml) {
      // Simple single-part HTML message
      return this.encodeQuotedPrintableFixed(request.bodyHtml);
    }

    const parts: string[] = [];

    // Add content part (HTML and/or text)
    if (hasMultipleBodyTypes) {
      // Multipart/alternative nested within multipart/mixed
      parts.push(`--${mainBoundary}`);
      parts.push(
        `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      );
      parts.push('');

      // Plain text alternative
      parts.push(`--${alternativeBoundary}`);
      parts.push('Content-Type: text/plain; charset=utf-8');
      parts.push('Content-Transfer-Encoding: quoted-printable');
      parts.push('');
      parts.push(this.encodeQuotedPrintable(request.bodyPlainText || ''));
      parts.push('');

      // HTML alternative
      parts.push(`--${alternativeBoundary}`);
      parts.push('Content-Type: text/html; charset=utf-8');
      parts.push('Content-Transfer-Encoding: quoted-printable');
      parts.push('');
      parts.push(this.encodeQuotedPrintableFixed(request.bodyHtml || ''));
      parts.push('');

      parts.push(`--${alternativeBoundary}--`);
    } else if (request.bodyHtml) {
      // Single HTML part within multipart/mixed (for embedded images)
      parts.push(`--${mainBoundary}`);
      parts.push('Content-Type: text/html; charset=utf-8');
      parts.push('Content-Transfer-Encoding: quoted-printable');
      parts.push('');
      parts.push(this.encodeQuotedPrintableFixed(request.bodyHtml));
      parts.push('');
    } else if (request.bodyPlainText) {
      // Single text part within multipart/mixed
      parts.push(`--${mainBoundary}`);
      parts.push('Content-Type: text/plain; charset=utf-8');
      parts.push('Content-Transfer-Encoding: quoted-printable');
      parts.push('');
      parts.push(this.encodeQuotedPrintable(request.bodyPlainText));
      parts.push('');
    }

    // Embedded images (cid: references) - like .NET MimeKit inline attachments
    if (request.embeddedImages && request.embeddedImages.length > 0) {
      for (const embeddedImage of request.embeddedImages) {
        if (embeddedImage.filePath && fs.existsSync(embeddedImage.filePath)) {
          const imageContent = fs.readFileSync(embeddedImage.filePath);
          const filename = path.basename(embeddedImage.filePath);
          const mimeType = this.getMimeType(filename);

          parts.push(`--${mainBoundary}`);
          parts.push(`Content-Type: ${mimeType}`);
          parts.push('Content-Transfer-Encoding: base64');
          parts.push(`Content-ID: <${embeddedImage.cid}>`);
          parts.push(`Content-Disposition: inline; filename="${filename}"`);
          parts.push('');
          parts.push(imageContent.toString('base64'));
          parts.push('');
        }
      }
    }

    // Regular attachment part
    if (
      request.attachmentFilePathName &&
      fs.existsSync(request.attachmentFilePathName)
    ) {
      const attachmentContent = fs.readFileSync(request.attachmentFilePathName);
      const filename = path.basename(request.attachmentFilePathName);
      const mimeType = this.getMimeType(filename);

      parts.push(`--${mainBoundary}`);
      parts.push(`Content-Type: ${mimeType}; name="${filename}"`);
      parts.push('Content-Transfer-Encoding: base64');
      parts.push(`Content-Disposition: attachment; filename="${filename}"`);
      parts.push('');
      parts.push(attachmentContent.toString('base64'));
      parts.push('');
    }

    // Close main boundary
    parts.push(`--${mainBoundary}--`);

    return parts.join('\r\n');
  }

  /**
   * Get MIME type for file extension
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Load email template from assets folder
   */
  private loadEmailTemplate(
    templatePath: string,
    data?: Record<string, any>,
  ): string {
    try {
      // Resolve path relative to src/assets
      const fullPath = path.resolve(
        process.cwd(),
        'src',
        'assets',
        templatePath,
      );

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Template file not found: ${fullPath}`);
      }

      let htmlContent = fs.readFileSync(fullPath, 'utf-8');

      // Basic template variable replacement (simple {{variable}} syntax)
      if (data) {
        htmlContent = this.replaceTemplateVariables(htmlContent, data);
      }

      return htmlContent;
    } catch (error) {
      this.logger.error(
        `Failed to load email template: ${templatePath}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Simple template variable replacement
   */
  private replaceTemplateVariables(
    content: string,
    data: Record<string, any>,
  ): string {
    let result = content;

    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(placeholder, String(value));
    });

    return result;
  }

  //#endregion public methods

  //#region private methods
  /**
   * Convert MIME message to Gmail API format (URL-safe base64)
   */
  private encodeForGmailAPI(mimeMessage: string): string {
    return Buffer.from(mimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''); // Remove padding
  }

  //#region auth methods

  /**
   * Create Gmail service from service account key file (mirrors GoogleCredential.FromStream)
   */
  createGmailServiceFromKeyFile(keyFilePath: string): gmail_v1.Gmail {
    try {
      const { userEmail } = this.config || {};
      if (!userEmail) {
        throw new Error(
          'User email for domain-wide delegation is not configured',
        );
      }
      const { scopes } = this.config || {};
      const keyFile = path.resolve(keyFilePath);
      if (!fs.existsSync(keyFile)) {
        throw new Error(`Service account key file not found: ${keyFile}`);
      }

      // Use keyFile directly (like our working test) instead of parsing and using credentials
      const jwtClient = new google.auth.JWT({
        keyFile: keyFile,
        scopes: scopes,
        subject: userEmail, // Domain user to impersonate
      });

      return google.gmail({
        version: 'v1',
        auth: jwtClient,
      });
    } catch (error) {
      this.logger.error('Failed to create Gmail service from key file', error);
      throw error;
    }
  }

  /**
   * Create Gmail service from service account credentials object
   */
  createGmailServiceFromServiceAccount(
    credentials: ServiceAccountCredentials,
  ): gmail_v1.Gmail {
    try {
      const { userEmail, scopes } = this.config || {};
      // Use service account directly (like .NET implementation)
      const jwtClient = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: scopes,
        subject: userEmail, // Domain-wide delegation to act as this user
      });

      return google.gmail({
        version: 'v1',
        auth: jwtClient,
      });
    } catch (error) {
      this.logger.error(
        'Failed to create Gmail service from service account',
        error,
      );
      throw error;
    }
  }

  /**
   * Test Gmail service connection
   */
  async testGmailService(gmailService: gmail_v1.Gmail): Promise<boolean> {
    try {
      const response = await gmailService.users.getProfile({ userId: 'me' });
      this.logger.log(
        `Gmail connection successful. Email: ${response.data.emailAddress}`,
      );
      return true;
    } catch (error) {
      this.logger.error('Gmail connection test failed', error);
      return false;
    }
  }

  //#endregion auth methods

  //#region mail composition methods

  /**
   * Format mailbox address (Name <email@domain.com> or email@domain.com)
   */
  private formatMailboxAddress(address: MailboxAddress): string {
    // Validate that email is present
    if (!address.email || address.email.trim() === '') {
      throw new Error('Email address is required');
    }

    // Return formatted address: "Name <email>" or just "email"
    if (address.name && address.name.trim() !== '') {
      const displayName = this.formatDisplayName(address.name.trim());
      return `${displayName} <${address.email}>`;
    }

    return address.email;
  }

  /**
   * Format display name with proper quoting for special characters
   */
  private formatDisplayName(name: string): string {
    // Check if the name contains special characters that require quoting
    // RFC 5322 specifies these characters need quoting: (),:;<>@[\]"
    const needsQuoting = /[(),:;<>@[\]"]/.test(name);

    if (needsQuoting) {
      // Escape any existing quotes and wrap in quotes
      const escapedName = name.replace(/"/g, '\\"');
      return `"${escapedName}"`;
    }

    return name;
  }

  /**
   * Encode subject for international characters
   */
  private encodeSubject(subject: string): string {
    // Use RFC 2047 encoding for non-ASCII characters
    // eslint-disable-next-line no-control-regex
    if (/[^\x01-\x7F]/.test(subject)) {
      return `=?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
    }
    return subject;
  }

  /**
   * Generate unique boundary for multipart messages
   */
  private generateBoundary(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `----=_Part_${timestamp}_${random}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}.${random}@gmail-helper.local`;
  }

  /**
   * Encode content as quoted-printable
   */
  private encodeQuotedPrintable(content: string): string {
    return content
      .replace(/[^\r\n\x20-\x7E]/g, (match) => {
        const code = match.charCodeAt(0);
        return `=${code.toString(16).toUpperCase().padStart(2, '0')}`;
      })
      .replace(/[ \t]+$/gm, (match) => {
        return match.replace(/./g, (char) => {
          const code = char.charCodeAt(0);
          return `=${code.toString(16).toUpperCase().padStart(2, '0')}`;
        });
      })
      .replace(/.{1,75}/g, (line) => {
        if (line.length === 76 && line[75] !== '=') {
          return line.substring(0, 75) + '=\r\n' + line.substring(75);
        }
        return line;
      });
  }

  /**
   * Fixed quoted-printable encoding that properly handles Unicode characters and special chars
   */
  private encodeQuotedPrintableFixed(content: string): string {
    // Convert string to UTF-8 buffer to handle Unicode characters properly
    const utf8Buffer = Buffer.from(content, 'utf8');
    let result = '';

    for (let i = 0; i < utf8Buffer.length; i++) {
      const byte = utf8Buffer[i];

      // Handle specific characters that should not be encoded
      if (byte === 0x0d || byte === 0x0a) {
        // Preserve CR and LF (line breaks)
        result += String.fromCharCode(byte);
      } else if (byte === 0x3d) {
        // = character must be encoded
        result += '=3D';
      } else if (byte >= 0x20 && byte <= 0x7e) {
        // Printable ASCII characters (space through tilde)
        result += String.fromCharCode(byte);
      } else if (byte === 0x09 || byte === 0x20) {
        // Tab and space - handle separately for end-of-line encoding
        result += String.fromCharCode(byte);
      } else {
        // Encode all other bytes (including Unicode sequences)
        result += `=${byte.toString(16).toUpperCase().padStart(2, '0')}`;
      }
    }

    // Handle trailing whitespace on lines (but preserve the content structure)
    return result.replace(/[ \t]+$/gm, (match) => {
      return match.replace(/[ \t]/g, (char) => {
        const code = char.charCodeAt(0);
        return `=${code.toString(16).toUpperCase().padStart(2, '0')}`;
      });
    });
  }

  /**
   * Encode content as base64 with line breaks
   */
  private encodeBase64(content: Buffer): string {
    return (
      content
        .toString('base64')
        .match(/.{1,76}/g)
        ?.join('\r\n') || ''
    );
  }

  //#endregion mail composition methods

  //#endregion private methods
}
