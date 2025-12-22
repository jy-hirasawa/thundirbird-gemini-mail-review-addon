# Security Policy

## Data Storage and Privacy

This add-on stores the following data locally in Thunderbird's browser.storage.local:

### Stored Data

1. **API Key** (`geminiApiKeyEncrypted`)
   - Your Google Gemini API key
   - **Encrypted using AES-GCM with a profile-specific key** (NEW in v1.1)
   - Profile-specific key is derived using PBKDF2 with 100,000 iterations
   - Encryption key is based on the browser runtime ID and a random salt
   - Never transmitted to any server except Google's Gemini API
   - Legacy unencrypted keys are automatically migrated on next save

2. **API Endpoint** (`geminiApiEndpoint`)
   - The Gemini API endpoint URL
   - Stored in plain text (not sensitive)
   - Validated to ensure HTTPS protocol and Google domains only
   - Protected against SSRF attacks

3. **Custom Prompt Templates** (`customPromptTemplatesEncrypted`)
   - Up to 3 custom prompt templates with names and content
   - **Encrypted using AES-GCM with a profile-specific key** (NEW in v1.1)
   - Same encryption key as API key
   - Sanitized to prevent prompt injection attacks
   - Limited to 100 characters for names and 5000 characters for content
   - Legacy unencrypted templates are automatically migrated on next save

4. **Email Cache** (`geminiCache`)
   - Cached analysis results including:
     - Email subject (sanitized)
     - Email recipients (sanitized)
     - Email body content (sanitized, max 10,000 characters)
     - AI analysis response
     - Timestamp
     - Custom prompt used
   - **Each cache entry is encrypted using AES-GCM with the email ID as the key** (NEW in v1.1)
   - Email ID is a SHA-256 hash of the email content (subject + recipients + body)
   - Encryption ensures cached data is tied to specific email content
   - Limited to 50 most recent entries
   - Automatically expires based on cache retention setting (default: 7 days)
   - Can be manually cleared via Settings

5. **Last Checked Hashes** (`lastCheckedHashes`)
   - SHA-256 hashes of recently checked emails for change detection
   - Limited to 20 most recent entries
   - Only stores hash values, not actual content
   - Not encrypted (already hashed)

6. **Profile Encryption Salt** (`profileEncryptionSalt`)
   - Random 16-byte salt used for key derivation
   - Generated once per profile
   - Stored as base64 string
   - Used to derive profile-specific encryption key

## Encryption Implementation

### Encryption Algorithm

- **Algorithm**: AES-GCM (Advanced Encryption Standard - Galois/Counter Mode)
- **Key Size**: 256 bits
- **IV Size**: 12 bytes (96 bits), randomly generated for each encryption
- **Authentication**: Built-in authentication tag with AES-GCM

### Key Derivation

1. **Profile-Specific Key** (for settings):
   - Derived using PBKDF2 with SHA-256
   - Iterations: 100,000 (high security for sensitive API keys)
   - Salt: Random 16-byte salt, unique per profile
   - Base material: Browser runtime ID (unique per installation/profile)

2. **Email-Specific Key** (for cache):
   - Derived using PBKDF2 with SHA-256
   - Iterations: 10,000 (lower for performance, still secure)
   - Salt: Fixed string for consistency
   - Base material: Email ID (SHA-256 hash of email content)

### Backward Compatibility

- Automatically detects and decrypts legacy unencrypted data
- Migrates to encrypted format on next save
- No data loss during migration

## Security Measures

### Encryption Benefits

1. **Enhanced Data Protection**
   - API keys and custom prompts are no longer stored in plain text
   - Cached email content is encrypted with email-specific keys
   - Protection against unauthorized access to profile directory

2. **Profile-Specific Encryption**
   - Each Thunderbird profile has its own encryption key
   - Data encrypted in one profile cannot be decrypted in another
   - Provides isolation between different installations

3. **Email-Specific Cache Encryption**
   - Each cached email is encrypted with a key derived from its content
   - Even if someone accesses the cache, they need the email content to decrypt
   - Provides additional layer of security for cached data

### Input Validation and Sanitization

1. **API Endpoint Validation**
   - Must use HTTPS protocol
   - Cannot be localhost or private IP addresses
   - Must be a Google API domain (googleapis.com)

2. **Content Sanitization**
   - Email content is sanitized before being sent to the API
   - Removes common prompt injection patterns
   - Limits content length to 10,000 characters
   - Removes markdown code blocks and instruction tags
   - Removes AI jailbreak patterns (e.g., "ignore previous instructions")

