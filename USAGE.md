# Usage Guide

English | [日本語](USAGE.ja.md)

## Quick Start

1. **Install the Add-on**
   - Install the add-on in Thunderbird (see README.md for installation instructions)

2. **Configure Your API Key and Endpoint**
   - Go to **Tools** → **Add-ons and Themes**
   - Find **Gemini Mail Review** and click **Preferences**
   - Enter your Gemini API key
   - (Optional) Customize the API endpoint URL to use a different Gemini model
     - Default: `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`
     - You can change this to use other models like `gemini-pro`, `gemini-1.5-pro`, etc.
   - (Optional) Add custom prompt templates to customize how Gemini analyzes your emails
     - You can save up to 3 custom prompt templates with names
     - Each template can have a descriptive name and custom instructions
     - **Multi-language Support**: Write your custom prompt in any language, and Gemini will respond in that same language
       - English prompt → English analysis results
       - Japanese prompt (日本語) → Japanese analysis results (日本語)
       - Spanish prompt (Español) → Spanish analysis results (Español)
       - This works for any language supported by Gemini
     - Example for business email checking (English): "Review this email for business communication. Check if the language is polite, appropriate for clients, and sufficiently formal. Flag any inappropriate, unnatural, or misleading expressions."
     - Example for business email checking (Japanese): "以下のメール本文が、取引先・顧客など会社宛てのメールとして、敬語や言い回しが適切か、失礼・不自然・誤解を招く表現がないか、ビジネスメールとして十分にフォーマルかを確認してください。問題点があれば、理由とあわせて修正案を提示してください。"
   - Click **Test Connection** to verify your configuration
   - Click **Save Settings**

   ![Settings Page](doc/images/settings-page.png)
   *Settings page showing API key configuration, custom prompts, and other options*

3. **Compose an Email**
   - Create a new email or reply to an existing one
   - Write your email as usual

4. **Review Before Sending**
   - Before clicking Send, click the **Gemini Mail Review** icon in the compose toolbar
   
   ![Compose Window with Icon](doc/images/compose-window-icon.png)
   *The Gemini Mail Review icon in the Thunderbird compose window toolbar*
   
   - The popup opens with template selection:
     - Select a custom prompt template from the dropdown (if you configured any)
     - Review and edit the custom prompt if needed
     - Click **Analyze Email** to start the analysis
   
   ![Template Selection](doc/images/popup-template-selection.png)
   *Popup showing template selection and custom prompt editor*
   
   - Wait for the AI analysis (typically 2-5 seconds)
   
   ![Analyzing](doc/images/popup-analyzing.png)
   *Analysis in progress*
   
   - Review the feedback
   
   ![Analysis Results](doc/images/popup-results.png)
   *AI feedback and suggestions displayed*

5. **Act on Feedback**
   - **Edit Email**: Close the popup and make changes based on suggestions
   - **Send Anyway**: Close the popup and proceed to send (you still need to click the Send button)

## Understanding Cached Results

When you analyze the same email multiple times, the add-on uses smart caching to save API calls and provide instant feedback.

### Cached Response
When you review an email you've already analyzed, you'll see a cached response indicator:

![Cached Result](doc/images/popup-cached-result.png)
*Cached analysis result showing instantly with "📦 Showing cached response" indicator*

### Content Changed Warning
If you edit your email after analyzing it, the next review will show the previous analysis with a warning:

![Content Changed](doc/images/popup-content-changed.png)
*Previous analysis displayed with "⚠️ Email content has changed" warning and option to request fresh analysis*

This allows you to:
- Quickly see your previous feedback
- Decide if you need a new analysis for your changes
- Click "Request Again from Gemini" if you want fresh analysis of the updated content

## Example Use Cases

### Checking for Grammar Errors
**Scenario**: You're not sure if your email has any typos or grammar mistakes.

**Action**: Click the Gemini Mail Review button. The AI will identify spelling and grammar errors and suggest corrections.

### Verifying Professional Tone
**Scenario**: You're sending an important business email and want to ensure it sounds professional.

