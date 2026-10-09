import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { MoreHorizontal, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import TaskCard from './TaskCard';
import Input from '../common/Input';
import Button from '../common/Button';
import { useOutsideClick } from '../../hooks/useOutsideClick';

export default function KanbanColumn({
  column,
  tasks = [],
  index,
  onTaskClick,
  onAddTask,
  onRenameColumn,
  onDeleteColumn,
  provided,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);

  const menuRef = useOutsideClick(() => setIsMenuOpen(false));

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    onAddTask(column._id, newTaskTitle.trim());
    setNewTaskTitle('');
    setIsAdding(false);
  };

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== column.title) {
      onRenameColumn(column._id, editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className="w-[280px] flex-shrink-0 bg-darkSurface border border-darkBorder rounded-xl flex flex-col max-h-full"
    >
      {/* Column Header */}
      <div
        {...provided.dragHandleProps}
        className="px-4 py-3 flex items-center justify-between border-b border-darkBorder cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color || '#6366F1' }}
          />
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="text-xs font-semibold text-white bg-darkInput border border-darkBorder rounded px-2 py-0.5 flex-1 focus:outline-none focus:border-indigoAccent"
              />
              <button onClick={handleRename} className="p-0.5 text-emerald-400 hover:text-emerald-300">
                <Check size={12} />
              </button>
              <button onClick={() => setIsEditing(false)} className="p-0.5 text-gray-500 hover:text-white">
                <X size={12} />
              </button>
            </div>
          ) : (
            <span
              className="text-xs font-semibold text-white truncate cursor-text"
              onDoubleClick={() => setIsEditing(true)}
            >
              {column.title}
            </span>
          )}
          <span className="text-[10px] text-gray-500 bg-darkInput px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
            {tasks.length}
          </span>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 rounded text-gray-500 hover:text-white hover:bg-darkInput transition-colors"
          >
            <MoreHorizontal size={14} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-darkSurface border border-darkBorder rounded-lg shadow-xl z-30 py-1">
              <button
                onClick={() => { setIsEditing(true); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-gray-300 hover:bg-darkInput transition-colors"
              >
                <Pencil size={10} /> Rename
              </button>
              <button
                onClick={() => { onDeleteColumn(column._id); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-red-400 hover:bg-red-500/5 transition-colors"
              >
                <Trash2 size={10} /> Delete Column
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Droppable Task Zone */}
      <Droppable droppableId={column._id} type="task">
        {(droppableProvided, snapshot) => (
          <div
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
            className={`flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 min-h-[60px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-indigoAccent/5' : ''
            }`}
          >
            {tasks.map((task, taskIndex) => (
              <Draggable key={task._id} draggableId={task._id} index={taskIndex}>
                {(dragProvided, dragSnapshot) => (
                  <TaskCard
                    task={task}
                    onClick={onTaskClick}
                    provided={dragProvided}
                    snapshot={dragSnapshot}
                  />
                )}
              </Draggable>
            ))}
            {droppableProvided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add Task Footer */}
      <div className="p-3 border-t border-darkBorder">
        {isAdding ? (
          <div className="flex flex-col gap-2">
            <input
              autoFocus
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="Enter task title..."
              className="text-xs px-3 py-2 rounded-lg bg-darkInput border border-darkBorder text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigoAccent"
            />
            <div className="flex items-center gap-2">
              <Button variant="primary" className="py-1.5 px-3 text-[10px]" onClick={handleAddTask}>
                Add
              </Button>
              <button onClick={() => { setIsAdding(false); setNewTaskTitle(''); }} className="text-gray-500 hover:text-white text-xs">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] text-gray-500 hover:text-indigoAccent hover:bg-indigoAccent/5 border border-dashed border-darkBorder hover:border-indigoAccent/30 transition-all font-semibold"
          >
            <Plus size={12} />
            Add Task
          </button>
        )}
      </div>
    </div>
  );
}
