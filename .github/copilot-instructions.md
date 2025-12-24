# GitHub Copilot Instructions

This file contains important instructions for GitHub Copilot and automated agents working on this repository.

## About This Repository

This repository contains a **Thunderbird add-on that uses Google's Gemini AI to review emails before sending**. The add-on analyzes email content for spelling, grammar, tone, clarity, and potential issues, providing intelligent feedback to help users improve their emails before they are sent.

## Build and Release Configuration

### When Adding New Files to the Addon

**IMPORTANT**: When code modifications add new files that are required for the addon to function, you MUST update the build workflow to include these files in the ZIP package.

#### Files to Update:
1. `.github/workflows/build-and-release.yml` - Add the new file to the "Create ZIP file" step

#### Current Addon Files (that must be included in ZIP):
The following files are part of the addon and must be included in the build:

**Core Files:**
- `manifest.json` - Addon manifest file
- `background.js` - Background script
- `crypto-utils.js` - Cryptographic utilities for secure storage

**Popup Interface:**
- `popup.html` - Main popup interface
- `popup.css` - Popup styles
- `popup.js` - Popup logic and API integration

**Settings Page:**
- `options.html` - Settings page
- `options.css` - Settings page styles
- `options.js` - Settings page logic

**Assets:**
- `icons/` - Directory containing addon icons (icon-16.png, icon-32.png, icon-48.png, icon-128.png)
- `_locales/` - Directory containing internationalization files

#### How to Update the Build Workflow:

When you add a new file (e.g., `new-feature.js`), add it to the "Create ZIP file" step in `.github/workflows/build-and-release.yml`:

```yaml
- name: Create ZIP file
  run: |
    # Create a clean build directory
    mkdir -p build
    
    # Copy necessary files to build directory
    cp manifest.json build/
    cp background.js build/
    cp crypto-utils.js build/
    cp new-feature.js build/    # <-- Add the new file here
    cp popup.html build/
    # ... rest of the files
```

**Note**: Always add new JavaScript files, HTML files, CSS files, or other resources that are referenced in `manifest.json` or loaded by the addon.

## Documentation Updates

### Documentation Structure

**IMPORTANT**: All documentation must be created in both English and Japanese.

#### Documentation Location Rules:

1. **README files** are kept in the **repository root**:
   - `README.md` (English)
   - `README.ja.md` (Japanese)

2. **USAGE files** are kept in the **repository root**:
   - `USAGE.md` (English)
   - `USAGE.ja.md` (Japanese)

3. **All other documentation** must be placed under the `doc/` directory:
   - English documentation: `doc/en/`
   - Japanese documentation: `doc/ja/`

#### Language Links Requirement:

**IMPORTANT**: All documentation files must include language links to their counterpart versions at the top of the file, similar to README.md.

- **English documents** should link to Japanese versions with format: `English | [日本語](../ja/FILENAME.md)` for doc/ files
- **Japanese documents** should link to English versions with format: `[English](../en/FILENAME.md) | 日本語` for doc/ files
- **Root documents** (README, USAGE) follow the pattern already established (e.g., `English | [日本語](README.ja.md)`)

This ensures users can easily switch between language versions of any document.

#### Example Documentation Structure:
```
repository-root/
├── README.md              # English README (root)
├── README.ja.md           # Japanese README (root)
├── USAGE.md               # English usage guide (root)
├── USAGE.ja.md            # Japanese usage guide (root)
└── doc/
    ├── en/
    │   ├── DEVELOPMENT.md  # English development guide
    │   ├── I18N.md         # English i18n guide
    │   └── SECURITY.md     # English security policy
    └── ja/
        ├── DEVELOPMENT.md  # Japanese development guide
        ├── I18N.md         # Japanese i18n guide
        └── SECURITY.md     # Japanese security policy
```

### When Modifying Code

**IMPORTANT**: When you modify code that affects functionality, features, or usage, you MUST update the relevant documentation files in **BOTH** English and Japanese.

#### Documentation Files to Check:

1. **README.md** (English) and **README.ja.md** (Japanese) - **Root directory**
   - Update when: Adding/removing features, changing setup steps, modifying usage instructions
   - Sections to check: Features, Setup, Usage, Project Structure

2. **USAGE.md** (English) and **USAGE.ja.md** (Japanese) - **Root directory**
   - Update when: Changing how users interact with the addon
   - Sections to check: Step-by-step usage instructions

