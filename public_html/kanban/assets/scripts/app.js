function openGoalCardInKanban(goalId) {
  if (!goalId) return false;
  syncKanbanFromGoals();
  for (const board of state.boards) {
    for (const column of board.columns || []) {
      const card = (column.cards || []).find(c => String(c.goalId || '') === String(goalId));
      if (card) {
        state.activeBoardId = board.id;
        state.allProjects = false;
        saveState();
        render();
        openCardModal({ boardId: board.id, columnId: column.id, cardId: card.id });
        return true;
      }
    }
  }
  return false;
}

document.addEventListener('DOMContentLoaded', async () => {
  await window.appStorageReady;
  loadState();
  syncKanbanFromGoals();
  applyTheme();
  setupEventListeners();
  render();
  const link = new URLSearchParams(location.search);
  const linkedBoard = getBoard(link.get('board'));
  if (linkedBoard && link.get('card')) {
    const linkedColumn = linkedBoard.columns.find(column => column.cards.some(card => card.id === link.get('card')));
    if (linkedColumn) {
      state.activeBoardId = linkedBoard.id;
      state.allProjects = false;
      saveState(); render();
      openCardModal({boardId: linkedBoard.id, columnId: linkedColumn.id, cardId: link.get('card')});
    }
  } else if (link.get('goal')) {
    openGoalCardInKanban(link.get('goal'));
  }
  checkCardReminders();
  setInterval(checkCardReminders, 60000);
});

window.addEventListener('app-storage-change', (e) => {
  const key = e.detail?.key;
  if ($('cardModal')?.open || $('boardModal')?.open || $('moveCardModal')?.open || $('goalCardModal')?.open) return;
  if (key === KEY) {
    loadState();
    render();
  } else if (key === GOALS_KEY) {
    syncKanbanFromGoals();
    render();
  }
});

window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin || !e.data || typeof e.data !== 'object') return;
  if (e.data.type === 'kanban-refresh') {
    if (!$('cardModal')?.open) {
      loadState();
      syncKanbanFromGoals();
      render();
    }
  } else if (e.data.type === 'kanban-open-goal-card' && e.data.goalId) {
    openGoalCardInKanban(e.data.goalId);
  }
});
