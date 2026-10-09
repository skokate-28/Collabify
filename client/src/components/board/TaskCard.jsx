import React from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';
import Badge from '../common/Badge';
import Avatar from '../common/Avatar';
import { format, isPast, isToday } from 'date-fns';

const priorityVariant = {
  low: 'info',
  medium: 'brand',
  high: 'warning',
  urgent: 'danger',
};

export default function TaskCard({ task, onClick, provided, snapshot }) {
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={() => onClick(task)}
      className={`bg-darkInput border border-darkBorder rounded-lg p-3.5 cursor-pointer group hover:border-indigoAccent/40 transition-all flex flex-col gap-2.5 ${
        snapshot.isDragging ? 'shadow-xl shadow-indigoAccent/10 border-indigoAccent/50 rotate-1 scale-[1.02]' : ''
      }`}
    >
      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="text-[9px] px-1.5 py-0.5 rounded bg-darkBorder text-gray-400 font-medium"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[9px] text-gray-500">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Title */}
      <h4 className="text-xs font-semibold text-white leading-snug group-hover:text-indigo-300 transition-colors">
        {task.title}
      </h4>

      {/* Bottom Row */}
      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          <Badge variant={priorityVariant[task.priority] || 'brand'}>
            {task.priority}
          </Badge>

          {/* Due Date */}
          {task.dueDate && (
            <span
              className={`flex items-center gap-1 text-[9px] font-medium ${
                isOverdue ? 'text-red-400' : 'text-gray-500'
              }`}
            >
              {isOverdue ? <AlertTriangle size={10} /> : <Calendar size={10} />}
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
        </div>

        {/* Assignee Avatars (stacked, max 3) */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map((assignee) => (
              <Avatar
                key={assignee._id}
                src={assignee.avatar}
                name={assignee.name}
                size="xs"
                className="ring-1 ring-darkInput"
              />
            ))}
            {task.assignees.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-darkBorder flex items-center justify-center text-[8px] text-gray-400 font-bold ring-1 ring-darkInput">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
