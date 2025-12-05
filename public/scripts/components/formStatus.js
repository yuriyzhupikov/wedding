const statusElement = document.querySelector('#form-status');

export function setStatus(message, type = '') {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.className = `status ${type}`.trim();
}
