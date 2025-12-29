# Email Template Service Architecture

## **Core Principle: Template + Data Injection**

The service consumes **templates alone** and injects variable content through a **multi-layer data strategy**.

## **Architecture Layers**

### **1. Template Layer (.hbs files)**
- Static HTML structure with Handlebars variables
- Reusable across campaigns and audiences
- Version controlled and testable

### **2. Base Data Layer (.json files)**
- Default content and theme settings
- Fallback values for all variables
- Brand consistency and styling standards

### **3. Personalization Layer (Runtime)**
```typescript
interface PersonalizationRequest {
  recipientName?: string;
  customQuestion?: string;
  industryContext?: IndustryContext;
  companySize?: CompanySize;
  senderInfo?: SenderInfo;
}
```

### **4. Context Layer (Business Logic)**
- A/B testing variants
- Campaign-specific overrides  
- Dynamic tracking parameters
- Conditional content blocks

## **Service Design Pattern**

### **Input Flow:**
```
Template ID → Base Data → Personalization → Context → Rendered HTML
```

### **Service Interface:**
```typescript
class EmailTemplateService {
  async renderTemplate(request: {
    templateId: string;
    recipientData: PersonalizationData;
    campaignContext?: CampaignContext;
    abTestVariant?: string;
  }): Promise<RenderedEmail>
}
```

## **Personalization Strategies**

### **Level 1: Basic Personalization**
- Recipient name
- Company name
- Custom greeting

### **Level 2: Content Personalization**
- Industry-specific questions
- Company size-targeted messaging
- Role-based CTAs

### **Level 3: Dynamic Personalization**
- Behavioral triggers
- Geographic targeting
- Previous interaction history

### **Level 4: AI-Driven Personalization**
- Generated custom questions
- Dynamic content based on company research
- Sentiment-adjusted messaging

## **Data Merge Strategy**

### **Priority Order (High to Low):**
1. **Runtime Overrides** - Explicit personalization
2. **Campaign Context** - A/B test variants
3. **User Preferences** - Saved personalization
4. **Base Template Data** - Default fallbacks

### **Merge Logic:**
```typescript
const finalData = {
  ...baseTemplateData,
  ...userPreferences,
  ...campaignContext,
  ...runtimeOverrides
};
```

## **Example Usage Patterns**

### **Pattern 1: Simple Personalization**
```typescript
// Just add recipient name
const email = await templateService.renderTemplate({
  templateId: 'vorba-intro-3',
  recipientData: {
    recipientName: 'John',
    recipientEmail: 'john@company.com'
  }
});
```

### **Pattern 2: Industry Targeting**
```typescript
// Customize for e-commerce industry
const email = await templateService.renderTemplate({
  templateId: 'vorba-intro-3',
  recipientData: {
    recipientName: 'Sarah',
    customQuestion: 'Is your e-commerce platform limiting your growth?'
  },
  campaignContext: {
    industry: 'ecommerce',
    utmCampaign: 'ecommerce-outreach-q4'
  }
});
```

### **Pattern 3: A/B Testing**
```typescript
// Test different headlines
const email = await templateService.renderTemplate({
  templateId: 'vorba-intro-3',
  recipientData: { recipientName: 'Mike' },
  abTestVariant: 'headline-variant-b',
  campaignContext: {
    testId: 'headline-test-001'
  }
});
```

## **Benefits of This Architecture**

✅ **Separation of Concerns**: Templates, data, and business logic separated  
✅ **Reusability**: Same template for multiple campaigns  
✅ **Testability**: Each layer can be tested independently  
✅ **Scalability**: Easy to add new personalization strategies  
✅ **Maintainability**: Clear data flow and responsibility boundaries  
✅ **Flexibility**: Mix and match personalization levels as needed  

## **Integration with Gmail Service**

```typescript
// Render personalized email
const renderedEmail = await emailTemplateService.renderTemplate({
  templateId: 'vorba-intro-3',
  recipientData: personalizationData
});

// Send via Gmail
const result = await gmailService.sendEmail({
  sender: { email: 'adam.cox@vorba.com', name: 'Adam Cox (Vorba)' },
  recipients: [{ email: recipient.email, name: recipient.name }],
  subject: renderedEmail.subject,
  bodyHtml: renderedEmail.html
});
```

This architecture provides **maximum flexibility** while maintaining **clean separation** between template structure and dynamic content.
