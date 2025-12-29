# Email Template API Testing Guide

## Base URL
All endpoints are available at: `http://localhost:3000/api/email-template`

## 1. List Available Templates
**GET** `/templates`
```bash
curl http://localhost:3000/api/email-template/templates
```

**Expected Response:**
```json
{
  "templates": ["welcome", "password-reset", "notification"],
  "success": true
}
```

## 2. Simple Template Rendering
**POST** `/render/simple`
```bash
curl -X POST http://localhost:3000/api/email-template/render/simple \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "welcome",
    "data": {
      "name": "John Doe",
      "companyName": "Acme Corp"
    }
  }'
```

## 3. Advanced Multi-Layer Rendering
**POST** `/render`
```bash
curl -X POST http://localhost:3000/api/email-template/render \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "welcome",
    "baseData": {
      "companyName": "Acme Corp",
      "supportEmail": "help@acme.com"
    },
    "personalizationData": {
      "name": "John Doe",
      "email": "john@example.com",
      "preferredLanguage": "en"
    },
    "contextData": {
      "isVip": true,
      "loginCount": 5
    }
  }'
```

## 4. Get Template Default Data
**GET** `/data/:name/:type`
```bash
# Get base data for welcome template
curl http://localhost:3000/api/email-template/data/welcome/data

# Get personalization data
curl http://localhost:3000/api/email-template/data/welcome/personalized
```

## 5. Preview Template (Browser-Ready)
**POST** `/preview/:name`
```bash
curl -X POST http://localhost:3000/api/email-template/preview/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "testMode": true,
    "previewUser": "Demo User"
  }'
```

## 6. Clear Template Cache
**POST** `/cache/clear`
```bash
curl -X POST http://localhost:3000/api/email-template/cache/clear
```

**When to use:** After editing `.hbs` template files during development.

## Template File Structure

Your templates should be organized like this:
```
src/assets/content/email/
├── templates/
│   ├── welcome.hbs                 # Main template
│   ├── welcome.data.json           # Default base data
│   ├── welcome.personalized.json   # Default personalization data
│   ├── password-reset.hbs
│   └── notification.hbs
└── partials/                       # Reusable template parts
    ├── header.hbs
    ├── footer.hbs
    └── button.hbs
```

## Example Template Content

**welcome.hbs:**
```handlebars
<!DOCTYPE html>
<html>
<head>
    <title>Welcome to {{companyName}}</title>
</head>
<body>
    <h1>Hello {{name}}!</h1>
    <p>Welcome to {{companyName}}.</p>
    
    {{#if isVip}}
        <p><strong>VIP Status:</strong> You have premium access!</p>
    {{/if}}
    
    <p>Login Count: {{loginCount}}</p>
    
    {{> footer}}
</body>
</html>
```

**welcome.data.json:**
```json
{
  "companyName": "Your Company",
  "supportEmail": "support@yourcompany.com",
  "year": 2025
}
```

**welcome.personalized.json:**
```json
{
  "name": "Valued Customer",
  "email": "customer@example.com",
  "preferredLanguage": "en"
}
```

## Data Layer Priority (Highest to Lowest)
1. **contextData** - Situational/runtime data (overrides everything)
2. **personalizationData** - User-specific data  
3. **baseData** - Default template data
4. **Template .json files** - Fallback defaults

## Using Postman/Insomnia
1. Import the curl commands above
2. Set `Content-Type: application/json` header
3. Use JSON body for POST requests
4. Check the Swagger UI at `http://localhost:3000/api` for interactive testing