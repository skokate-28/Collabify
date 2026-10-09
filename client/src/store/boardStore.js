import { create } from 'zustand';

export const useBoardStore = create((set) => ({
  boards: [],
  currentBoard: null, // format: { board: {...}, tasks: { [columnId]: [tasks] } }
  isLoading: false,

  setBoards: (boards) => set({ boards }),
  
  setCurrentBoard: (boardData) => set({ currentBoard: boardData }),
  
  setLoading: (isLoading) => set({ isLoading }),

  addTask: (task) =>
    set((state) => {
      if (!state.currentBoard) return {};
      const { columnId } = task;
      const tasks = { ...state.currentBoard.tasks };
      
      const columnTasks = [...(tasks[columnId] || [])];
      // Avoid duplicates
      if (!columnTasks.some(t => t._id === task._id)) {
        columnTasks.push(task);
        columnTasks.sort((a, b) => a.order - b.order);
      }
      
      tasks[columnId] = columnTasks;
      return { currentBoard: { ...state.currentBoard, tasks } };
    }),

  removeTask: (taskId, columnId) =>
    set((state) => {
      if (!state.currentBoard) return {};
      const tasks = { ...state.currentBoard.tasks };
      if (tasks[columnId]) {
        tasks[columnId] = tasks[columnId].filter((t) => t._id !== taskId);
      }
      return { currentBoard: { ...state.currentBoard, tasks } };
    }),

  updateTask: (updatedTask) =>
    set((state) => {
      if (!state.currentBoard) return {};
      const { columnId } = updatedTask;
      const tasks = { ...state.currentBoard.tasks };

      // The task might have moved columns, so clean it up from other columns first
      Object.keys(tasks).forEach((colId) => {
        tasks[colId] = tasks[colId].filter((t) => t._id !== updatedTask._id);
      });

      // Add to its new column
      const columnTasks = [...(tasks[columnId] || [])];
      columnTasks.push(updatedTask);
      columnTasks.sort((a, b) => a.order - b.order);
      tasks[columnId] = columnTasks;

      return { currentBoard: { ...state.currentBoard, tasks } };
    }),

  // Optimistic Move Task for DND
  moveTask: (taskId, sourceColId, destColId, sourceIdx, destIdx) =>
    set((state) => {
      if (!state.currentBoard) return {};
      const tasks = { ...state.currentBoard.tasks };
      
      const sourceList = [...(tasks[sourceColId] || [])];
      const destList = sourceColId === destColId ? sourceList : [...(tasks[destColId] || [])];

      const taskIdx = sourceList.findIndex((t) => t._id === taskId);
      if (taskIdx === -1) return {};

      const [movedTask] = sourceList.splice(taskIdx, 1);
      movedTask.columnId = destColId;

      destList.splice(destIdx, 0, movedTask);

      // Re-assign orders
      sourceList.forEach((t, i) => { t.order = i; });
      destList.forEach((t, i) => { t.order = i; });

      tasks[sourceColId] = sourceList;
      if (sourceColId !== destColId) {
        tasks[destColId] = destList;
      }

      return { currentBoard: { ...state.currentBoard, tasks } };
    }),

  addColumn: (column) =>
    set((state) => {
      if (!state.currentBoard) return {};
      const board = { ...state.currentBoard.board };
      board.columns.push(column);
      board.columns.sort((a, b) => a.order - b.order);

      const tasks = { ...state.currentBoard.tasks };
      tasks[column._id] = [];

      return { currentBoard: { ...state.currentBoard, board, tasks } };
    }),

  removeColumn: (columnId) =>
    set((state) => {
      if (!state.currentBoard) return {};
      const board = { ...state.currentBoard.board };
      board.columns = board.columns.filter((c) => c._id !== columnId);

      const tasks = { ...state.currentBoard.tasks };
      delete tasks[columnId];

      return { currentBoard: { ...state.currentBoard, board, tasks } };
    }),

  reorderColumns: (orderedColumnIds) =>
    set((state) => {
      if (!state.currentBoard) return {};
      const board = { ...state.currentBoard.board };
      
      const colsMap = {};
      board.columns.forEach((c) => { colsMap[c._id] = c; });

      const newCols = orderedColumnIds.map((id, index) => {
        const col = colsMap[id];
        if (col) col.order = index;
        return col;
      }).filter(Boolean);

      board.columns = newCols;
      return { currentBoard: { ...state.currentBoard, board } };
    }),
}));
