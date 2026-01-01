# Email Campaign Service - Business Process Guide

## Overview

The EmailCampaignService provides a business process-oriented approach to email marketing that orchestrates template rendering and email delivery. It separates concerns cleanly:

- **EmailTemplateService**: Handles Handlebars template rendering with multi-layer personalization
- **GmailService**: Handles email delivery (unchanged from original implementation)  
- **EmailCampaignService**: Orchestrates the complete business process

## Key Features

### 1. Single Email with Personalization
```typescript
await emailCampaignService.sendSingleEmail({
  templateName: 'vorba-intro-3-template',
  sender: { email: 'noreply@company.com', name: 'Company Team' },
  recipient: { email: 'john@example.com', name: 'John Doe' },
  subject: 'Welcome to Vorba!',
  baseData: { companyName: 'Acme Corp' },
  personalizationData: { firstName: 'John', memberType: 'Premium' },
  contextData: { campaignId: 'welcome-2024', sentAt: new Date() }
});
```

### 2. Bulk Email Campaign
```typescript
await emailCampaignService.executeCampaign({
  templateName: 'vorba-intro-3-template',
  sender: { email: 'noreply@company.com', name: 'Company Team' },
  recipients: [
    { 
      email: 'john@example.com', 
      name: 'John Doe',
      personalizationData: { firstName: 'John', memberType: 'Premium' }
    },
    { 
      email: 'jane@example.com', 
      name: 'Jane Smith',
      personalizationData: { firstName: 'Jane', memberType: 'Standard' }
    }
  ],
  subject: 'Welcome to Vorba!',
  baseData: { companyName: 'Acme Corp' },
  contextData: { campaignId: 'welcome-2024' }
});
```

### 3. Test Email with Preview
```typescript
// Send test email
await emailCampaignService.sendTestEmail(
  'vorba-intro-3-template',
  { email: 'test@company.com', name: 'Test User' },
  { email: 'noreply@company.com', name: 'Company Team' },
  'Test Email Subject'
);

// Preview without sending
const preview = await emailCampaignService.previewEmail(
  'vorba-intro-3-template',
  { companyName: 'Acme Corp' },
  { firstName: 'John', memberType: 'Premium' }
);
```

## API Endpoints

### Campaign Operations
- `POST /email-campaigns/send-single` - Send single personalized email
- `POST /email-campaigns/execute` - Execute bulk email campaign
- `POST /email-campaigns/test` - Send test email
- `POST /email-campaigns/preview` - Preview email without sending
- `POST /email-campaigns/quick-send` - Quick send with default template data
- `POST /email-campaigns/validate` - Validate campaign request

### Template Management
- `GET /email-templates` - List available templates
- `POST /email-templates/render` - Render template with data
- `GET /email-templates/:name/data` - Get template default data
- `POST /email-templates/preview/:name` - Preview template

### Campaign Analytics
- `GET /email-campaigns/templates/:name/stats` - Get template usage statistics

## Data Layer Architecture

The service supports 4-layer data architecture:

1. **Template Layer**: Default template data (from `*-data.json`)
2. **Base Layer**: Campaign-wide data (`baseData`)
3. **Personalization Layer**: Per-recipient data (`personalizationData`)
4. **Context Layer**: Runtime/system data (`contextData`)

Higher layers override lower layers, enabling sophisticated personalization.

## Error Handling

The service provides comprehensive error handling:
- Template rendering failures
- Email delivery failures
- Validation errors
- Rate limiting management

Campaign results include success/failure counts and detailed error information for each recipient.

## Integration Benefits

### Clean Separation of Concerns
- **Template Service**: Pure template rendering logic
- **Gmail Service**: Pure email delivery logic
- **Campaign Service**: Business process orchestration

### Maintainability
- Each service has a single responsibility
- Easy to test individual components
- Clear interfaces between services

### Scalability
- Template caching for performance
- Built-in rate limiting for email delivery
- Campaign result tracking for analytics

### Business Value
- Email marketing campaigns
- Transactional email automation
- A/B testing support (via different templates)
- Comprehensive campaign analytics

## Example Usage in Application

```typescript
// In a user registration handler
await emailCampaignService.sendSingleEmail({
  templateName: 'welcome-email',
  sender: { email: 'welcome@company.com', name: 'Welcome Team' },
  recipient: { email: user.email, name: user.fullName },
  subject: 'Welcome to our platform!',
  personalizationData: { 
    firstName: user.firstName,
    accountType: user.accountType 
  },
  contextData: { 
    registrationDate: user.createdAt,
    activationLink: generateActivationLink(user.id)
  }
});

// In a marketing campaign handler
const campaignResult = await emailCampaignService.executeCampaign({
  templateName: 'monthly-newsletter',
  sender: { email: 'newsletter@company.com', name: 'Newsletter Team' },
  recipients: await getSubscribedUsers(),
  subject: 'Monthly Newsletter - December 2024',
  baseData: { 
    month: 'December',
    year: '2024',
    unsubscribeLink: 'https://company.com/unsubscribe'
  }
});

console.log(`Campaign sent to ${campaignResult.totalRecipients} recipients`);
console.log(`Success: ${campaignResult.successCount}, Failures: ${campaignResult.failureCount}`);
```

## Module Structure

### Separated Concerns Architecture

The email system is now properly organized into separate modules:

```
src/module/
├── email-template/              # Pure template rendering
│   ├── email-template.service.ts
│   ├── email-template.controller.ts
│   ├── email-template.module.ts
│   ├── email-template.service.spec.ts
│   └── index.ts
│
├── email-campaign/              # Business process orchestration  
│   ├── email-campaign.service.ts
│   ├── email-campaign.controller.ts
│   ├── email-campaign.module.ts
│   ├── email-campaign.service.spec.ts
│   ├── BUSINESS-PROCESS-GUIDE.md
│   └── index.ts
│
└── gmail/                       # Email delivery (unchanged)
    └── gmail.service.ts
```

### Import Usage

```typescript
// Import template rendering
import { EmailTemplateService } from '../email-template';

// Import campaign orchestration  
import { EmailCampaignService } from '../email-campaign';

// Import email delivery
import { GmailService } from '../gmail/gmail.service';
```

## Next Steps

1. **Database Integration**: Add campaign history tracking
2. **Advanced Analytics**: Campaign performance metrics
3. **A/B Testing**: Support multiple template variants
4. **Scheduling**: Queue campaigns for future delivery
5. **Templates**: Create more email templates using the dual-file approach