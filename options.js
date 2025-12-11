// Options script for Gemini Mail Review add-on

const apiKeyInput = document.getElementById('api-key');
const toggleButton = document.getElementById('toggle-visibility');
const saveButton = document.getElementById('save');
const testButton = document.getElementById('test');
const statusDiv = document.getElementById('status');

// Load saved settings
async function loadSettings() {
  try {
    const { geminiApiKey } = await browser.storage.local.get('geminiApiKey');
    if (geminiApiKey) {
      apiKeyInput.value = geminiApiKey;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings
async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }
  
  try {
    await browser.storage.local.set({ geminiApiKey: apiKey });
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings: ' + error.message, 'error');
  }
}

// Test API connection
async function testConnection() {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showStatus('Please enter an API key first', 'error');
    return;
  }
  
  testButton.disabled = true;
  testButton.textContent = 'Testing...';
  
  try {
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      showStatus('✓ Connection successful! API key is valid.', 'success');
    } else {
      showStatus('Connection succeeded but received unexpected response', 'error');
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    showStatus('Connection failed: ' + error.message, 'error');
  } finally {
    testButton.disabled = false;
    testButton.textContent = 'Test Connection';
  }
}

// Toggle password visibility
function toggleVisibility() {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleButton.textContent = 'Hide';
  } else {
    apiKeyInput.type = 'password';
    toggleButton.textContent = 'Show';
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
document.addEventListener('DOMContentLoaded', loadSettings);
saveButton.addEventListener('click', saveSettings);
testButton.addEventListener('click', testConnection);
toggleButton.addEventListener('click', toggleVisibility);

// Save on Enter key
apiKeyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveSettings();
  }
});
