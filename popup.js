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
let cachedTTL = null; // Cache the TTL value to avoid redundant storage reads
let customPromptTemplates = null; // Store loaded templates

// Cache retention period constants (must match options.js)
const DEFAULT_CACHE_RETENTION_DAYS = 7;
const MIN_CACHE_RETENTION_DAYS = 1;
const MAX_CACHE_RETENTION_DAYS = 365;

// Default cache TTL: 7 days in milliseconds
const DEFAULT_CACHE_TTL = DEFAULT_CACHE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

// Get cache TTL from settings or use default
async function getCacheTTL() {
  // Return cached value if available
  if (cachedTTL !== null) {
    return cachedTTL;
  }
  
  try {
    const { cacheRetentionDays } = await browser.storage.local.get('cacheRetentionDays');
    let days = cacheRetentionDays ?? DEFAULT_CACHE_RETENTION_DAYS;
    
    // Validate retrieved value to prevent corrupted data
    if (typeof days !== 'number' || days < MIN_CACHE_RETENTION_DAYS || days > MAX_CACHE_RETENTION_DAYS) {
      console.warn(`Invalid cache retention days value: ${days}, using default`);
      days = DEFAULT_CACHE_RETENTION_DAYS;
    }
    
    cachedTTL = days * 24 * 60 * 60 * 1000;
    return cachedTTL;
  } catch (error) {
    console.error('Error getting cache TTL:', error);
    cachedTTL = DEFAULT_CACHE_TTL;
    return DEFAULT_CACHE_TTL;
  }
}

// Listen for storage changes to invalidate cached TTL
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.cacheRetentionDays) {
      // Invalidate cached TTL when setting changes
      cachedTTL = null;
      console.log('Cache retention days changed, invalidating cached TTL');
    }
    if (changes.customPromptTemplates) {
      // Reload templates when they change
      customPromptTemplates = null;
      loadCustomPromptTemplates();
    }
  }
});

// Load custom prompt templates from storage
async function loadCustomPromptTemplates() {
  if (customPromptTemplates !== null) {
    return customPromptTemplates;
  }
  
  try {
    const { customPromptTemplates: templates, customPrompt } = await browser.storage.local.get(['customPromptTemplates', 'customPrompt']);
    
    if (templates) {
      customPromptTemplates = templates;
    } else if (customPrompt) {
      // Migrate from legacy single prompt
      customPromptTemplates = {
        template1: { name: '', content: customPrompt },
        template2: { name: '', content: '' },
        template3: { name: '', content: '' }
      };
    } else {
      // Initialize empty templates
      customPromptTemplates = {
        template1: { name: '', content: '' },
        template2: { name: '', content: '' },
        template3: { name: '', content: '' }
      };
    }
    
    return customPromptTemplates;
  } catch (error) {
    console.error('Error loading custom prompt templates:', error);
    customPromptTemplates = {
      template1: { name: '', content: '' },
      template2: { name: '', content: '' },
      template3: { name: '', content: '' }
    };
    return customPromptTemplates;
  }
}

// Update template selector options with names
async function updateTemplateSelectorOptions(selectorId) {
  const templates = await loadCustomPromptTemplates();
  const selector = document.getElementById(selectorId);
  
  if (!selector) return;
  
  // Update option labels with template names if they exist
  for (let i = 1; i <= 3; i++) {
    const template = templates[`template${i}`];
    const option = selector.options[i - 1];
    if (template && template.name) {
      option.textContent = template.name;
    } else {
      option.textContent = browser.i18n.getMessage(`customPromptTemplate${i}Label`) || `Template ${i}`;
    }
  }
}

// Handle template selection change
function handleTemplateChange(selectorId, promptEditId) {
  const selector = document.getElementById(selectorId);
  const promptEdit = document.getElementById(promptEditId);
  
  if (!selector || !promptEdit) return;
  
  const selectedValue = selector.value;
  
  if (customPromptTemplates) {
    const template = customPromptTemplates[`template${selectedValue}`];
    if (template) {
      promptEdit.value = template.content || '';
    }
  }
}

