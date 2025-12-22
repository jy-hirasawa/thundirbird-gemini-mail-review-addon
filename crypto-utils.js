// Encryption utility module for Gemini Mail Review add-on
// Provides encryption/decryption functions using Web Crypto API

/**
 * Generate or retrieve a unique profile-specific encryption key
 * This key is used to encrypt settings data
 * @returns {Promise<CryptoKey>} The encryption key
 */
async function generateProfileKey() {
  try {
    // Try to get existing profile key from storage
    const { profileEncryptionSalt } = await browser.storage.local.get('profileEncryptionSalt');
    
    let salt;
    if (profileEncryptionSalt) {
      // Convert stored base64 salt back to Uint8Array
      salt = Uint8Array.from(atob(profileEncryptionSalt), c => c.charCodeAt(0));
    } else {
      // Generate new random salt for this profile
      salt = crypto.getRandomValues(new Uint8Array(16));
      // Store salt as base64 string
      const saltBase64 = btoa(String.fromCharCode(...salt));
      await browser.storage.local.set({ profileEncryptionSalt: saltBase64 });
    }
    
    // Get a profile-specific identifier
    // Use runtime ID which is unique per profile/installation
    const runtimeId = browser.runtime.id;
    
    // Create a base key material from runtime ID
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(runtimeId),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    // Derive encryption key from key material using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    return key;
  } catch (error) {
    console.error('Error generating profile key:', error);
    throw error;
  }
}

/**
 * Derive an encryption key from a string identifier (e.g., email ID)
 * @param {string} identifier - The identifier to derive key from
 * @returns {Promise<CryptoKey>} The derived encryption key
 */
async function deriveKeyFromIdentifier(identifier) {
  try {
    const encoder = new TextEncoder();
    
    // Use a fixed salt for identifier-based keys to ensure consistency
    // The security comes from the identifier itself (email hash)
    const salt = encoder.encode('thunderbird-gemini-mail-cache-v1');
    
    // Import the identifier as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(identifier),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    // Derive encryption key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 10000, // Lower iterations for cache (performance consideration)
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    return key;
  } catch (error) {
    console.error('Error deriving key from identifier:', error);
    throw error;
  }
}

/**
 * Encrypt data using AES-GCM
 * @param {any} data - The data to encrypt (will be JSON stringified)
 * @param {CryptoKey} key - The encryption key
 * @returns {Promise<string>} Base64-encoded encrypted data with IV
 */
async function encryptData(data, key) {
  try {
    // Convert data to string
    const dataString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(dataString);
    
    // Generate random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encryptedBytes = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataBytes
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBytes.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBytes), iv.length);
    
    // Convert to base64 for storage
    const base64 = btoa(String.fromCharCode(...combined));
    return base64;
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw error;
  }
}

/**
 * Decrypt data using AES-GCM
 * @param {string} encryptedData - Base64-encoded encrypted data with IV
 * @param {CryptoKey} key - The decryption key
 * @returns {Promise<any>} The decrypted and parsed data
 */
async function decryptData(encryptedData, key) {
  try {
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedBytes = combined.slice(12);
    
    // Decrypt the data
    const decryptedBytes = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedBytes
    );
    
    // Convert back to string and parse JSON
    const decoder = new TextDecoder();
    const dataString = decoder.decode(decryptedBytes);
    const data = JSON.parse(dataString);
    
    return data;
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw error;
  }
}

/**
 * Encrypt settings data using profile-specific key
 * @param {any} data - The settings data to encrypt
 * @returns {Promise<string>} Base64-encoded encrypted data
 */
async function encryptSettings(data) {
  const key = await generateProfileKey();
  return await encryptData(data, key);
}

/**
 * Decrypt settings data using profile-specific key
 * @param {string} encryptedData - Base64-encoded encrypted settings data
 * @returns {Promise<any>} The decrypted settings data
 */
async function decryptSettings(encryptedData) {
  const key = await generateProfileKey();
  return await decryptData(encryptedData, key);
}

/**
 * Encrypt cache data using email ID as key
 * @param {any} data - The cache data to encrypt
 * @param {string} emailId - The email ID to use as encryption key
 * @returns {Promise<string>} Base64-encoded encrypted data
 */
async function encryptCacheData(data, emailId) {
  const key = await deriveKeyFromIdentifier(emailId);
  return await encryptData(data, key);
}

/**
 * Decrypt cache data using email ID as key
 * @param {string} encryptedData - Base64-encoded encrypted cache data
 * @param {string} emailId - The email ID to use as decryption key
 * @returns {Promise<any>} The decrypted cache data
 */
async function decryptCacheData(encryptedData, emailId) {
  const key = await deriveKeyFromIdentifier(emailId);
  return await decryptData(encryptedData, key);
}

/**
 * Check if data is encrypted (starts with base64 encoded binary data)
 * This is a heuristic check - encrypted data will be base64 and not valid JSON
 * @param {any} data - The data to check
 * @returns {boolean} True if data appears to be encrypted
 */
function isEncrypted(data) {
  // If data is not a string, it's not encrypted
  if (typeof data !== 'string') {
    return false;
  }
  
  // Try to parse as JSON - if it works, it's not encrypted
  try {
    JSON.parse(data);
    return false;
  } catch (e) {
    // Not valid JSON, check if it's valid base64
    try {
      atob(data);
      return true; // Valid base64, likely encrypted
    } catch (e2) {
      return false; // Not valid base64 either
    }
  }
}

// Export functions for use in other scripts
// Note: For WebExtension, we need to make these globally available
if (typeof window !== 'undefined') {
  window.CryptoUtils = {
    generateProfileKey,
    deriveKeyFromIdentifier,
    encryptData,
    decryptData,
    encryptSettings,
    decryptSettings,
    encryptCacheData,
    decryptCacheData,
    isEncrypted
  };
}
