const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

const state = {
  boards: [],
  activeBoardId: null,
  allProjects: false,
  editing: {
    type: null, // 'card' or 'column'
    id: null,
    element: null
  },
  dragging: {
    card: null,
    fromColumn: null,
    fromBoard: null
  },
  cardModal: {
    boardId: null,
    columnId: null,
    cardId: null
  },
  draftLabelIds: [],
  draftChecklists: []
};

const KEY = "kanban_boards_v1";
const GOALS_KEY = "edi_goals_v1";
const TODOS_KEY = "edi_todos_v1";

function applyTheme() {
  try {
    const theme = appStorage.getItem("edi_kanban_theme") ||
                  (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = "dark";
  }
}


function loadState() {
  try {
    const saved = appStorage.getItem(KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state.boards = parsed.boards || [];
      state.activeBoardId = parsed.activeBoardId || null;
      state.allProjects = parsed.allProjects === true;
      if (!state.activeBoardId && state.boards.length > 0) {
        state.activeBoardId = state.boards[0].id;
      }
      // Migrate existing boards to new column structure
      let migrated = false;
      state.boards.forEach(board => {
        if (board.columns && board.columns.length === 3) {
          migrated = true;
          // Add "To Review" and "Backlog" columns to existing boards
          const backlogCol = { id: crypto.randomUUID(), name: "Backlog", cards: [] };
          const reviewCol = { id: crypto.randomUUID(), name: "To Review", cards: [] };
          // Keep existing columns but rename if needed
          board.columns[0].name = "To Do";
          board.columns[1].name = "In Progress";
          board.columns[2].name = "Done";
          // Insert new columns
          board.columns.unshift(backlogCol);
          board.columns.splice(3, 0, reviewCol);
        }
        if (!Array.isArray(board.labelDefs)) { board.labelDefs = []; migrated = true; }
        board.columns.forEach(column => column.cards.forEach(card => {
          if (!Array.isArray(card.labelIds)) {
            migrated = true;
            card.labelIds = (card.labels || '').split(',').map(name => name.trim()).filter(Boolean).map(name => {
              let definition = board.labelDefs.find(label => label.name.toLowerCase() === name.toLowerCase());
              if (!definition) {
                const lower = name.toLowerCase();
                definition = {id: crypto.randomUUID(), name, color: lower.includes('urgent') || lower.includes('high') ? '#dc2626' : lower.includes('low') ? '#16a34a' : '#d97706'};
                board.labelDefs.push(definition);
              }
              return definition.id;
            });
            delete card.labels;
          }
          if (!Array.isArray(card.checklist)) { card.checklist = []; migrated = true; }
          if (typeof card.dueDate !== 'string') { card.dueDate = ''; migrated = true; }
        }));
      });
      if (migrated) saveState();
    } else {
      state.boards.push(createBoard("My Projects"));
      state.activeBoardId = state.boards[0].id;
    }
  } catch (e) {
    console.error("Failed to load kanban state:", e);
    state.boards = [createBoard("My Projects")];
    state.activeBoardId = state.boards[0].id;
  }
}

function setupEventListeners() {
  // Add board button
  $('addBoardBtn')?.addEventListener('click', () => openBoardModal());

  // Board form submit
  $('boardForm')?.addEventListener('submit', handleBoardSubmit);

  // Delete board
  $('deleteBoardBtn')?.addEventListener('click', () => {
    if (state.boards.length <= 1) {
      showToast('Cannot delete the last board', 'error');
      return;
    }
    if (!confirm('Delete this board and all its cards?')) return;
    const boardId = $('boardId').value;
    state.boards = state.boards.filter(b => b.id !== boardId);
    if (state.activeBoardId === boardId) {
      state.activeBoardId = state.boards[0].id;
    }
    saveState();
    render();
    closeModal('boardModal');
    showToast('Board deleted', 'success');
  });

  // Close modal
  $('closeBoardModal')?.addEventListener('click', () => closeModal('boardModal'));

  // Drag & drop for columns
  $('columnsContainer')?.addEventListener('dragover', handleCardContainerDragOver);
  $('columnsContainer')?.addEventListener('dragleave', handleCardContainerDragLeave);
  $('columnsContainer')?.addEventListener('drop', handleCardContainerDrop);

  // Close modal on backdrop click
  $('boardModal')?.addEventListener('click', (e) => {
    if (e.target === $('boardModal')) closeModal('boardModal');
  });

  // Card modal
  $('closeCardModal')?.addEventListener('click', closeCardModal);
  $('cardForm')?.addEventListener('submit', handleCardFormSubmit);
  $('cardModal')?.addEventListener('click', (e) => {
    if (e.target === $('cardModal')) closeCardModal();
  });
  $('deleteCardBtn')?.addEventListener('click', deleteCurrentCard);
  $('moveCardBtn').addEventListener('click', () => {
    document.querySelector('.editor-more').open = false;
    openMoveCard({...state.cardModal, fromEditor: true});
  });
  $('moveCardProject').addEventListener('change', renderMoveCardLists);
  $('moveCardForm').addEventListener('submit', moveCardToProject);
  ['closeMoveCard', 'cancelMoveCard'].forEach(id => $(id).addEventListener('click', () => {
    if (!state.moveCard?.busy) $('moveCardModal').close();
  }));
  $('moveCardModal').addEventListener('click', event => {
    if (event.target === $('moveCardModal') && !state.moveCard?.busy) $('moveCardModal').close();
  });
  $('moveCardModal').addEventListener('cancel', event => { if (state.moveCard?.busy) event.preventDefault(); });
  $('goalCardBtn').addEventListener('click', () => {
    document.querySelector('.editor-more').open = false;
    openGoalCard({...state.cardModal, fromEditor: true});
  });
  $('openGoalFromCardBtn')?.addEventListener('click', () => {
    const card = currentModalCard();
    if (card?.goalId) {
      closeCardModal();
      openGoalFromKanban(card.goalId);
    }
  });
  $('goalCardForm').addEventListener('submit', moveCardToGoal);
  ['closeGoalCard', 'cancelGoalCard'].forEach(id => $(id).addEventListener('click', () => {
    if (!state.goalCard?.busy) $('goalCardModal').close();
  }));
  $('goalCardModal').addEventListener('click', event => {
    if (event.target === $('goalCardModal') && !state.goalCard?.busy) $('goalCardModal').close();
  });
  $('goalCardModal').addEventListener('cancel', event => { if (state.goalCard?.busy) event.preventDefault(); });
  $('cardTitle')?.addEventListener('input', clearCardFormError);
  $('cardDescription')?.addEventListener('input', clearCardFormError);
  $('addLabelBtn')?.addEventListener('click', addBoardLabel);
  $('newLabelName')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addBoardLabel(); } });
  $('cardAddBtn').addEventListener('click', () => {
    const menu = $('cardAddMenu');
    if (menu.matches(':popover-open')) { menu.hidePopover(); return; }
    menu.showPopover();
    const buttonRect = $('cardAddBtn').getBoundingClientRect();
    menu.style.left = `${Math.max(12, Math.min(buttonRect.left, window.innerWidth - menu.offsetWidth - 12))}px`;
    menu.style.top = `${Math.max(12, Math.min(buttonRect.bottom + 8, window.innerHeight - menu.offsetHeight - 12))}px`;
    $('closeCardAddMenu').focus();
  });
  $('cardAddMenu').addEventListener('toggle', e => $('cardAddBtn').setAttribute('aria-expanded', String(e.newState === 'open')));
  $('closeCardAddMenu').addEventListener('click', () => { $('cardAddMenu').hidePopover(); $('cardAddBtn').focus(); });
  document.querySelectorAll('[data-add-target]').forEach(button => button.addEventListener('click', () => {
    $('cardAddMenu').hidePopover();
    if (button.dataset.addTarget === 'cardDates') { openCardDates(); return; }
    if (button.dataset.addTarget === 'cardChecklistSection') { openChecklistMenu(); return; }
    if (button.dataset.addTarget === 'cardAttachmentsSection') { openAttachmentMenu(); return; }
    const panel = $(button.dataset.addTarget);
    panel.hidden = false;
    document.querySelectorAll(`[data-editor-target="${panel.id}"]`).forEach(trigger => trigger.setAttribute('aria-expanded', 'true'));
    panel.scrollIntoView({block: 'nearest'});
    panel.querySelector('input, select, textarea')?.focus();
  }));
  $('addCustomFieldBtn').addEventListener('click', () => {
    state.draftCustomFields.push({id: crypto.randomUUID(), name: '', value: ''});
    renderCustomFields();
    $('cardCustomFields').lastElementChild?.querySelector('input')?.focus();
  });
  window.addEventListener('resize', () => { if ($('cardAddMenu').matches(':popover-open')) $('cardAddMenu').hidePopover(); });
  $('cardDatesBtn').addEventListener('click', openCardDates);
  $('cardChecklistBtn').addEventListener('click', openChecklistMenu);
  $('closeCardChecklistMenu').addEventListener('click', closeChecklistMenu);
  $('cardChecklistMenu').addEventListener('toggle', e => $('cardChecklistBtn').setAttribute('aria-expanded', String(e.newState === 'open')));
  $('createChecklistBtn').addEventListener('click', createCardChecklist);
  $('newChecklistTitle').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); createCardChecklist(); } });
  window.addEventListener('resize', () => { if ($('cardChecklistMenu').matches(':popover-open')) closeChecklistMenu(); });
  $('cardDateSummary').addEventListener('click', openCardDates);
  $('closeCardDatesMenu').addEventListener('click', closeCardDates);
  $('cardDatesMenu').addEventListener('toggle', e => $('cardDatesBtn').setAttribute('aria-expanded', String(e.newState === 'open')));
  $('saveCardDatesBtn').addEventListener('click', () => saveCardDates(false));
  $('removeCardDatesBtn').addEventListener('click', () => saveCardDates(true));
  document.querySelectorAll('[data-calendar-shift]').forEach(button => button.addEventListener('click', () => {
    state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + Number(button.dataset.calendarShift), 1);
    renderDateCalendar();
  }));
  ['Start', 'Due'].forEach(kind => {
    $(`date${kind}Enabled`).addEventListener('change', () => {
      $(`datePicker${kind}`).disabled = !$(`date${kind}Enabled`).checked;
      if (kind === 'Due') $('datePickerTime').disabled = !$('dateDueEnabled').checked;
      if ($(`date${kind}Enabled`).checked) state.calendarTarget = kind;
      renderDateCalendar();
    });
    $(`datePicker${kind}`).addEventListener('focus', () => { state.calendarTarget = kind; renderDateCalendar(); });
    $(`datePicker${kind}`).addEventListener('change', () => {
      const date = parseCardDate($(`datePicker${kind}`).value);
      if (date) state.calendarMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      state.calendarTarget = kind;
      renderDateCalendar();
    });
  });
  window.addEventListener('resize', () => { if ($('cardDatesMenu').matches(':popover-open')) closeCardDates(); });
  document.querySelectorAll('[data-editor-target]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.editorTarget === 'cardAttachmentsSection') { openAttachmentMenu(); return; }
      const panel = $(button.dataset.editorTarget);
      panel.hidden = !panel.hidden;
      button.setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) panel.querySelector('input, select, textarea')?.focus();
    });
  });
  $('editDescriptionBtn').addEventListener('click', () => {
    const editing = $('cardDescription').hidden;
    $('cardDescription').hidden = !editing;
    $('cardDescriptionPreview').hidden = editing;
    $('editDescriptionBtn').textContent = editing ? 'Done' : 'Edit';
    if (editing) $('cardDescription').focus();
    else $('cardDescriptionPreview').textContent = $('cardDescription').value || 'Add a more detailed description…';
  });
  $('cardComment').addEventListener('input', () => { $('saveCommentBtn').hidden = !$('cardComment').value.trim(); });
  $('saveCommentBtn').addEventListener('click', saveCardComment);
  $('toggleActivityDetails').addEventListener('click', () => {
    const showing = $('cardActivityDetails').hidden;
    $('cardActivityDetails').hidden = !showing;
    $('toggleActivityDetails').textContent = showing ? 'Hide details' : 'Show details';
    $('toggleActivityDetails').setAttribute('aria-expanded', String(showing));
  });
  $('closeCardAttachMenu').addEventListener('click', () => $('cardAttachMenu').hidePopover());
  $('uploadCardFiles').addEventListener('change', async e => { await uploadCardFiles(Array.from(e.target.files || [])); e.target.value = ''; });
  const dropZone = $('attachmentDropZone');
  ['dragenter', 'dragover'].forEach(type => dropZone.addEventListener(type, e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); }));
  dropZone.addEventListener('dragleave', e => { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); uploadCardFiles(Array.from(e.dataTransfer.files || [])); });
  window.addEventListener('resize', () => { if ($('cardAttachMenu').matches(':popover-open')) $('cardAttachMenu').hidePopover(); });

  document.addEventListener('click', e => {
    if (!e.target.closest('.column-menu')) closeColumnMenus();
    document.querySelectorAll('.card-menu[open]').forEach(menu => { if (!menu.contains(e.target)) menu.open = false; });
  });
  document.addEventListener('toggle', e => {
    if (e.target.matches('.card-menu') && e.target.open) {
      closeColumnMenus();
      document.querySelectorAll('.card-menu[open]').forEach(menu => { if (menu !== e.target) menu.open = false; });
    }
  }, true);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($('moveCardModal').open) return;
      if ($('cardAttachMenu').matches(':popover-open')) { e.preventDefault(); $('cardAttachMenu').hidePopover(); return; }
      if ($('cardChecklistMenu').matches(':popover-open')) { e.preventDefault(); closeChecklistMenu(); return; }
      if ($('cardDatesMenu').matches(':popover-open')) { e.preventDefault(); closeCardDates(); return; }
      if ($('cardAddMenu').matches(':popover-open')) { e.preventDefault(); $('cardAddMenu').hidePopover(); $('cardAddBtn').focus(); return; }
      const cardMenu = document.querySelector('.card-menu[open]');
      if (cardMenu) { cardMenu.open = false; cardMenu.querySelector('summary').focus(); return; }
      const openMenuButton = document.querySelector('.column-actions[aria-expanded="true"]');
      if (openMenuButton) { closeColumnMenus(); openMenuButton.focus(); }
      else if ($('cardModal')?.open) closeCardModal();
      else if ($('boardModal')?.open) closeModal('boardModal');
    }
  });
}