3. **Custom Prompt Sanitization**
   - Limited to 5,000 characters
   - Removes prompt injection patterns
   - Template names limited to 100 characters

4. **XSS Prevention**
   - Analysis results are displayed using `textContent` (not `innerHTML`)
   - No user-generated HTML is rendered

### Cache Security

1. **Encryption** (NEW in v1.1)
   - Each cache entry is encrypted with AES-GCM using the email ID as key
   - Email ID is derived from email content (SHA-256 hash)
   - Provides content-specific encryption for cached data

2. **Automatic Expiration**
   - Cached data automatically expires after the configured retention period
   - Default retention: 7 days (configurable 1-365 days)
   - Expired entries are automatically cleaned up

3. **Manual Cache Clearing**
   - Users can manually clear all cached data via Settings
   - Includes confirmation dialog to prevent accidental deletion

4. **Size Limits**
   - Cache limited to 50 most recent entries
   - Oldest entries automatically removed when limit is reached

## Privacy Considerations

### Data Transmission

- Email content is transmitted to Google's Gemini API for analysis
- Data is sent over HTTPS
- Subject to [Google's Privacy Policy](https://policies.google.com/privacy)

### Data Storage

- All data is stored locally in Thunderbird's profile directory
- No data is transmitted to third parties except Google's Gemini API
- **API key and custom prompts are now encrypted** (NEW in v1.1)
- **Cached email data is now encrypted** (NEW in v1.1)
- Encryption keys are derived from profile-specific and email-specific identifiers

### Recommendations for Sensitive Emails

For emails containing sensitive or confidential information:

1. **Clear Cache Regularly**
   - Use the "Clear All Cached Data" button in Settings
   - Consider clearing cache after handling sensitive emails

2. **Reduce Cache Retention**
   - Set cache retention to 1 day for sensitive work
   - Configure in Settings → Cache Retention Days

3. **Disable Caching** (Manual Approach)
   - Clear cache before and after each use
   - Note: This will require API calls for every email check

4. **Review Privacy Policy**
   - Understand that email content is sent to Google's AI service
   - Review Google's data handling practices

5. **Consider Not Using the Add-on**
   - For highly confidential emails, consider not using AI review
   - Rely on manual review instead

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this add-on, please report it by:

1. Opening a GitHub issue with the tag `security`
2. Providing detailed information about the vulnerability
3. Not publicly disclosing the vulnerability until it has been addressed

## Limitations

### Browser Storage Security

- **Encryption is now implemented** (NEW in v1.1)
  - API keys and custom prompts are encrypted with AES-GCM
  - Cached email data is encrypted with email-specific keys
  - Encryption keys are derived from profile and email identifiers
- However, encryption keys are derived from runtime identifiers
  - Someone with access to your Thunderbird profile can still potentially access data
  - The encryption provides additional protection but is not end-to-end encryption
- Browser storage is still accessible to other add-ons with storage permissions

### Encryption Limitations

- **Key Derivation**: Encryption keys are derived from browser runtime ID and salts
  - Not as strong as user-provided passwords
  - Provides protection against casual access to profile directory
  - Does not protect against determined attackers with full system access

- **No Master Password**: Unlike a password manager, there is no master password
  - Trade-off between usability and security
  - Users don't need to enter a password each time
  - But encryption is automatic and transparent

### No End-to-End Encryption

- Email content is transmitted to Google's servers
- Content is not encrypted end-to-end (beyond HTTPS in transit)
- Google may process and analyze the data according to their privacy policy

### Local System Security

- Security depends on the security of your local system
- Malware or unauthorized access to your computer could expose stored data
- Keep your system secure with up-to-date antivirus and security patches
- Use disk encryption for additional protection

## Best Practices

1. **API Key Management**
   - Treat your API key like a password
   - Don't share your API key
   - Rotate your API key periodically
   - Use API key restrictions in Google Cloud Console

2. **System Security**
   - Keep Thunderbird updated
   - Keep your operating system updated
   - Use strong passwords/encryption for your user account
   - Enable disk encryption if handling sensitive data

3. **Cache Management**
   - Regularly clear cache for sensitive emails
   - Adjust retention period based on your security needs
   - Monitor what data is being cached

4. **Privacy Awareness**
   - Understand that AI services process your data
   - Review Google's privacy policy regularly
   - Be mindful of what content you submit for analysis

## Updates and Maintenance

- Security improvements are ongoing
- Check for updates regularly
- Review changelog for security-related fixes
- Report any security concerns via GitHub issues
