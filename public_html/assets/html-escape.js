// One encoder for text and quoted HTML attributes, shared by all workspaces.
globalThis.lifeOsHtml = Object.freeze({
  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
  }
});