function saveState() {
  try {
    appStorage.setItem(KEY, JSON.stringify({
      boards: state.boards,
      activeBoardId: state.activeBoardId,
      allProjects: state.allProjects
    }));
  } catch (e) {
    console.error("Failed to save kanban state:", e);
    showToast("Unable to save board", "error");
  }
}

function createBoard(name) {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || "New Board",
    labelDefs: [],
    columns: [
      { id: crypto.randomUUID(), name: "Backlog", cards: [] },
      { id: crypto.randomUUID(), name: "To Do", cards: [] },
      { id: crypto.randomUUID(), name: "In Progress", cards: [] },
      { id: crypto.randomUUID(), name: "To Review", cards: [] },
      { id: crypto.randomUUID(), name: "Done", cards: [] }
    ],
    createdAt: Date.now()
  };
}

function getBoard(id) {
  return state.boards.find(b => b.id === id);
}

function getActiveBoard() {
  return getBoard(state.activeBoardId);
}

function getColumn(boardId, columnId) {
  const board = getBoard(boardId);
  if (!board) return null;
  return board.columns.find(c => c.id === columnId);
}

function kanbanColumnStage(name) {
  const n = String(name || '').trim().toLowerCase();
  if (['done', 'completed', 'complete'].includes(n)) return 'done';
  if (['in progress', 'doing', 'active', 'to review', 'review'].includes(n)) return 'in_progress';
  if (['to do', 'todo'].includes(n)) return 'todo';
  if (n === 'backlog') return 'backlog';
  return 'other';
}

