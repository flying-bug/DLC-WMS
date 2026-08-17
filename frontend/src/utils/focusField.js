/**
 * Helper to smoothly scroll to and focus an invalid / missing form input or select.
 * If the element is an input, it also selects the text for easy overwriting.
 *
 * @param {string} elementId - ID of DOM element or react-select inputId
 * @param {number} delay - delay in ms before focusing (default: 50ms)
 */
export const focusField = (elementId, delay = 50) => {
  if (!elementId) return;
  setTimeout(() => {
    const el = document.getElementById(elementId);
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof el.select === 'function') {
        el.select();
      }
    }
  }, delay);
};
