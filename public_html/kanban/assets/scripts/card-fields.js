function renderCustomFields() {
  const container = $('cardCustomFields');
  container.replaceChildren();
  state.draftCustomFields.forEach(field => {
    const row = document.createElement('div');
    row.className = 'custom-field-row';
    const name = document.createElement('input');
    name.className = 'input'; name.value = field.name; name.maxLength = 60;
    name.placeholder = 'Field name'; name.setAttribute('aria-label', 'Custom field name');
    name.addEventListener('input', () => { field.name = name.value; });
    const value = document.createElement('input');
    value.className = 'input'; value.value = field.value; value.maxLength = 500;
    value.placeholder = 'Value'; value.setAttribute('aria-label', 'Custom field value');
    value.addEventListener('input', () => { field.value = value.value; });
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'btn-ghost'; remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${field.name || 'custom field'}`);
    remove.addEventListener('click', () => { state.draftCustomFields = state.draftCustomFields.filter(item => item.id !== field.id); renderCustomFields(); });
    row.append(name, value, remove);
    container.append(row);
  });
}

function renderCardActivity(card) {
  const container = $('cardComments');
  container.replaceChildren();
  (card.comments || []).slice().reverse().forEach(comment => {
    const row = document.createElement('article');
    row.className = 'trello-comment';
    const avatar = document.createElement('span');
    avatar.className = 'comment-avatar';
    avatar.textContent = 'E';
    const content = document.createElement('div');
    const author = document.createElement('strong');
    author.textContent = 'You';
    const date = document.createElement('time');
    date.dateTime = new Date(comment.createdAt).toISOString();
    date.textContent = new Date(comment.createdAt).toLocaleString();
    const message = document.createElement('p');
    message.dir = 'auto';
    message.textContent = comment.text;
    content.append(author, date, message);
    row.append(avatar, content);
    container.append(row);
  });
  const dates = [];
  if (card.createdAt) dates.push('Created ' + new Date(card.createdAt).toLocaleString());
  if (card.updatedAt) dates.push('Last updated ' + new Date(card.updatedAt).toLocaleString());
  $('cardActivityDetails').textContent = dates.join('\n') || 'No earlier activity recorded.';
}

function saveCardComment() {
  const {boardId, columnId, cardId} = state.cardModal;
  const card = getColumn(boardId, columnId)?.cards.find(item => item.id === cardId);
  const text = $('cardComment').value.trim();
  if (!card || !text) return;
  card.comments = [...(card.comments || []), {id: crypto.randomUUID(), text, createdAt: Date.now()}];
  saveState();
  renderCardActivity(card);
  $('cardComment').value = '';
  $('saveCommentBtn').hidden = true;
  showToast('Comment saved', 'success');
}

function deleteCurrentCard() {
  const { boardId, columnId, cardId } = state.cardModal;
  if (!boardId || !columnId || !cardId) return;
  const board = getBoard(boardId);
  if (!board) return;
  const column = board.columns.find(c => c.id === columnId);
  if (!column) return;
  if (!confirm(`Delete card "${column.cards.find(c => c.id === cardId)?.title || ''}"?`)) return;
  column.cards = column.cards.filter(c => c.id !== cardId);
  saveState();
  render();
  closeCardModal();
  showToast('Card deleted', 'success');
}