function findKanbanColumnByStage(board, stage) {
  const cols = board?.columns || [];
  if (!cols.length) return null;
  const targets = stage === 'done'
    ? ['done', 'completed', 'complete']
    : stage === 'in_progress'
      ? ['in progress', 'doing', 'active', 'to review']
      : ['to do', 'todo', 'backlog'];
  for (const t of targets) {
    const found = cols.find(col => String(col.name || '').trim().toLowerCase() === t);
    if (found) return found;
  }
  if (stage === 'done') return cols[cols.length - 1];
  if (stage === 'in_progress') return cols[Math.min(2, cols.length - 1)];
  return cols[Math.min(1, cols.length - 1)];
}

function ensureBoardLabel(board, name, color) {
  const trimmed = String(name || '').trim().slice(0, 30);
  if (!trimmed) return null;
  if (!Array.isArray(board.labelDefs)) board.labelDefs = [];
  let def = board.labelDefs.find(l => String(l.name || '').trim().toLowerCase() === trimmed.toLowerCase());
  if (!def) {
    def = { id: crypto.randomUUID(), name: trimmed, color };
    board.labelDefs.push(def);
  }
  return def.id;
}

function goalStageForSync(goal) {
  const tasks = Array.isArray(goal.tasks) ? goal.tasks : [];
  const doneCount = tasks.filter(t => t && t.done).length;
  const isCompleted = goal.status === 'completed' || (tasks.length > 0 && doneCount === tasks.length);
  if (isCompleted) return 'done';
  if (doneCount > 0) return 'in_progress';
  if ((goal.progressSource || 'checklist') === 'metric') {
    const start = Number(goal.start) || 0;
    const target = Number(goal.target) || 0;
    const current = Number(goal.current) || 0;
    if (target !== start && current > start) return 'in_progress';
  }
  return 'todo';
}

