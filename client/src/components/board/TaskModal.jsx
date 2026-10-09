import React, { useState, useCallback } from 'react';
import { X, Trash2, Paperclip, Send, Calendar, User, Tag, Columns, MessageSquare } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Avatar from '../common/Avatar';
import ConfirmDialog from '../common/ConfirmDialog';
import { formatFriendlyDate } from '../../utils/formatDate';
import api from '../../services/api';
import toast from 'react-hot-toast';

const priorityOptions = ['low', 'medium', 'high', 'urgent'];
const priorityVariant = { low: 'info', medium: 'brand', high: 'warning', urgent: 'danger' };

export default function TaskModal({ task, isOpen, onClose, workspaceMembers = [], boardColumns = [], onUpdate, onDelete }) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.split('T')[0] : '');
  const [tags, setTags] = useState(task?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [columnId, setColumnId] = useState(task?.columnId || '');
  const [assignees, setAssignees] = useState(task?.assignees?.map(a => a._id || a) || []);
  const [commentText, setCommentText] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (field, value) => {
    setIsSaving(true);
    try {
      const updateData = {};
      if (field === 'title') updateData.title = value;
      else if (field === 'description') updateData.description = value;
      else if (field === 'priority') updateData.priority = value;
      else if (field === 'dueDate') updateData.dueDate = value || null;
      else if (field === 'tags') updateData.tags = value;
      else if (field === 'assignees') updateData.assignees = value;
      else if (field === 'columnId') updateData.columnId = value;

      const res = await api.patch(`/tasks/${task._id}`, updateData);
      if (onUpdate) onUpdate(res.data.data);
      toast.success('Task updated');
    } catch (error) {
      toast.error('Failed to update task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/tasks/${task._id}`);
      if (onDelete) onDelete(task._id, task.columnId);
      toast.success('Task deleted');
      onClose();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updated = [...tags, newTag.trim()];
      setTags(updated);
      setNewTag('');
      handleSave('tags', updated);
    }
  };

  const handleRemoveTag = (tag) => {
    const updated = tags.filter(t => t !== tag);
    setTags(updated);
    handleSave('tags', updated);
  };

  const toggleAssignee = (userId) => {
    const updated = assignees.includes(userId)
      ? assignees.filter(id => id !== userId)
      : [...assignees, userId];
    setAssignees(updated);
    handleSave('assignees', updated);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    // Parse @mentions from text
    const mentionRegex = /@(\w+)/g;
    const mentionedNames = [];
    let match;
    while ((match = mentionRegex.exec(commentText)) !== null) {
      mentionedNames.push(match[1].toLowerCase());
    }
    const mentionedIds = workspaceMembers
      .filter(m => mentionedNames.includes(m.user?.name?.split(' ')[0]?.toLowerCase()))
      .map(m => m.user._id);

    try {
      await api.post(`/tasks/${task._id}/comments`, {
        content: commentText,
        mentions: mentionedIds,
      });
      setCommentText('');
      // Refresh task
      const res = await api.get(`/tasks/${task._id}`);
      if (onUpdate) onUpdate(res.data.data);
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleUploadAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/tasks/${task._id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const res = await api.get(`/tasks/${task._id}`);
      if (onUpdate) onUpdate(res.data.data);
      toast.success('Attachment uploaded');
    } catch (error) {
      toast.error('Failed to upload attachment');
    }
  };

  if (!task) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Task Details" className="max-w-3xl">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">
            {/* Title */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { if (title !== task.title) handleSave('title', title); }}
              className="text-base font-sora font-bold text-white bg-transparent border-b border-transparent hover:border-darkBorder focus:border-indigoAccent focus:outline-none pb-1 transition-colors w-full"
              placeholder="Task title..."
            />

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => { if (description !== task.description) handleSave('description', description); }}
                className="w-full h-24 px-3 py-2 rounded-lg bg-darkInput border border-darkBorder text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigoAccent text-xs resize-none"
                placeholder="Add a description..."
              />
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Tag size={10} /> Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-darkBorder text-gray-300 rounded font-medium group"
                  >
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="text-gray-500 hover:text-red-400">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="text-[10px] bg-transparent border-b border-darkBorder text-gray-300 focus:outline-none focus:border-indigoAccent w-20 pb-0.5"
                    placeholder="+ Add tag"
                  />
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Paperclip size={10} /> Attachments
              </label>
              <div className="flex flex-wrap gap-2">
                {task.attachments?.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigoAccent hover:underline bg-indigoAccent/5 border border-indigoAccent/10 rounded px-2 py-1"
                  >
                    📎 {att.name}
                  </a>
                ))}
                <label className="text-[10px] text-gray-500 hover:text-indigoAccent cursor-pointer bg-darkInput border border-dashed border-darkBorder rounded px-2 py-1 transition-colors">
                  + Upload
                  <input type="file" onChange={handleUploadAttachment} className="hidden" />
                </label>
              </div>
            </div>

            {/* Comments */}
            <div className="flex flex-col gap-2 border-t border-darkBorder pt-4">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <MessageSquare size={10} /> Comments
              </label>
              <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1">
                {task.comments?.length === 0 && (
                  <p className="text-[10px] text-gray-600">No comments yet.</p>
                )}
                {task.comments?.map((comment) => (
                  <div key={comment._id} className="flex gap-2">
                    <Avatar src={comment.author?.avatar} name={comment.author?.name} size="xs" />
                    <div className="flex-1 flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-white">{comment.author?.name}</span>
                        <span className="text-[9px] text-gray-600">{formatFriendlyDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-darkInput border border-darkBorder text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigoAccent"
                  placeholder="Add a comment... Use @name to mention"
                />
                <button
                  onClick={handleAddComment}
                  className="p-2 rounded-lg bg-indigoAccent hover:bg-indigo-500 text-white transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-full lg:w-56 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-darkBorder pt-4 lg:pt-0 lg:pl-6 flex-shrink-0">
            {/* Assignees */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <User size={10} /> Assignees
              </label>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {workspaceMembers.map((member) => {
                  const u = member.user;
                  const isAssigned = assignees.includes(u._id);
                  return (
                    <button
                      key={u._id}
                      onClick={() => toggleAssignee(u._id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors text-[10px] ${
                        isAssigned ? 'bg-indigoAccent/10 text-indigo-300 border border-indigoAccent/20' : 'hover:bg-darkInput text-gray-400'
                      }`}
                    >
                      <Avatar src={u.avatar} name={u.name} size="xs" />
                      <span className="truncate">{u.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Priority</label>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  handleSave('priority', e.target.value);
                }}
                className="text-xs px-2 py-1.5 rounded-lg bg-darkInput border border-darkBorder text-gray-200 focus:outline-none focus:border-indigoAccent"
              >
                {priorityOptions.map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={10} /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleSave('dueDate', e.target.value);
                }}
                className="text-xs px-2 py-1.5 rounded-lg bg-darkInput border border-darkBorder text-gray-200 focus:outline-none focus:border-indigoAccent"
              />
            </div>

            {/* Move to Column */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Columns size={10} /> Column
              </label>
              <select
                value={columnId}
                onChange={(e) => {
                  setColumnId(e.target.value);
                  handleSave('columnId', e.target.value);
                }}
                className="text-xs px-2 py-1.5 rounded-lg bg-darkInput border border-darkBorder text-gray-200 focus:outline-none focus:border-indigoAccent"
              >
                {boardColumns.map(col => (
                  <option key={col._id} value={col._id}>{col.title}</option>
                ))}
              </select>
            </div>

            {/* Created by */}
            {task.createdBy && (
              <div className="flex flex-col gap-1.5 border-t border-darkBorder pt-3">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Created By</label>
                <div className="flex items-center gap-2">
                  <Avatar src={task.createdBy.avatar} name={task.createdBy.name} size="xs" />
                  <span className="text-[10px] text-gray-300">{task.createdBy.name}</span>
                </div>
              </div>
            )}

            {/* Delete */}
            <div className="mt-auto pt-3 border-t border-darkBorder">
              <Button variant="danger" className="w-full text-[10px]" onClick={() => setIsDeleteOpen(true)}>
                <Trash2 size={12} />
                Delete Task
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This will also remove all comments.`}
        confirmText="Delete"
      />
    </>
  );
}
