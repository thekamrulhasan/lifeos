// Inline edit helpers
function createInlineEditor(element, currentValue, className, replace, onFinish) {
  const input = document.createElement('input');
  input.type = 'text'; input.value = currentValue || ''; input.className = className;
  let finished = false;
  const finish = save => {
    if (finished) return;
    finished = true;
    const value = input.value.trim();
    input.remove();
    onFinish(save, value);
  };
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== 'Escape') return;
    event.preventDefault(); event.stopPropagation(); finish(event.key === 'Enter');
  });
  if (replace) element.replaceWith(input);
  else { element.textContent = ''; element.append(input); }
  input.focus(); input.select();
}

function startInlineEdit(element, currentValue, onSave, onCancel) {
  stopInlineEdit();
  createInlineEditor(element, currentValue, 'inline-edit-input', false, (save, value) => {
    if (save && onSave) onSave(value);
    else if (!save && onCancel) onCancel();
    else element.textContent = currentValue || '';
  });
}

function stopInlineEdit() {
  $$('.inline-edit-input').forEach(input => {
    if (input._blinkInterval) {
      clearInterval(input._blinkInterval);
    }
    input.remove();
  });
}