function syncKanbanFromGoals({ notify = false } = {}) {
  try {
    const rawGoals = appStorage.getItem(GOALS_KEY);
    if (!rawGoals) {
      if (notify) showToast('All SMART Goals synced with Kanban', 'success');
      return false;
    }
    const goalsDoc = JSON.parse(rawGoals);
    const goals = Array.isArray(goalsDoc?.goals) ? goalsDoc.goals : [];
    if (!state.boards.length) {
      state.boards.push(createBoard('My Projects'));
      state.activeBoardId = state.boards[0].id;
    }

    const existingByGoalId = new Map();
    state.boards.forEach((board, bIdx) => {
      (board.columns || []).forEach((col, cIdx) => {
        (col.cards || []).forEach(card => {
          if (card && card.goalId) {
            existingByGoalId.set(String(card.goalId), { bIdx, cIdx, card });
          }
        });
      });
    });

    const activeGoalIds = new Set();
    let changed = false;

    goals.forEach(goal => {
      if (!goal || !goal.id || goal.status === 'archived') return;
      const goalId = String(goal.id);
      activeGoalIds.add(goalId);

      const found = existingByGoalId.get(goalId);
      const bIdx = found ? found.bIdx : 0;
      const board = state.boards[bIdx] || state.boards[0];
      if (!Array.isArray(board.columns) || !board.columns.length) {
        board.columns = createBoard(board.name || 'My Projects').columns;
        changed = true;
      }

      const stage = goalStageForSync(goal);
      const targetCol = findKanbanColumnByStage(board, stage) || board.columns[0];
      const smartLabelId = ensureBoardLabel(board, 'SMART Goal', '#10b981');
      const catLabelId = goal.category ? ensureBoardLabel(board, String(goal.category), '#3b82f6') : null;

      const checklist = (Array.isArray(goal.tasks) ? goal.tasks : [])
        .map(t => ({
          id: String(t.id || crypto.randomUUID()),
          text: String(t.title || '').trim().slice(0, 120),
          done: Boolean(t.done)
        }))
        .filter(item => item.text !== '');

      const checklists = checklist.length
        ? [{ id: `goal-chk-${goalId}`, title: 'Goal Tasks', items: checklist }]
        : [];

      const descParts = [];
      if (goal.specific) descParts.push(String(goal.specific).trim());
      if (goal.relevant) descParts.push(`Why: ${String(goal.relevant).trim()}`);
      if (goal.notes) descParts.push(String(goal.notes).trim());
      const description = descParts.filter(Boolean).join('\n\n').slice(0, 2000);
      const priority = ['high', 'medium', 'low'].includes(goal.priority) ? goal.priority : 'medium';
      const title = String(goal.title || 'Untitled goal').slice(0, 120);
      const dueDate = goal.deadline || '';
      const startDate = goal.startDate || '';
      const completed = stage === 'done';

      const prevCard = found ? found.card : null;
      const labelIds = Array.isArray(prevCard?.labelIds) ? [...prevCard.labelIds] : [];
      if (smartLabelId && !labelIds.includes(smartLabelId)) labelIds.push(smartLabelId);
      if (catLabelId && !labelIds.includes(catLabelId)) labelIds.push(catLabelId);

      const nextCard = {
        ...(prevCard || {
          id: crypto.randomUUID(),
          members: [],
          customFields: [],
          attachmentUrl: '',
          comments: [],
          createdAt: Date.now()
        }),
        goalId,
        goalCategory: String(goal.category || ''),
        goalProgressSource: String(goal.progressSource || 'checklist'),
        title,
        description,
        priority,
        dueDate,
        startDate,
        completed,
        labelIds,
        checklist,
        checklists,
        updatedAt: prevCard?.updatedAt || Date.now()
      };

      const prevCol = found ? state.boards[found.bIdx]?.columns?.[found.cIdx] : null;
      const sameCol = prevCol && prevCol.id === targetCol.id;
      const sameData = prevCard &&
        sameCol &&
        prevCard.title === nextCard.title &&
        prevCard.description === nextCard.description &&
        prevCard.priority === nextCard.priority &&
        prevCard.dueDate === nextCard.dueDate &&
        prevCard.startDate === nextCard.startDate &&
        Boolean(prevCard.completed) === Boolean(nextCard.completed) &&
        JSON.stringify(prevCard.checklist || []) === JSON.stringify(nextCard.checklist) &&
        JSON.stringify(prevCard.labelIds || []) === JSON.stringify(nextCard.labelIds);

      if (!sameData) {
        nextCard.updatedAt = Date.now();
        changed = true;
      }

      if (prevCol && !sameCol) {
        prevCol.cards = (prevCol.cards || []).filter(c => String(c.goalId || '') !== goalId);
        targetCol.cards.unshift(nextCard);
      } else if (prevCol && sameCol) {
        const idx = prevCol.cards.findIndex(c => String(c.goalId || '') === goalId);
        if (idx !== -1) prevCol.cards[idx] = nextCard;
        else prevCol.cards.unshift(nextCard);
      } else {
        targetCol.cards.unshift(nextCard);
      }
    });

    // Remove cards linked to deleted or archived goals
    state.boards.forEach(board => {
      (board.columns || []).forEach(col => {
        const before = (col.cards || []).length;
        col.cards = (col.cards || []).filter(c => !c.goalId || activeGoalIds.has(String(c.goalId)));
        if (col.cards.length !== before) changed = true;
      });
    });

    if (changed) {
      saveState();
      render();
    }
    if (notify) {
      showToast(`Synced ${activeGoalIds.size} SMART Goal${activeGoalIds.size === 1 ? '' : 's'} with Kanban`, 'success');
    }
    return changed;
  } catch (err) {
    console.error('Failed to sync goals to Kanban:', err);
    return false;
  }
}

