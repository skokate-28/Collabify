import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanColumn from './KanbanColumn';
import TaskModal from './TaskModal';
import { useBoardStore } from '../../store/boardStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function KanbanBoard({ workspaceId, workspaceMembers = [] }) {
  const { currentBoard, moveTask, updateTask, removeTask, addTask, addColumn, removeColumn, reorderColumns } = useBoardStore();
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const board = currentBoard?.board;
  const tasks = currentBoard?.tasks || {};

  const handleDragEnd = useCallback(async (result) => {
    const { source, destination, type, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'column') {
      // Reorder columns
      const newColumnOrder = [...(board?.columns || [])].sort((a, b) => a.order - b.order);
      const [moved] = newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, moved);
      const orderedIds = newColumnOrder.map(c => c._id);

      // Optimistic update
      reorderColumns(orderedIds);

      try {
        await api.patch(`/boards/${board._id}/columns/reorder`, { orderedColumnIds: orderedIds });
      } catch (error) {
        toast.error('Failed to reorder columns');
        // Could revert here if we stored previous state
      }
      return;
    }

    // Task drag
    const taskId = draggableId;
    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const snapshot = JSON.parse(JSON.stringify(useBoardStore.getState().currentBoard));
    moveTask(taskId, sourceColId, destColId, source.index, destination.index);

    try {
      await api.patch('/tasks/reorder', {
        taskId,
        sourceColumnId: sourceColId,
        destinationColumnId: destColId,
        newOrder: destination.index,
      });
    } catch {
      useBoardStore.getState().setCurrentBoard(snapshot);
      toast.error('Failed to reorder task');
    }
  }, [board, moveTask, reorderColumns]);

  const handleAddTask = async (columnId, title) => {
    try {
      const res = await api.post('/tasks', {
        title,
        boardId: board._id,
        workspaceId,
        columnId,
      });
      addTask(res.data.data);
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleTaskClick = async (task) => {
    try {
      const res = await api.get(`/tasks/${task._id}`);
      setSelectedTask(res.data.data);
      setIsTaskModalOpen(true);
    } catch (error) {
      toast.error('Failed to load task details');
    }
  };

  const handleTaskUpdate = (updatedTask) => {
    updateTask(updatedTask);
    setSelectedTask(updatedTask);
  };

  const handleTaskDelete = (taskId, columnId) => {
    removeTask(taskId, columnId);
  };

  const handleRenameColumn = async (columnId, title) => {
    try {
      await api.patch(`/boards/${board._id}/columns/${columnId}`, { title });
      // Refresh board
      const res = await api.get(`/boards/${board._id}`);
      useBoardStore.getState().setCurrentBoard(res.data.data);
    } catch (error) {
      toast.error('Failed to rename column');
    }
  };

  const handleDeleteColumn = async (columnId) => {
    try {
      removeColumn(columnId);
      await api.delete(`/boards/${board._id}/columns/${columnId}`);
      toast.success('Column deleted');
    } catch (error) {
      toast.error('Failed to delete column');
    }
  };

  const sortedColumns = [...(board?.columns || [])].sort((a, b) => a.order - b.order);

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board-columns" direction="horizontal" type="column">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex gap-4 overflow-x-auto pb-4 h-full items-start px-1"
            >
              {sortedColumns.map((column, index) => (
                <Draggable key={column._id} draggableId={`col-${column._id}`} index={index}>
                  {(colProvided) => (
                    <KanbanColumn
                      column={column}
                      tasks={tasks[column._id] || []}
                      index={index}
                      onTaskClick={handleTaskClick}
                      onAddTask={handleAddTask}
                      onRenameColumn={handleRenameColumn}
                      onDeleteColumn={handleDeleteColumn}
                      provided={colProvided}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={isTaskModalOpen}
          onClose={() => { setIsTaskModalOpen(false); setSelectedTask(null); }}
          workspaceMembers={workspaceMembers}
          boardColumns={board?.columns || []}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
    </>
  );
}
