const { Groq } = require('groq-sdk');
const Board = require('../models/Board');
const Task = require('../models/Task');
const Workspace = require('../models/Workspace');
const apiResponse = require('../utils/apiResponse');

// Initialize Groq client conditionally if key is present
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const createBoard = async (req, res) => {
  try {
    const { name, workspaceId } = req.body;
    const userId = req.user.userId;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return apiResponse.error(res, 'Workspace not found', 404);
    }

    // Default 3 columns
    const columns = [
      { title: 'Todo', order: 0, color: '#F87171' },
      { title: 'In Progress', order: 1, color: '#FB923C' },
      { title: 'Done', order: 2, color: '#4ADE80' },
    ];

    const board = await Board.create({
      name,
      workspace: workspaceId,
      columns,
      createdBy: userId,
    });

    // Add board to workspace
    workspace.boards.push(board._id);
    await workspace.save();

    return apiResponse.success(res, board, 'Board created successfully', 201);
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getWorkspaceBoards = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const boards = await Board.find({ workspace: workspaceId });
    return apiResponse.success(res, boards, 'Boards fetched successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getBoardById = async (req, res) => {
  try {
    const { boardId } = req.params;
    const board = await Board.findById(boardId);
    if (!board) {
      return apiResponse.error(res, 'Board not found', 404);
    }

    // Get tasks and populate assignees
    const tasks = await Task.find({ board: boardId }).populate('assignees', 'name email avatar');

    // Group tasks by columnId
    const tasksByColumn = {};
    board.columns.forEach(col => {
      tasksByColumn[col._id.toString()] = [];
    });

    tasks.forEach(task => {
      const colIdStr = task.columnId.toString();
      if (!tasksByColumn[colIdStr]) {
        tasksByColumn[colIdStr] = [];
      }
      tasksByColumn[colIdStr].push(task);
    });

    // Sort tasks within each column by order
    Object.keys(tasksByColumn).forEach(colId => {
      tasksByColumn[colId].sort((a, b) => a.order - b.order);
    });

    return apiResponse.success(res, { board, tasks: tasksByColumn }, 'Board details fetched successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const updateBoardName = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { name } = req.body;

    const board = await Board.findByIdAndUpdate(
      boardId,
      { name },
      { new: true, runValidators: true }
    );

    if (!board) {
      return apiResponse.error(res, 'Board not found', 404);
    }

    // Emit socket update
    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('board:updated', { boardId });
    }

    return apiResponse.success(res, board, 'Board renamed successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const deleteBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const board = await Board.findById(boardId);
    if (!board) {
      return apiResponse.error(res, 'Board not found', 404);
    }

    // Delete tasks and board
    await Task.deleteMany({ board: boardId });
    await Workspace.findByIdAndUpdate(board.workspace, {
      $pull: { boards: boardId },
    });
    await Board.findByIdAndDelete(boardId);

    // Emit socket update
    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('board:updated', { boardId, deleted: true });
    }

    return apiResponse.success(res, null, 'Board and associated tasks deleted');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

// Column management
const addColumn = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, color } = req.body;

    const board = await Board.findById(boardId);
    if (!board) {
      return apiResponse.error(res, 'Board not found', 404);
    }

    const nextOrder = board.columns.length;
    board.columns.push({
      title,
      color: color || '#6366F1',
      order: nextOrder,
    });

    await board.save();

    // Emit socket update
    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('board:updated', { boardId });
    }

    return apiResponse.success(res, board, 'Column added successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const updateColumn = async (req, res) => {
  try {
    const { boardId, columnId } = req.params;
    const { title, color } = req.body;

    const board = await Board.findById(boardId);
    if (!board) {
      return apiResponse.error(res, 'Board not found', 404);
    }

    const column = board.columns.id(columnId);
    if (!column) {
      return apiResponse.error(res, 'Column not found', 404);
    }

    if (title) column.title = title;
    if (color) column.color = color;

    await board.save();

    // Emit socket update
    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('board:updated', { boardId });
    }

    return apiResponse.success(res, board, 'Column updated successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const deleteColumn = async (req, res) => {
  try {
    const { boardId, columnId } = req.params;

    const board = await Board.findById(boardId);
    if (!board) {
      return apiResponse.error(res, 'Board not found', 404);
    }

    board.columns = board.columns.filter(col => col._id.toString() !== columnId.toString());
    
    // Re-index columns order
    board.columns.forEach((col, idx) => {
      col.order = idx;
    });

    await board.save();

    // Delete tasks in this column
    await Task.deleteMany({ board: boardId, columnId });

    // Emit socket update
    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('board:updated', { boardId });
    }

    return apiResponse.success(res, board, 'Column and tasks deleted successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const reorderColumns = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { orderedColumnIds } = req.body; // Array of column IDs in new order

    const board = await Board.findById(boardId);
    if (!board) {
      return apiResponse.error(res, 'Board not found', 404);
    }

    // Reorder board columns
    const columnsMap = {};
    board.columns.forEach(col => {
      columnsMap[col._id.toString()] = col;
    });

    const newColumns = [];
    orderedColumnIds.forEach((id, index) => {
      const col = columnsMap[id];
      if (col) {
        col.order = index;
        newColumns.push(col);
      }
    });

    board.columns = newColumns;
    await board.save();

    // Emit socket update
    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('board:updated', { boardId });
    }

    return apiResponse.success(res, board, 'Columns reordered successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getBoardAiSummary = async (req, res) => {
  try {
    const { boardId } = req.params;

    if (!groq) {
      return apiResponse.error(
        res,
        'AI features are not configured: GROQ_API_KEY is missing.',
        400
      );
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return apiResponse.error(res, 'Board not found', 404);
    }

    // Fetch tasks
    const tasks = await Task.find({ board: boardId }).populate('assignees', 'name');

    // Build plain text board representation
    let textRep = `Board: ${board.name}\n\n`;
    board.columns
      .sort((a, b) => a.order - b.order)
      .forEach(col => {
        textRep += `Column: ${col.title}\n`;
        const colTasks = tasks.filter(t => t.columnId.toString() === col._id.toString());
        if (colTasks.length === 0) {
          textRep += ` - (Empty)\n`;
        } else {
          colTasks.forEach(task => {
            const assignees = task.assignees.map(a => a.name).join(', ') || 'Unassigned';
            const dueDate = task.dueDate ? new Date(task.dueDate).toDateString() : 'No due date';
            textRep += ` - [Task] ${task.title} | Priority: ${task.priority} | Due: ${dueDate} | Assignees: ${assignees}\n`;
          });
        }
        textRep += '\n';
      });

    // Request Groq completion
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are a project management assistant. Summarize this board covering: progress, bottlenecks, overdue tasks, workload distribution, and 2-3 actionable suggestions. Max 250 words.',
        },
        {
          role: 'user',
          content: textRep,
        },
      ],
      model: process.env.GROQ_MODEL || 'llama3-70b-8192',
    });

    const summary = chatCompletion.choices[0].message.content;
    return apiResponse.success(res, { summary }, 'AI summary generated successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

module.exports = {
  createBoard,
  getWorkspaceBoards,
  getBoardById,
  updateBoardName,
  deleteBoard,
  addColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
  getBoardAiSummary,
};
