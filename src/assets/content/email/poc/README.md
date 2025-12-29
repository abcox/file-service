# Email Template PoC - Dual File Approach

This proof-of-concept demonstrates a clean separation between browser-previewable HTML and Handlebars templates.

## Files Structure

### Preview Files (Browser Testable)
- `vorba-intro-preview.html` - Clean HTML with real data, open directly in browser
- No syntax errors, fully valid HTML/CSS
- Use for design, layout, and visual testing

### Template Files (For Rendering)
- `vorba-intro-template.hbs` - Handlebars template with `{{variables}}`
- `vorba-intro-data.json` - Sample data for testing
- `vorba-intro-template.meta.json` - Template metadata and schema

## Workflow

1. **Design Phase**: Open `vorba-intro-preview.html` in browser
   - Design layout, colors, typography
   - Test responsiveness
   - Perfect the visual appearance

2. **Template Phase**: Convert to `vorba-intro-template.hbs`
   - Replace hardcoded values with `{{handlebars}}` syntax
   - Add loops with `{{#each}}` helpers
   - Add conditionals with `{{#if}}` helpers

3. **Data Phase**: Define structure in `vorba-intro-data.json`
   - Provide sample data for testing
   - Document expected data structure

4. **Integration Phase**: Use with email service
   - Template engine renders `.hbs` + data → HTML
   - Send via Gmail service

## Benefits

✅ **Browser Preview**: Preview files open directly in browser  
✅ **No Syntax Errors**: Clean HTML/CSS with no linting issues  
✅ **External Modeling**: Data separate from templates  
✅ **Industry Standard**: Handlebars widely supported  
✅ **Maintainable**: Clear separation of concerns  

## Usage

```javascript
// Load template and data
const template = fs.readFileSync('vorba-intro-template.hbs', 'utf8');
const data = JSON.parse(fs.readFileSync('vorba-intro-data.json', 'utf8'));

// Render with Handlebars
const compiledTemplate = Handlebars.compile(template);
const html = compiledTemplate(data);

// Send via email service
await gmailService.sendEmail({
  recipients: [{ email: 'recipient@example.com' }],
  subject: 'Professional Introduction',
  bodyHtml: html
});
```

## Customization

### Theme Overrides
```javascript
const customData = {
  ...baseData,
  theme: {
    ...baseData.theme,
    backgroundColor: '#custom-color',
    buttonBackgroundColor: '#custom-button-color'
  }
};
```

### Content Personalization
```javascript
const personalizedData = {
  ...baseData,
  person: {
    ...baseData.person,
    name: 'John Smith',
    title: 'Product Manager'
  },
  content: {
    ...baseData.content,
    greeting: 'Hi there!'
  }
};
```

This approach gives you the best of both worlds: clean, testable HTML for design work and proper templating for dynamic content generation.
