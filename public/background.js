// ── CONTEXT MENU SETUP ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "alphabetsoup-readback",
    title: "Read back with AlphabetSoup",
    contexts: ["selection"],
  });
});

// ── CONTEXT MENU CLICK ───────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "alphabetsoup-readback") return;
  if (!info.selectionText) return;

  // Store the selected text then open the popup
  chrome.storage.session.set({ pendingText: info.selectionText.trim() }, () => {
    // Open the popup programmatically by opening the popup window
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html") + "?mode=readback",
      type: "popup",
      width: 520,
      height: 600,
      focused: true,
    });
  });
});

// ── KEYBOARD SHORTCUT ────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-popup") {
    chrome.action.openPopup();
  }
});
