// Shared mutable state between main.js, window.js, and browserView.js
const state = {
  mainWindow: null,
  tabs: new Map(),
  viewMap: new Map(),
  activeTabId: null,
  sidebarWidth: 0,
  tray: null,
  browserWindow: null,
}

module.exports = state
