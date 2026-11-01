/**
 * Money Input Binder (Pure Vanilla JS)
 */
export function formatMoneyValue(val) {
  return typeof val === 'number' && val > 0 ? val.toLocaleString('id-ID') : '';
}

export function bindMoneyInput(inputEl, onValueChange, options) {
  if (!inputEl) return;
  inputEl.addEventListener('input', (e) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    const num = digits ? Number(digits) : 0;
    const formatted = formatMoneyValue(num);
    e.target.value = formatted;
    onValueChange?.(num);
  });
  if (options?.onBlur) {
    inputEl.addEventListener('blur', options.onBlur);
    inputEl.addEventListener('focusout', options.onBlur);
  }
}
