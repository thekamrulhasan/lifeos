// Utility functions
const escapeHtml = globalThis.lifeOsHtml.escapeHtml;

function showToast(message, type = 'info') {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;

  void toast.offsetWidth;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function closeModal(modalId) {
  const modal = $(modalId);
  if (modal && modal.open) {
    modal.close();
  }
}
