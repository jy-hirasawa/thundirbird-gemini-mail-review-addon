// Options script for Gemini Mail Review add-on

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
  
  // Localize placeholder attributes
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const messageId = element.getAttribute('data-i18n-placeholder');
    const message = browser.i18n.getMessage(messageId);
    if (message) {
      element.placeholder = message;
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

const apiKeyInput = document.getElementById('api-key');
const apiEndpointInput = document.getElementById('api-endpoint');
const customPromptName1Input = document.getElementById('custom-prompt-name-1');
const customPromptName2Input = document.getElementById('custom-prompt-name-2');
const customPromptName3Input = document.getElementById('custom-prompt-name-3');
const customPrompt1Input = document.getElementById('custom-prompt-1');
const customPrompt2Input = document.getElementById('custom-prompt-2');
const customPrompt3Input = document.getElementById('custom-prompt-3');
const cacheRetentionInput = document.getElementById('cache-retention-days');
const toggleButton = document.getElementById('toggle-visibility');
const saveButton = document.getElementById('save');
const testButton = document.getElementById('test');
const clearCacheButton = document.getElementById('clear-cache');
const statusDiv = document.getElementById('status');

// Default API endpoint
const DEFAULT_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';
// Cache retention period constants
const DEFAULT_CACHE_RETENTION_DAYS = 7;
const MIN_CACHE_RETENTION_DAYS = 1;
const MAX_CACHE_RETENTION_DAYS = 365;

// Sanitize custom prompt to prevent malicious content
function sanitizeCustomPrompt(prompt) {
  if (!prompt) return '';
  // Limit prompt length to reasonable size
  const maxLength = 5000;
  let sanitized = prompt.substring(0, maxLength).trim();
  
  // Remove potential system-level instruction injection patterns
  sanitized = sanitized.replace(/ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/gi, '[removed]');
  sanitized = sanitized.replace(/disregard\s+(all\s+)?(previous|above|prior)\s+instructions?/gi, '[removed]');
  sanitized = sanitized.replace(/forget\s+(all\s+)?(previous|above|prior)\s+instructions?/gi, '[removed]');
  
  return sanitized;
}

// Validate API endpoint URL to prevent SSRF attacks
function validateApiEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    // Only allow HTTPS protocol for security
    if (url.protocol !== 'https:') {
      return { valid: false, error: 'API endpoint must use HTTPS protocol' };
    }
    // Validate hostname is not a local/private address
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      return { valid: false, error: 'API endpoint cannot be a local or private address' };
    }
    // Validate it's the expected Google API domain (with flexibility for regional endpoints)
    // Use endsWith to ensure the domain is exactly googleapis.com or a subdomain of it
    if (!hostname.endsWith('.googleapis.com') && hostname !== 'googleapis.com' &&
        !hostname.endsWith('.google.com') && hostname !== 'google.com') {
      return { valid: false, error: 'API endpoint must be a Google API domain (googleapis.com)' };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid API endpoint URL format' };
  }
}