function syncKanbanCardToGoal(card, column, { fromColumnMove = false, fromChecklist = false } = {}) {
  if (!card || !card.goalId) return;
  try {
    const board = state.boards.find(b => b.columns.some(c => c.cards.some(item => item.id === card.id))) || getActiveBoard();
    let activeColumn = column || board?.columns.find(c => c.cards.some(item => item.id === card.id));
    let stage = activeColumn ? kanbanColumnStage(activeColumn.name) : (card.completed ? 'done' : 'todo');

    if (fromColumnMove && activeColumn) {
      if (stage === 'done') {
        card.completed = true;
        (card.checklist || []).forEach(item => { item.done = true; });
        (card.checklists || []).forEach(list => (list.items || []).forEach(item => { item.done = true; }));
      } else if (stage === 'todo' || stage === 'backlog') {
        card.completed = false;
        (card.checklist || []).forEach(item => { item.done = false; });
        (card.checklists || []).forEach(list => (list.items || []).forEach(item => { item.done = false; }));
      } else if (stage === 'in_progress') {
        card.completed = false;
        const items = card.checklist || [];
        if (items.length > 0 && items.every(i => i.done)) {
          items[items.length - 1].done = false;
          (card.checklists || []).forEach(list => {
            if (list.items?.length) list.items[list.items.length - 1].done = false;
          });
        }
      }
    } else if (fromChecklist && board) {
      const items = card.checklist || [];
      const doneCount = items.filter(i => i.done).length;
      if (items.length > 0) {
        card.completed = doneCount === items.length;
        const desiredStage = card.completed ? 'done' : (doneCount > 0 ? 'in_progress' : 'todo');
        const targetCol = findKanbanColumnByStage(board, desiredStage);
        if (targetCol && activeColumn && targetCol.id !== activeColumn.id) {
          activeColumn.cards = activeColumn.cards.filter(c => c.id !== card.id);
          targetCol.cards.unshift(card);
          activeColumn = targetCol;
          stage = desiredStage;
          if (state.cardModal.cardId === card.id) {
            state.cardModal.columnId = targetCol.id;
            if ($('cardList')) $('cardList').value = targetCol.id;
            if ($('cardCompleted')) $('cardCompleted').checked = card.completed;
          }
        }
      }
    }

    // Update edi_goals_v1
    const rawGoals = appStorage.getItem(GOALS_KEY);
    if (!rawGoals) return;
    const goalsDoc = JSON.parse(rawGoals);
    if (!Array.isArray(goalsDoc?.goals)) return;
    const goal = goalsDoc.goals.find(g => String(g.id) === String(card.goalId));
    if (!goal) return;

    goal.title = String(card.title || goal.title || 'Untitled goal').trim();
    if (['high', 'medium', 'low'].includes(card.priority)) {
      goal.priority = card.priority;
    }
    goal.deadline = card.dueDate || '';
    if (card.startDate) goal.startDate = card.startDate;

    const existingTasks = new Map((goal.tasks || []).map(t => [String(t.id), t]));
    if (Array.isArray(card.checklist)) {
      goal.tasks = card.checklist.map(item => {
        const prev = existingTasks.get(String(item.id));
        return {
          id: String(item.id || crypto.randomUUID()),
          title: String(item.text || '').trim() || 'Untitled item',
          done: Boolean(item.done),
          weight: prev && Number.isFinite(Number(prev.weight)) ? Number(prev.weight) : 1
        };
      });
    }

    const totalTasks = (goal.tasks || []).length;
    const doneTasks = (goal.tasks || []).filter(t => t.done).length;
    const isGoalCompleted = Boolean(card.completed) || stage === 'done' || (totalTasks > 0 && doneTasks === totalTasks);

    goal.status = isGoalCompleted ? 'completed' : 'active';
    if ((goal.progressSource || 'checklist') === 'metric') {
      const targetNum = Number(goal.target) || 100;
      const startNum = Number(goal.start) || 0;
      if (isGoalCompleted) {
        goal.current = targetNum;
      } else if (Number(goal.current) >= targetNum) {
        goal.current = stage === 'in_progress' ? Math.max(startNum + 1, Math.round((startNum + targetNum) / 2)) : startNum;
      }
    }

    appStorage.setItem(GOALS_KEY, JSON.stringify(goalsDoc));

    // Also keep edi_todos_v1 in sync
    const rawTodos = appStorage.getItem(TODOS_KEY);
    if (rawTodos) {
      const todosDoc = JSON.parse(rawTodos);
      const todoList = Array.isArray(todosDoc?.todos) ? todosDoc.todos : [];
      const linkedTodo = todoList.find(t => String(t.goalId || '') === String(goal.id));
      if (linkedTodo) {
        linkedTodo.title = goal.title;
        linkedTodo.priority = goal.priority || 'medium';
        linkedTodo.dueDate = goal.deadline || '';
        linkedTodo.completed = isGoalCompleted;
        linkedTodo.completedAt = isGoalCompleted ? (linkedTodo.completedAt || new Date().toISOString()) : null;
        linkedTodo.subtasks = (goal.tasks || []).map(t => ({
          id: String(t.id),
          title: String(t.title),
          completed: Boolean(t.done)
        }));
        linkedTodo.updatedAt = new Date().toISOString();
        appStorage.setItem(TODOS_KEY, JSON.stringify(todosDoc));
      }
    }
  } catch (err) {
    console.error('Failed to sync Kanban card back to Goal:', err);
  }
}

function openGoalFromKanban(goalId) {
  if (!goalId) return;
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'kanban-open-goal', goalId: String(goalId) }, window.location.origin);
      return;
    }
  } catch (err) {
    // Fallback to direct navigation
  }
  window.location.href = `/goals/?goal=${encodeURIComponent(goalId)}`;
}