**Action**: Use the review feature to get feedback on tone and professionalism. The AI will tell you if the tone is appropriate or if adjustments are needed.

### Catching Missing Attachments
**Scenario**: You mentioned "see attached" in your email but forgot to attach the file.

**Action**: The AI can detect when you reference attachments and alert you if none are attached (note: this requires the email content to mention attachments).

### Clarity Check
**Scenario**: You wrote a complex email and want to ensure it's clear.

**Action**: The review will identify unclear sections and suggest ways to improve clarity and conciseness.

### Multi-language Email Review
**Scenario**: You write emails in languages other than English and want analysis in your native language.

**Action**: Create a custom prompt template in your preferred language. The AI will analyze your email and provide feedback in that same language. For example:
- Write your custom prompt in Japanese → Get analysis results in Japanese
- Write your custom prompt in Spanish → Get analysis results in Spanish
- Write your custom prompt in French → Get analysis results in French

**Example Custom Prompts by Language**:

**Japanese (日本語)**:
```
このメールを分析して、以下の点を確認してください：
- 文法とスペルミス
- 敬語の適切な使用
- ビジネスメールとしての適切さ
- 言い回しの自然さ
問題点があれば、理由と修正案を日本語で提示してください。
```

**Spanish (Español)**:
```
Analiza este correo electrónico y verifica:
- Gramática y ortografía
- Tono profesional
- Claridad del mensaje
- Posibles problemas
Proporciona comentarios y sugerencias en español.
```

**French (Français)**:
```
Analysez cet e-mail et vérifiez:
- La grammaire et l'orthographe
- Le ton professionnel
- La clarté du message
- Les problèmes potentiels
Fournissez des commentaires et des suggestions en français.
```

## Understanding Review Results

The AI analysis typically includes:

- **✓ Positive Feedback**: What's working well in your email
- **⚠️ Warnings**: Things that might be concerning but not necessarily errors
- **❌ Issues**: Problems that should be addressed before sending
- **💡 Suggestions**: Specific recommendations for improvement

## Tips for Best Results

1. **Write First, Review Later**: Complete your email before running the review for more comprehensive feedback
2. **Use Descriptive Subjects**: Include a subject line for better context analysis
3. **Review Regularly**: Make it a habit to review important emails before sending
4. **Don't Over-Rely**: Use the AI as a helpful assistant, not a replacement for your judgment
5. **Privacy Awareness**: Remember that your email is sent to Google's API for analysis

## Troubleshooting

### No Analysis Results
- Check your internet connection
- Verify your API key is configured correctly
- Ensure you haven't exceeded API rate limits

### Slow Response
- Large emails take longer to analyze
- API response times can vary based on server load
- Consider reviewing sections separately for very long emails

### Inaccurate Suggestions
- The AI is helpful but not perfect
- Use your judgment when evaluating suggestions
- Context matters - you know your recipient better than the AI

### API Key Issues
- Ensure your API key is valid and active
- Check that you haven't exceeded your quota
- Generate a new key if the old one isn't working

## Privacy and Security

- **What's Sent**: Subject, recipients, and email body
- **What's Not Sent**: Attachments, your API key (except to Google)
- **Data Storage**: Your API key is stored locally in Thunderbird
- **Data Transmission**: Sent securely via HTTPS to Google's Gemini API
- **Retention**: Refer to Google's privacy policy for how they handle API data

## API Usage and Limits

The free tier of Google's Gemini API includes:
- 60 requests per minute
- Sufficient for typical email usage

If you exceed limits:
- You'll see an error message
- Wait a minute before trying again
- Consider upgrading your API plan if needed

## Best Practices

1. **Pre-flight Check**: Always review before sending important emails
2. **Multiple Reviews**: If you make significant changes after a review, review again
3. **Learn from Feedback**: Pay attention to common issues the AI identifies in your writing
4. **Combine with Proofreading**: Use the AI review alongside your own proofreading
5. **Context Awareness**: Add context in your email if needed for better analysis

## Feature Requests and Feedback

If you have suggestions or find issues, please report them on the project's GitHub repository.