// Load saved settings
async function loadSettings() {
  try {
    const { 
      geminiApiKey, 
      geminiApiKeyEncrypted,
      geminiApiEndpoint, 
      customPrompt, // Legacy single prompt for migration
      customPromptTemplates,
      customPromptTemplatesEncrypted,
      cacheRetentionDays 
    } = await browser.storage.local.get([
      'geminiApiKey',
      'geminiApiKeyEncrypted',
      'geminiApiEndpoint', 
      'customPrompt',
      'customPromptTemplates',
      'customPromptTemplatesEncrypted',
      'cacheRetentionDays'
    ]);
    
    // Try to load encrypted API key first
    let apiKey = null;
    if (geminiApiKeyEncrypted) {
      try {
        apiKey = await window.CryptoUtils.decryptSettings(geminiApiKeyEncrypted);
        apiKeyInput.value = apiKey;
      } catch (error) {
        console.error('Error decrypting API key:', error);
        // Fall back to unencrypted if decryption fails
        if (geminiApiKey) {
          apiKey = geminiApiKey;
          apiKeyInput.value = apiKey;
        }
      }
    } else if (geminiApiKey) {
      // Legacy unencrypted API key
      apiKey = geminiApiKey;
      apiKeyInput.value = apiKey;
    }
    
    // Set API endpoint to saved value or default
    apiEndpointInput.value = geminiApiEndpoint || DEFAULT_API_ENDPOINT;
    
    // Try to load encrypted custom prompt templates first
    let templates = null;
    if (customPromptTemplatesEncrypted) {
      try {
        templates = await window.CryptoUtils.decryptSettings(customPromptTemplatesEncrypted);
      } catch (error) {
        console.error('Error decrypting custom prompt templates:', error);
        // Fall back to unencrypted if decryption fails
        templates = customPromptTemplates;
      }
    } else {
      templates = customPromptTemplates;
    }
    
    // Load custom prompt templates
    if (templates) {
      // Load from new format
      if (templates.template1) {
        customPromptName1Input.value = templates.template1.name || '';
        customPrompt1Input.value = templates.template1.content || '';
      }
      if (templates.template2) {
        customPromptName2Input.value = templates.template2.name || '';
        customPrompt2Input.value = templates.template2.content || '';
      }
      if (templates.template3) {
        customPromptName3Input.value = templates.template3.name || '';
        customPrompt3Input.value = templates.template3.content || '';
      }
    } else if (customPrompt) {
      // Migrate from legacy single prompt to template 1
      customPrompt1Input.value = customPrompt;
    }
    
    // Set cache retention days to saved value or default
    cacheRetentionInput.value = cacheRetentionDays ?? DEFAULT_CACHE_RETENTION_DAYS;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings
async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  const apiEndpoint = apiEndpointInput.value.trim();
  const cacheRetentionDays = parseInt(cacheRetentionInput.value, 10);
  
  // Get custom prompt templates
  const customPromptTemplates = {
    template1: {
      name: customPromptName1Input.value.trim().substring(0, 100), // Limit name length
      content: sanitizeCustomPrompt(customPrompt1Input.value)
    },
    template2: {
      name: customPromptName2Input.value.trim().substring(0, 100),
      content: sanitizeCustomPrompt(customPrompt2Input.value)
    },
    template3: {
      name: customPromptName3Input.value.trim().substring(0, 100),
      content: sanitizeCustomPrompt(customPrompt3Input.value)
    }
  };
  
  if (!apiKey) {
    showStatus(browser.i18n.getMessage('errorApiKeyRequired'), 'error');
    return;
  }
  
  if (!apiEndpoint) {
    showStatus(browser.i18n.getMessage('errorEndpointRequired'), 'error');
    return;
  }
  
  // Validate API endpoint for security
  const endpointValidation = validateApiEndpoint(apiEndpoint);
  if (!endpointValidation.valid) {
    showStatus(endpointValidation.error, 'error');
    return;
  }
  
  // Validate cache retention days
  if (isNaN(cacheRetentionDays) || cacheRetentionDays < MIN_CACHE_RETENTION_DAYS || cacheRetentionDays > MAX_CACHE_RETENTION_DAYS) {
    showStatus(browser.i18n.getMessage('errorCacheRetentionInvalid'), 'error');
    return;
  }
  
  try {
    // Encrypt sensitive data
    const encryptedApiKey = await window.CryptoUtils.encryptSettings(apiKey);
    const encryptedCustomPromptTemplates = await window.CryptoUtils.encryptSettings(customPromptTemplates);
    
    await browser.storage.local.set({ 
      geminiApiKeyEncrypted: encryptedApiKey,
      geminiApiEndpoint: apiEndpoint,
      customPromptTemplatesEncrypted: encryptedCustomPromptTemplates,
      cacheRetentionDays: cacheRetentionDays
    });
    
    // Remove legacy unencrypted fields after successful save
    // This migration is safe because encrypted versions were just saved successfully
    await browser.storage.local.remove(['geminiApiKey', 'customPrompt', 'customPromptTemplates']);
    
    showStatus(browser.i18n.getMessage('successSaved'), 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus(browser.i18n.getMessage('errorSaving') + ' ' + error.message, 'error');
  }
}

// Test API connection
async function testConnection() {
  const apiKey = apiKeyInput.value.trim();
  const apiEndpoint = apiEndpointInput.value.trim();
  
  if (!apiKey) {
    showStatus(browser.i18n.getMessage('errorTestApiKeyFirst'), 'error');
    return;
  }
  
  if (!apiEndpoint) {
    showStatus(browser.i18n.getMessage('errorTestEndpointFirst'), 'error');
    return;
  }
  
  // Validate API endpoint for security
  const endpointValidation = validateApiEndpoint(apiEndpoint);
  if (!endpointValidation.valid) {
    showStatus(endpointValidation.error, 'error');
    return;
  }
  
  // Basic API key format validation (Google API keys are typically 39 characters)
  if (apiKey.length < 20) {
    showStatus(browser.i18n.getMessage('errorApiKeyTooShort'), 'error');
    return;
  }
  
  testButton.disabled = true;
  testButton.textContent = browser.i18n.getMessage('testingButton');
  
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
            text: 'Hello, this is a test. Please respond with "OK".'
          }]
        }]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      showStatus(browser.i18n.getMessage('successTestConnection'), 'success');
    } else {
      showStatus(browser.i18n.getMessage('errorTestUnexpectedResponse'), 'error');
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    showStatus(browser.i18n.getMessage('errorTestConnectionFailed') + ' ' + error.message, 'error');
  } finally {
    testButton.disabled = false;
    testButton.textContent = browser.i18n.getMessage('testButton');
  }
}

// Toggle password visibility
function toggleVisibility() {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleButton.textContent = browser.i18n.getMessage('hideButton');
  } else {
    apiKeyInput.type = 'password';
    toggleButton.textContent = browser.i18n.getMessage('showButton');
  }
}

// Clear all cached data for security/privacy
async function clearCache() {
  if (!confirm(browser.i18n.getMessage('confirmClearCache') || 'Are you sure you want to clear all cached analysis results? This cannot be undone.')) {
    return;
  }
  
  try {
    await browser.storage.local.remove(['geminiCache', 'lastCheckedHashes']);
    showStatus(browser.i18n.getMessage('successCacheCleared') || 'Cache cleared successfully', 'success');
  } catch (error) {
    console.error('Error clearing cache:', error);
    showStatus(browser.i18n.getMessage('errorClearingCache') || 'Error clearing cache: ' + error.message, 'error');
  }
}

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  localizeUI();
  loadSettings();
  
  // Tab switching functionality
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      button.classList.add('active');
      const tabContent = document.getElementById(targetTab);
      if (tabContent) {
        tabContent.classList.add('active');
      }
    });
  });
});
saveButton.addEventListener('click', saveSettings);
testButton.addEventListener('click', testConnection);
toggleButton.addEventListener('click', toggleVisibility);
clearCacheButton.addEventListener('click', clearCache);

// Save on Enter key
apiKeyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveSettings();
  }
});
