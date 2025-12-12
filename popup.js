// Popup script for Gemini Mail Review add-on

// Initialize i18n
function localizeUI() {
  // Localize all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const messageId = element.getAttribute('data-i18n');
    const message = browser.i18n.getMessage(messageId);
    if (message) {
      element.textContent = message;
    }
  });
  
  // Localize title
  const titleElement = document.querySelector('title[data-i18n]');
  if (titleElement) {
    const messageId = titleElement.getAttribute('data-i18n');
    const message = browser.i18n.getMessage(messageId);
    if (message) {
      document.title = message;
    }
  }
}

let currentTab = null;

// Get the current compose tab
async function getCurrentComposeTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

// Get the compose details
async function getComposeDetails(tabId) {
  try {
    const details = await browser.compose.getComposeDetails(tabId);
    return details;
  } catch (error) {
    console.error("Error getting compose details:", error);
    throw error;
  }
}

// Sanitize email content to prevent prompt injection
function sanitizeContent(content) {
  if (!content) return '';
  // Remove any potential prompt injection patterns
  // Limit length to prevent abuse
  const maxLength = 10000;
  let sanitized = content.substring(0, maxLength);
  
  // Escape various markdown and formatting characters that could be used for prompt injection
  sanitized = sanitized.replace(/```/g, '｀｀｀');
  sanitized = sanitized.replace(/^\s*#{1,6}\s/gm, ''); // Remove markdown headers at line start
  sanitized = sanitized.replace(/\[INST\]/gi, ''); // Remove instruction tags
  sanitized = sanitized.replace(/\[\/INST\]/gi, '');
  sanitized = sanitized.replace(/<<SYS>>/gi, ''); // Remove system tags
  sanitized = sanitized.replace(/<\/SYS>>/gi, '');
  sanitized = sanitized.replace(/^\s*---+\s*$/gm, '==='); // Replace horizontal rules
  
  return sanitized;
}

// Call Gemini API
async function analyzeEmailWithGemini(emailContent, apiKey, apiEndpoint, customPrompt) {
  // Sanitize email content
  const sanitizedSubject = sanitizeContent(emailContent.subject || '(No subject)');
  const sanitizedTo = sanitizeContent(emailContent.to || '(No recipient)');
  const sanitizedBody = sanitizeContent(emailContent.body || '(Empty body)');
  
  // Build the prompt - prepend custom prompt if provided
  let prompt = '';
  
  if (customPrompt && customPrompt.trim()) {
    prompt = `${customPrompt.trim()}\n\n`;
  }
  
  prompt += `You are an email assistant. Review the following email before it is sent. Check for:
1. Spelling and grammar errors
2. Tone and professionalism
3. Clarity and conciseness
4. Missing information or attachments mentioned but not attached
5. Potential issues or concerns

Email content:
---
Subject: ${sanitizedSubject}
To: ${sanitizedTo}
Body:
${sanitizedBody}
---

Provide a concise review with specific suggestions. If the email looks good, say so. If there are issues, list them clearly.`;

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

// Display results
function displayResults(analysis) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('status').style.display = 'none';
  document.getElementById('results').style.display = 'block';
  document.getElementById('analysis-content').textContent = analysis;
}

// Display error
function displayError(message) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('status').style.display = 'none';
  document.getElementById('error').style.display = 'block';
  document.getElementById('error').textContent = message;
}

// Main analysis function
async function analyzeEmail() {
  try {
    // Get API key, endpoint, and custom prompt from storage
    const { geminiApiKey, geminiApiEndpoint, customPrompt } = await browser.storage.local.get(['geminiApiKey', 'geminiApiEndpoint', 'customPrompt']);
    
    if (!geminiApiKey) {
      displayError(browser.i18n.getMessage('errorConfigureApiKey'));
      return;
    }
    
    // Use default endpoint if not configured
    const apiEndpoint = geminiApiEndpoint || 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

    // Get current compose tab
    currentTab = await getCurrentComposeTab();
    
    if (!currentTab) {
      displayError(browser.i18n.getMessage('errorComposeWindow'));
      return;
    }

    // Get compose details
    const details = await getComposeDetails(currentTab.id);
    
    // Prepare email content - handle various recipient formats
    let toRecipients = '';
    if (details.to) {
      if (Array.isArray(details.to)) {
        toRecipients = details.to.join(', ');
      } else if (typeof details.to === 'string') {
        toRecipients = details.to;
      }
    }
    
    const emailContent = {
      subject: details.subject || '',
      to: toRecipients,
      body: details.plainTextBody || details.body || ''
    };

    // Call Gemini API with custom prompt
    document.getElementById('status').textContent = browser.i18n.getMessage('analyzingEmail');
    const analysis = await analyzeEmailWithGemini(emailContent, geminiApiKey, apiEndpoint, customPrompt || '');
    
    // Display results
    displayResults(analysis);
    
  } catch (error) {
    console.error('Error analyzing email:', error);
    displayError(browser.i18n.getMessage('errorPrefix') + ' ' + error.message);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Localize UI first
  localizeUI();
  
  // Start analysis when popup opens
  analyzeEmail();
  
  // Send anyway button
  document.getElementById('send-anyway').addEventListener('click', () => {
    window.close();
  });
  
  // Edit email button
  document.getElementById('edit-email').addEventListener('click', () => {
    window.close();
  });
  
  // Settings link
  document.getElementById('open-settings').addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
    window.close();
  });
});