// Generate a unique ID for an email based on its content
async function generateEmailId(emailContent) {
  // Use JSON serialization to ensure unique and collision-free hashing
  const contentObject = {
    subject: emailContent.subject || '',
    to: emailContent.to || '',
    body: emailContent.body || ''
  };
  const contentString = JSON.stringify(contentObject);
  
  // Use crypto.subtle to generate SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(contentString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

// Remove expired entries from cache (older than cacheTTL)
function cleanupExpiredCache(cache, cacheTTL) {
  const now = Date.now();
  const cacheKeys = Object.keys(cache);
  let cleanedCount = 0;
  
  for (const key of cacheKeys) {
    // Safety check: ensure timestamp exists and is a number
    if (!cache[key] || typeof cache[key].timestamp !== 'number') {
      delete cache[key];
      cleanedCount++;
      continue;
    }
    
    const cacheAge = now - cache[key].timestamp;
    if (cacheAge > cacheTTL) {
      delete cache[key];
      cleanedCount++;
    }
  }
  
  return cleanedCount;
}

// Get cached response for an email ID
async function getCachedResponse(emailId) {
  try {
    const cacheTTL = await getCacheTTL();
    const result = await browser.storage.local.get('geminiCache');
    const cache = result.geminiCache || {};
    
    if (cache[emailId]) {
      // Safety check: ensure timestamp exists
      if (typeof cache[emailId].timestamp !== 'number') {
        delete cache[emailId];
        await browser.storage.local.set({ geminiCache: cache });
        return null;
      }
      
      const cacheAge = Date.now() - cache[emailId].timestamp;
      
      // Check if cache has expired (older than cacheTTL)
      if (cacheAge > cacheTTL) {
        // Cache expired, remove it and return null
        delete cache[emailId];
        await browser.storage.local.set({ geminiCache: cache });
        return null;
      }
      
      return {
        response: cache[emailId].response,
        timestamp: cache[emailId].timestamp,
        customPrompt: cache[emailId].customPrompt || ''
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached response:', error);
    return null;
  }
}

// Get the last checked content hash for a tab
async function getLastCheckedHash(tabId) {
  try {
    const result = await browser.storage.local.get('lastCheckedHashes');
    const hashes = result.lastCheckedHashes || {};
    const entry = hashes[tabId];
    
    // Handle both old format (string) and new format (object with hash/timestamp)
    if (!entry) {
      return null;
    }
    if (typeof entry === 'string') {
      return entry;  // Legacy format
    }
    return entry.hash || null;
  } catch (error) {
    console.error('Error getting last checked hash:', error);
    return null;
  }
}

// Save the last checked content hash for a tab
async function saveLastCheckedHash(tabId, emailId) {
  try {
    const result = await browser.storage.local.get('lastCheckedHashes');
    const hashes = result.lastCheckedHashes || {};
    
    // Store with timestamp for proper cleanup
    hashes[tabId] = {
      hash: emailId,
      timestamp: Date.now()
    };
    
    // Limit to last 20 tabs to prevent storage bloat
    const keys = Object.keys(hashes);
    if (keys.length > 20) {
      // Find and remove the oldest entry by timestamp
      let oldestKey = keys[0];
      let oldestTime = typeof hashes[oldestKey] === 'object' ? 
        (hashes[oldestKey].timestamp || 0) : 0;
      
      for (const key of keys) {
        const entry = hashes[key];
        const entryTime = typeof entry === 'object' ? 
          (entry.timestamp || 0) : 0;
        if (entryTime < oldestTime) {
          oldestTime = entryTime;
          oldestKey = key;
        }
      }
      
      delete hashes[oldestKey];
    }
    
    await browser.storage.local.set({ lastCheckedHashes: hashes });
  } catch (error) {
    console.error('Error saving last checked hash:', error);
  }
}

// Save response to cache
async function saveCachedResponse(emailId, response, customPrompt) {
  try {
    const cacheTTL = await getCacheTTL();
    const result = await browser.storage.local.get('geminiCache');
    const cache = result.geminiCache || {};
    
    // Remove expired entries (older than cacheTTL)
    cleanupExpiredCache(cache, cacheTTL);
    
    // Store the response with timestamp and custom prompt
    cache[emailId] = {
      response: response,
      timestamp: Date.now(),
      customPrompt: customPrompt || ''
    };
    
    // Limit cache size to prevent storage issues (keep last 50 entries)
    const cacheKeys = Object.keys(cache);
    if (cacheKeys.length > 50) {
      // Find and remove the oldest entry
      // O(n) iteration is acceptable here since cache is limited to 51 entries max
      let oldestKey = cacheKeys[0];
      let oldestTime = cache[oldestKey]?.timestamp || Date.now();
      
      for (const key of cacheKeys) {
        const timestamp = cache[key]?.timestamp;
        if (typeof timestamp === 'number' && timestamp < oldestTime) {
          oldestTime = timestamp;
          oldestKey = key;
        }
      }
      
      delete cache[oldestKey];
    }
    
    await browser.storage.local.set({ geminiCache: cache });
  } catch (error) {
    console.error('Error saving cached response:', error);
  }
}

// Get the current compose tab
async function getCurrentComposeTab() {
  // Check if tab ID is provided in URL parameter (when opened as separate window)
  const urlParams = new URLSearchParams(window.location.search);
  const tabIdParam = urlParams.get('tabId');
  
  if (tabIdParam) {
    // Validate that tabId is a valid numeric string
    const tabId = parseInt(tabIdParam, 10);
    if (!isNaN(tabId) && tabId > 0) {
      // Tab ID provided and valid, get the tab directly
      try {
        const tab = await browser.tabs.get(tabId);
        return tab;
      } catch (error) {
        console.error("Error getting tab by ID:", error);
        // Fall back to querying active tab
      }
    } else {
      console.warn("Invalid tab ID parameter:", tabIdParam);
    }
  }
  
  // Original behavior: query for active tab in current window (for popup mode)
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

// Populate custom prompt edit textarea
function populateCustomPromptEdit(customPrompt) {
  const customPromptEdit = document.getElementById('custom-prompt-edit');
  if (customPromptEdit) {
    customPromptEdit.value = customPrompt || '';
  }
}

// Display results
function displayResults(analysis, isFromCache = false, contentChanged = false, savedCustomPrompt = '', showPromptSection = false) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('status').style.display = 'none';
  document.getElementById('results').style.display = 'block';
  document.getElementById('analysis-content').textContent = analysis;
  
  // Show/hide cache indicator
  const cacheIndicator = document.getElementById('cache-indicator');
  const contentChangedIndicator = document.getElementById('content-changed-indicator');
  const reRequestButton = document.getElementById('re-request');
  const resultsPromptSection = document.getElementById('results-prompt-section');
  
  if (isFromCache) {
    if (contentChanged) {
      // Content has changed - show different indicator
      cacheIndicator.style.display = 'none';
      contentChangedIndicator.style.display = 'block';
    } else {
      // Same content - show normal cache indicator
      cacheIndicator.style.display = 'block';
      contentChangedIndicator.style.display = 'none';
    }
    reRequestButton.style.display = 'inline-block';
    resultsPromptSection.style.display = 'block';
    
    // Populate the custom prompt textarea with the saved prompt
    populateCustomPromptEdit(savedCustomPrompt);
  } else {
    cacheIndicator.style.display = 'none';
    contentChangedIndicator.style.display = 'none';
    
    // Show prompt section and re-request button if explicitly requested (after re-request)
    if (showPromptSection) {
      reRequestButton.style.display = 'inline-block';
      resultsPromptSection.style.display = 'block';
      
      // Populate the custom prompt textarea with the prompt that was just used
      populateCustomPromptEdit(savedCustomPrompt);
    } else {
      reRequestButton.style.display = 'none';
      resultsPromptSection.style.display = 'none';
    }
  }
}

// Display error
function displayError(message) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('status').style.display = 'none';
  document.getElementById('error').style.display = 'block';
  document.getElementById('error').textContent = message;
}

// Main analysis function
async function analyzeEmail(forceRefresh = false, useInitialPrompt = false) {
  try {
    // Get API key and endpoint from storage
    const { geminiApiKey, geminiApiEndpoint } = await browser.storage.local.get(['geminiApiKey', 'geminiApiEndpoint']);
    
    if (!geminiApiKey) {
      displayError(browser.i18n.getMessage('errorConfigureApiKey'));
      return;
    }
    
    // Get custom prompt from the appropriate textarea depending on which section is being used
    let customPromptEdit;
    if (useInitialPrompt) {
      customPromptEdit = document.getElementById('custom-prompt-edit-initial');
    } else {
      customPromptEdit = document.getElementById('custom-prompt-edit');
    }
    const customPrompt = customPromptEdit ? customPromptEdit.value.trim() : '';
    
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

    // Generate unique ID for this email based on content
    const emailId = await generateEmailId(emailContent);
    
    // Check if content has changed since last check for this tab
    const lastCheckedHash = await getLastCheckedHash(currentTab.id);
    const contentChanged = lastCheckedHash && lastCheckedHash !== emailId;
    
    // Check cache if not forcing refresh
    if (!forceRefresh) {
      // First, try to get cache for current content
      let cachedData = await getCachedResponse(emailId);
      if (cachedData) {
        // Display cached results for exact same content with saved prompt
        await saveLastCheckedHash(currentTab.id, emailId);
        displayResults(cachedData.response, true, false, cachedData.customPrompt);
        return;
      }
      
      // If content changed, try to show old cache from last check
      if (contentChanged) {
        cachedData = await getCachedResponse(lastCheckedHash);
        if (cachedData) {
          // Display old cached results with indicator that content changed, with saved prompt
          displayResults(cachedData.response, true, true, cachedData.customPrompt);
          return;
        }
      }
    }

    // Call Gemini API with custom prompt
    document.getElementById('status').textContent = browser.i18n.getMessage('analyzingEmail');
    const analysis = await analyzeEmailWithGemini(emailContent, geminiApiKey, apiEndpoint, customPrompt || '');
    
    // Save to cache with custom prompt
    await saveCachedResponse(emailId, analysis, customPrompt);
    
    // Save this as the last checked hash for this tab
    await saveLastCheckedHash(currentTab.id, emailId);
    
    // Display results
    // If this was a force refresh (re-request), show the prompt section for immediate re-editing
    displayResults(analysis, false, false, customPrompt, forceRefresh);
    
  } catch (error) {
    console.error('Error analyzing email:', error);
    displayError(browser.i18n.getMessage('errorPrefix') + ' ' + error.message);
  }
}

// Check for cached results on page load
async function checkForCachedResults() {
  try {
    // Get current compose tab
    currentTab = await getCurrentComposeTab();
    
    if (!currentTab) {
      // No compose tab, show initial prompt section
      document.getElementById('prompt-section').style.display = 'block';
      return false;
    }

    // Get compose details
    const details = await getComposeDetails(currentTab.id);
    
    // Prepare email content
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

    // Generate unique ID for this email based on content
    const emailId = await generateEmailId(emailContent);
    
    // Check if content has changed since last check for this tab
    const lastCheckedHash = await getLastCheckedHash(currentTab.id);
    const contentChanged = lastCheckedHash && lastCheckedHash !== emailId;
    
    // Try to get cache for current content
    let cachedData = await getCachedResponse(emailId);
    if (cachedData) {
      // Display cached results for exact same content with saved prompt
      await saveLastCheckedHash(currentTab.id, emailId);
      displayResults(cachedData.response, true, false, cachedData.customPrompt);
      return true;
    }
    
    // If content changed, try to show old cache from last check
    if (contentChanged) {
      cachedData = await getCachedResponse(lastCheckedHash);
      if (cachedData) {
        // Display old cached results with indicator that content changed, with saved prompt
        displayResults(cachedData.response, true, true, cachedData.customPrompt);
        return true;
      }
    }
    
    // No cache found, show initial prompt section
    document.getElementById('prompt-section').style.display = 'block';
    return false;
    
  } catch (error) {
    console.error('Error checking for cached results:', error);
    // Show initial prompt section on error
    document.getElementById('prompt-section').style.display = 'block';
    return false;
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
  // Localize UI first
  localizeUI();
  
  // Load and initialize custom prompt templates
  await loadCustomPromptTemplates();
  // Only update initial template selector - results section no longer has template selector
  // as it directly shows the saved custom prompt for the email
  await updateTemplateSelectorOptions('template-selector-initial');
  
  // Set up template selector change listener for initial selector only
  const templateSelectorInitial = document.getElementById('template-selector-initial');
  if (templateSelectorInitial) {
    templateSelectorInitial.addEventListener('change', () => handleTemplateChange('template-selector-initial', 'custom-prompt-edit-initial'));
    // Initialize the first template content
    handleTemplateChange('template-selector-initial', 'custom-prompt-edit-initial');
  }
  
  // Check for cached results on page load
  await checkForCachedResults();
  
  // Analyze button - for initial prompt section
  document.getElementById('analyze').addEventListener('click', async () => {
    // Hide prompt section and show loading
    document.getElementById('prompt-section').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('status').style.display = 'block';
    document.getElementById('status').textContent = browser.i18n.getMessage('analyzingEmail');
    
    // Start analysis using initial prompt
    await analyzeEmail(false, true);
  });
  
  // Re-request button - for results section
  document.getElementById('re-request').addEventListener('click', async () => {
    // Hide results and show loading
    document.getElementById('results').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('status').style.display = 'block';
    document.getElementById('status').textContent = browser.i18n.getMessage('analyzingEmail');
    
    // Force refresh from Gemini using results section prompt
    await analyzeEmail(true, false);
  });
  
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
