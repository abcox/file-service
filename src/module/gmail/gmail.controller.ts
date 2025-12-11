import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { GmailService } from './gmail.service';
import { MimeMessageRequest, SendEmailResult } from './gmail.service';
import { Auth } from '../auth';

export class SendEmailFromTemplateDto {
  @ApiProperty({
    description: 'Email sender information',
    example: {
      name: 'Adam Cox (Vorba)',
      email: 'adam.cox@vorba.com',
    },
  })
  sender: {
    name?: string;
    email: string;
  };

  @ApiProperty({
    description: 'Array of email recipients',
    example: [{ name: 'Adam Cox', email: 'adam@adamcox.net' }],
  })
  recipients: Array<{
    name?: string;
    email: string;
  }>;

  @ApiProperty({
    description: 'Email subject line',
    example: 'Professional Introduction',
  })
  subject: string;

  @ApiProperty({
    description: 'Path to template file relative to assets folder',
    example: 'content/email-intro.html',
  })
  templatePath: string;

  @ApiProperty({
    description: 'Template data for variable replacement',
    required: false,
    example: {
      recipientName: 'John',
      customMessage: 'Hope you are doing well!',
    },
  })
  templateData?: Record<string, any>;
}

export class SendEmailDto {
  @ApiProperty({
    description: 'Email sender information',
    example: {
      name: 'Adam Cox (Vorba)',
      email: 'adam.cox@vorba.com',
    },
  })
  sender: {
    name?: string;
    email: string;
  };

  @ApiProperty({
    description: 'Array of email recipients',
    example: [{ email: 'adam@adamcox.net', name: 'Adam Cox' }],
  })
  recipients: Array<{
    name?: string;
    email: string;
  }>;

  @ApiProperty({
    description: 'Email subject line',
    example: 'Test Email from API',
  })
  subject: string;

  @ApiProperty({
    description: 'HTML body content (optional)',
    required: false,
    example: '<h1>Hello</h1><p>This is an HTML email.</p>',
  })
  bodyHtml?: string;

  @ApiProperty({
    description: 'Plain text body content (optional)',
    required: false,
    example: 'Hello\n\nThis is a plain text email.',
  })
  bodyPlainText?: string;
}

@ApiTags('Gmail')
@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Post('send')
  @Auth({ public: true })
  @ApiOperation({
    summary: 'Send email via Gmail API',
    description:
      'Send an email using the configured Gmail service account with domain-wide delegation',
  })
  @ApiBody({
    type: SendEmailDto,
    description: 'Email details to send',
    examples: {
      basicEmail: {
        summary: 'Basic text email',
        value: {
          sender: {
            name: 'Adam Cox (Vorba)',
            email: 'adam.cox@vorba.com',
          },
          recipients: [
            {
              email: 'adam@adamcox.net',
              name: 'Adam Cox',
            },
          ],
          subject: 'Test Email from API',
          bodyPlainText:
            'This is a test email sent from the Gmail API endpoint.',
        },
      },
      htmlEmail: {
        summary: 'HTML email with formatting',
        value: {
          sender: {
            name: 'Adam Cox (Vorba)',
            email: 'adam.cox@vorba.com',
          },
          recipients: [
            {
              email: 'adam@adamcox.net',
              name: 'Adam Cox',
            },
          ],
          subject: 'HTML Test Email from API',
          bodyHtml:
            '<h1>Test Email</h1><p>This is a <strong>test email</strong> sent from the Gmail API endpoint with <em>HTML formatting</em>.</p>',
          bodyPlainText:
            'Test Email\n\nThis is a test email sent from the Gmail API endpoint with HTML formatting.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email sent successfully',
    schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'Gmail message ID' },
        threadId: { type: 'string', description: 'Gmail thread ID' },
        success: {
          type: 'boolean',
          description: 'Whether the email was sent successfully',
        },
        error: { type: 'string', description: 'Error message if send failed' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email data provided',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during email sending',
  })
  async sendEmail(@Body() emailData: SendEmailDto): Promise<SendEmailResult> {
    const request: MimeMessageRequest = {
      sender: emailData.sender,
      recipients: emailData.recipients,
      subject: emailData.subject,
      bodyHtml: emailData.bodyHtml || '',
      bodyPlainText: emailData.bodyPlainText || '',
    };

    return this.gmailService.sendEmail(request);
  }

  @Post('send-template')
  @Auth({ public: true })
  @ApiOperation({
    summary: 'Send email using HTML template',
    description: 'Send an email using an HTML template from the assets folder',
  })
  @ApiBody({
    type: SendEmailFromTemplateDto,
    description: 'Template email details',
  })
  @ApiResponse({
    status: 200,
    description: 'Email sent successfully using template',
    schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'Gmail message ID' },
        threadId: { type: 'string', description: 'Gmail thread ID' },
        success: {
          type: 'boolean',
          description: 'Whether the email was sent successfully',
        },
        error: { type: 'string', description: 'Error message if send failed' },
      },
    },
  })
  async sendTemplateEmail(
    @Body() emailData: SendEmailFromTemplateDto,
  ): Promise<SendEmailResult> {
    return this.gmailService.sendEmailFromTemplate(emailData);
  }
}
