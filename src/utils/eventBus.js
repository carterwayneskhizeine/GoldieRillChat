/**
 * Typed event bus — wraps window CustomEvent with a cleaner API.
 * Use this instead of bare window.dispatchEvent / window.addEventListener.
 *
 * Events that belong here (cannot be replaced by a Zustand store):
 *   editImage            — trigger image editor from a chat message
 *   show-link-dialog     — open link-insertion dialog in editor
 *   aichat-settings-change — AI Chat settings updated externally
 *   selectShaderPreset   — ThreeJS preset selection request
 *   shaderPresetsLoaded  — ThreeJS presets ready
 *   shaderPresetLoaded   — single preset loaded
 *   textarea-visibility-change — floating textarea show/hide
 *   textarea-position-change   — floating textarea reposition
 *   open-chat-settings   — open settings modal from anywhere
 *   switchTool           — switch tool with optional conversation context
 *                          (prefer useToolStore.setActiveTool for simple switches)
 */

const eventBus = {
  emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  },

  on(name, handler) {
    window.addEventListener(name, handler);
    return () => window.removeEventListener(name, handler);
  },

  off(name, handler) {
    window.removeEventListener(name, handler);
  },
};

export default eventBus;
