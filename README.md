# Gemini Mail Review - Thunderbird Add-on

A Thunderbird add-on that uses Google's Gemini AI to review your emails before sending. Get intelligent feedback on spelling, grammar, tone, clarity, and potential issues.

## Features

- 🤖 **AI-Powered Review**: Uses Google's Gemini Pro model to analyze your emails
- ✅ **Comprehensive Checks**: Reviews spelling, grammar, tone, professionalism, and clarity
- ⚠️ **Issue Detection**: Identifies potential problems like missing attachments or unclear messaging
- 🎯 **Easy to Use**: Simply click the add-on icon in the compose window
- 🔒 **Secure**: Your API key is stored locally in Thunderbird

## Installation

### From Source

1. Clone or download this repository
2. Open Thunderbird
3. Go to **Tools** → **Add-ons and Themes** (or press `Ctrl+Shift+A`)
4. Click the gear icon ⚙️ and select **Debug Add-ons**
5. Click **Load Temporary Add-on**
6. Navigate to the add-on directory and select the `manifest.json` file

### Requirements

- Thunderbird 102.0 or later
- A Google Gemini API key (free tier available)

## Setup

1. Get a Gemini API key:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Click **Create API Key**
   - Copy the generated key

2. Configure the add-on:
   - In Thunderbird, go to **Tools** → **Add-ons and Themes**
   - Find **Gemini Mail Review** in your add-ons list
   - Click **Options** or **Preferences**
   - Paste your API key and click **Save Settings**
   - (Optional) Click **Test Connection** to verify your key works

## Usage

1. Compose an email as usual in Thunderbird
2. Before sending, click the **Gemini Mail Review** icon in the compose window toolbar
3. The add-on will analyze your email and show the results
4. Review the AI feedback and suggestions
5. Choose to either:
   - **Edit Email**: Close the popup and make changes
   - **Send Anyway**: Proceed with sending (the email is not sent automatically - you still need to click Send)

## What Gets Analyzed

The add-on sends the following information to Gemini for analysis:
- Email subject line
- Recipient(s)
- Email body (plain text)

The AI reviews for:
- Spelling and grammar errors
- Tone and professionalism
- Clarity and conciseness
- Missing information
- Potential issues or concerns

## Privacy Notice

This add-on sends your email content to Google's Gemini API for analysis. Your emails are processed according to [Google's Privacy Policy](https://policies.google.com/privacy). The API key is stored locally in your Thunderbird profile and is never sent to any third party except Google's API endpoints.

**Important**: Do not use this add-on for highly sensitive or confidential emails unless you are comfortable with them being processed by Google's AI service.

## Development

### Project Structure

```
.
├── manifest.json       # Add-on manifest
├── background.js       # Background script
├── popup.html         # Main popup interface
├── popup.css          # Popup styles
├── popup.js           # Popup logic and API integration
├── options.html       # Settings page
├── options.css        # Settings page styles
├── options.js         # Settings page logic
└── icons/             # Add-on icons
```

### Building

This is a pure WebExtension with no build step required. Simply load the extension as described in the Installation section.

### Testing

1. Load the add-on as a temporary extension
2. Configure your API key in the settings
3. Compose a test email
4. Click the add-on icon to test the review functionality

## Troubleshooting

### "Please configure your Gemini API key"
- Go to the add-on settings and enter your API key
- Make sure the key is saved (you should see a success message)

### "API request failed" or connection errors
- Verify your API key is correct
- Check your internet connection
- Ensure you haven't exceeded the API rate limits (free tier has limits)
- Try testing the connection in the settings page

### The popup doesn't appear
- Make sure you're in a compose window (not the main Thunderbird window)
- Try closing and reopening the compose window
- Check the Thunderbird error console for any errors

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Disclaimer

This add-on is not officially affiliated with Google or Mozilla. Use at your own risk.
