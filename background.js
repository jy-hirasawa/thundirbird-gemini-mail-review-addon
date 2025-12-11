// Background script for Gemini Mail Review add-on
console.log("Gemini Mail Review add-on loaded");

// Initialize the extension
browser.runtime.onInstalled.addListener(() => {
  console.log("Gemini Mail Review add-on installed");
});