3. **doc/en/DEVELOPMENT.md** (English) and **doc/ja/DEVELOPMENT.md** (Japanese)
   - Update when: Adding new files, changing project structure, modifying development workflow
   - Sections to check: Project Structure, Building, Testing

4. **doc/en/SECURITY.md** (English) and **doc/ja/SECURITY.md** (Japanese)
   - Update when: Modifying security features, encryption, data storage
   - Sections to check: Security features list, encryption mechanisms

5. **doc/en/I18N.md** (English) and **doc/ja/I18N.md** (Japanese)
   - Update when: Adding new UI elements that need translation
   - Sections to check: Translation keys list

### Documentation Update Checklist

When making code changes, ask yourself:

- [ ] Does this change add, remove, or modify a user-facing feature?
  - → Update README.md and README.ja.md (in root)
- [ ] Does this change how users interact with the addon?
  - → Update USAGE.md and USAGE.ja.md (in root)
- [ ] Does this change the project structure or add new files?
  - → Update doc/en/DEVELOPMENT.md and doc/ja/DEVELOPMENT.md (Project Structure section)
  - → Update .github/workflows/build-and-release.yml (if addon file)
- [ ] Does this change security features or data handling?
  - → Update doc/en/SECURITY.md and doc/ja/SECURITY.md
- [ ] Does this add new UI text or messages?
  - → Update doc/en/I18N.md and doc/ja/I18N.md
  - → Add translations to _locales/en/messages.json and _locales/ja/messages.json

### Example Scenarios

**Scenario 1**: Adding a new JavaScript module `email-validator.js`
- ✅ Add to `.github/workflows/build-and-release.yml` (in the ZIP creation step)
- ✅ Update `doc/en/DEVELOPMENT.md` and `doc/ja/DEVELOPMENT.md` (add to Project Structure)
- ✅ Update `README.md` and `README.ja.md` if it adds user-facing features

**Scenario 2**: Adding a new configuration option in `options.js`
- ✅ Update `README.md` and `README.ja.md` (Setup section)
- ✅ Update `USAGE.md` and `USAGE.ja.md` if it changes how users configure the addon
- ✅ Update `doc/en/I18N.md` and `doc/ja/I18N.md` if new UI text is added
- ✅ Add translations to `_locales/en/messages.json` and `_locales/ja/messages.json`

**Scenario 3**: Modifying the encryption mechanism in `crypto-utils.js`
- ✅ Update `doc/en/SECURITY.md` and `doc/ja/SECURITY.md` (explain the new mechanism)
- ✅ Update `README.md` and `README.ja.md` security section if user-visible

## Screenshots and Images

### Japanese Screenshots and Images

**IMPORTANT**: When creating screenshots or images containing Japanese text, you MUST use appropriate Japanese fonts to ensure proper text rendering.

#### Required Fonts:

Use the following fonts when creating Japanese screenshots or images:
- `font-noto-cjk` - Noto CJK (Chinese, Japanese, Korean) fonts
- `font-ipa` - IPA fonts (Japanese)

These fonts ensure that Japanese characters (hiragana, katakana, and kanji) are displayed correctly and professionally in all documentation images.

#### Installation (for documentation creators):

On Ubuntu/Debian-based systems:
```bash
sudo apt-get install fonts-noto-cjk fonts-ipafont
```

On Fedora/RHEL-based systems:
```bash
sudo dnf install google-noto-cjk-fonts ipa-gothic-fonts ipa-mincho-fonts
```

#### Usage:

When taking screenshots of the Thunderbird add-on interface with Japanese text:
1. Ensure the required fonts are installed on your system
2. Configure your screenshot tool or browser to use these fonts
3. Verify that Japanese characters render correctly before saving the image
4. Save images to the `doc/images/` directory with appropriate naming (e.g., `feature-name-ja.png` for Japanese versions)

## General Guidelines

1. **Keep documentation in sync**: Both English and Japanese documentation should be updated together
2. **Be specific**: Clearly describe what changed and why
3. **Update examples**: If code examples exist in documentation, update them to match the new code
4. **Test instructions**: Verify that setup and usage instructions still work after your changes

## Questions?

If you're unsure whether a change requires documentation updates, err on the side of updating documentation. It's better to have comprehensive, up-to-date documentation than to leave users confused.
