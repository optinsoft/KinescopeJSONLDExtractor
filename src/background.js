chrome.runtime.onInstalled.addListener(async () => {
  try {
    // First, clear the old dynamic scripts, if any
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    if (scripts.length > 0) {
      await chrome.scripting.unregisterContentScripts();
    }

    // Register the new one
    await chrome.scripting.registerContentScripts([{
      id: "network-interceptor",
      js: ["interceptor.js"],
      matches: ["<all_urls>"],
      allFrames: true,
      matchOriginAsFallback: true,
      runAt: "document_start",
      world: "MAIN" // <-- This makes the script run directly in the player's context, bypassing isolation
    }]);
    console.log("Interceptor successfully registered in MAIN world.");
  } catch (err) {
    console.error("Failed to register scripts:", err);
  }
});

// Listen for messages from both content scripts and the injected interceptor
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!sender.tab) return;
  
  if (message.type === "KINESCOPE_FOUND" || message.type === "M3U8_LINK_FOUND" || message.type === "MP4_LINK_FOUND") {
    // Forward to the main page console
    chrome.tabs.sendMessage(sender.tab.id, {
      type: "LOG_TO_MAIN_CONSOLE",
      subType: message.type,
      payload: message.payload
    });
  }
  
  // Logic for automatically saving files to the Downloads folder
  if (message.type === "SAVE_MEDIA_FILES") {
    const { folderName, logContent, jsonContent } = message.payload;

    // Remove characters forbidden in Windows folder names: \ / : * ? " < > |
    const safeFolderName = folderName.replace(/[\\/:*?"<>|]/g, "_").trim();
	
	  // Set the base path prefix (the kinescope folder inside Downloads)
    const baseTargetDir = `kinescope/${safeFolderName}`;

    // 1. Save log.txt
    const logBlobUrl = "data:text/plain;charset=utf-8," + encodeURIComponent(logContent);
    chrome.downloads.download({
      url: logBlobUrl,
      filename: `${baseTargetDir}/log.txt`,
      conflictAction: "overwrite"
    });

    // 2. Save json-ld.json
    const jsonBlobUrl = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonContent, null, 2));
    chrome.downloads.download({
      url: jsonBlobUrl,
      filename: `${baseTargetDir}/json-ld.json`,
      conflictAction: "overwrite"
    });
  }
});