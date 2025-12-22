# Development Notes

## Project Overview
This is a Thunderbird add-on that integrates Google's Gemini AI to review emails before sending.

## Architecture

### Component Interaction Flow
1. User composes email in Thunderbird
2. User clicks "Gemini Mail Review" button in compose toolbar
3. `popup.js` opens and immediately starts analysis:
   - Retrieves API key and endpoint from local storage
   - Fetches compose details (subject, recipients, body)
   - Sanitizes content to prevent prompt injection
   - Calls Gemini API with analysis prompt using configured endpoint
   - Displays results in popup UI
4. User reviews feedback and decides to edit or send

### File Structure
```
├── manifest.json          # Extension manifest
├── background.js          # Background script (minimal)
├── popup.html/css/js      # Main review interface
├── options.html/css/js    # Settings page
├── icons/                 # Extension icons
├── package.json           # Project metadata
├── README.md              # User documentation
├── USAGE.md               # Usage guide
└── DEVELOPMENT.md         # This file
```

## Security Considerations

### Implemented Security Measures

1. **API Key Protection**
   - Stored in browser.storage.local (not accessible to other extensions)
   - Sent via HTTP header, not URL parameter
   - Never logged or transmitted except to Google API
   - Format validation before use

2. **Content Sanitization**
   - Maximum content length: 10,000 characters
   - Removal of potential injection patterns:
     - Instruction tags: `[INST]`, `[/INST]`
     - System tags: `<<SYS>>`, `<</SYS>>`
     - Markdown headers at line start
     - Code block delimiters
     - Horizontal rules
   - Prevents prompt injection attacks

3. **Type Safety**
   - Handles various recipient formats (array/string)
   - Defensive programming throughout
   - Comprehensive error handling

### Security Scan Results
- CodeQL: 0 alerts
- No XSS vulnerabilities
- No injection vulnerabilities
- No credential exposure

## API Integration

### Configurable Gemini API Endpoint

The add-on supports configurable API endpoints, allowing users to select different Gemini models:

**Default Endpoint:**
```
https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent
```

**Alternative Models:**
- `gemini-pro`: `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent`
- `gemini-1.5-pro`: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent`
- `gemini-2.0-flash`: `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent`

Users can configure the endpoint in the options page. If no custom endpoint is set, the default (gemini-2.5-flash) is used automatically.

### Custom Prompt Templates

The add-on supports up to 3 custom prompt templates that users can configure:

**Features:**
- Each template has a name and content
- Template names are displayed in the popup UI for easy selection
- Users can select and edit templates before analyzing emails
- Templates are stored in browser.storage.local
- Prompts are prepended to the analysis request

**Storage Format:**
```javascript
{
  customPromptTemplates: {
    template1: { name: 'Business Email', content: 'Review this email...' },
    template2: { name: 'Casual Email', content: 'Check if...' },
    template3: { name: '', content: '' }
  }
}
```

**UI Flow:**
1. User opens popup → Template selector appears
2. User selects a template from dropdown (displays template names)
3. Template content loads into editable textarea
4. User can modify the prompt before analysis
5. Modified prompt is used for that specific review
6. Original template in settings remains unchanged

### Request Format
```javascript
{
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey
  },
  body: JSON.stringify({
    contents: [{
      parts: [{ text: prompt }]
    }]
  })
}
```

### Response Format
```javascript
{
  candidates: [{
    content: {
      parts: [{ text: "Analysis result..." }]
    }
  }]
}
```

## Testing Strategy

### Manual Testing Checklist
- [ ] Install add-on in Thunderbird
- [ ] Configure API key in settings
- [ ] Test connection verification
- [ ] Compose email and trigger review
- [ ] Verify analysis appears correctly
- [ ] Test error handling (invalid API key)
- [ ] Test with various email formats
- [ ] Test with long emails (>10k chars)
- [ ] Verify buttons work (Edit Email, Send Anyway)

### Edge Cases Handled
- Empty subject/body/recipients
- Very long emails (truncated at 10k chars)
- Recipients in different formats (array vs string)
- Invalid API key
- Network errors
- API rate limiting
- Malformed API responses

## Future Enhancements (Out of Scope)

1. **Attachment Analysis**: Detect missing attachments based on email content
2. **Multiple AI Models**: Support other AI providers (OpenAI, Claude, etc.)
3. **Batch Review**: Review multiple draft emails at once
4. **History**: Track review history and common issues
5. **Suggestions Apply**: Auto-apply AI suggestions with one click
6. **Offline Mode**: Cache common checks for offline use
7. **Language Support**: Multi-language email analysis
8. **More Template Slots**: Support more than 3 custom prompt templates

## Known Limitations

1. **API Dependency**: Requires active internet connection and valid API key
2. **No Attachment Analysis**: Cannot check actual attachment presence
3. **Rate Limits**: Subject to Google's API rate limits (60 req/min on free tier)
4. **Plain Text Only**: Analyzes plain text body, not HTML formatting
5. **No Real-time**: Analysis happens on-demand, not as you type
6. **English Focused**: AI works best with English emails

## Development Environment

### Requirements
- Thunderbird 102.0 or later
- Node.js (for syntax checking)
- Python 3 (for icon generation, Pillow)
- Internet connection for API testing

### Development Commands
```bash
# Validate JavaScript syntax
node --check *.js

# Validate JSON
python3 -m json.tool manifest.json

# Package extension (requires web-ext)
npm run package

# Run in Thunderbird (requires web-ext)
npm run start
```

### Loading for Development
1. Open Thunderbird
2. Go to Tools → Add-ons and Themes
3. Click gear icon → Debug Add-ons
4. Click "Load Temporary Add-on"
5. Select manifest.json from this directory

## Maintenance Notes

### Version Updates
- Update version in `manifest.json` and `package.json` together
- Update README if features change
- Run security scans before releases

### API Changes
If Google changes the Gemini API:
- Update endpoint in `popup.js` and `options.js`
- Update request/response format as needed
- Update error handling for new error codes
- Test thoroughly before release

### Browser Compatibility
- Thunderbird 102+: Fully supported
- Older versions: May lack compose API features
- Test on multiple Thunderbird versions before release

## Contributing Guidelines

1. Maintain minimal code changes
2. Follow existing code style
3. Add comments for complex logic only
4. Run syntax validation before committing
5. Run CodeQL security scan
6. Update documentation if behavior changes
7. Test manually in Thunderbird

## License
MIT License - See LICENSE file
