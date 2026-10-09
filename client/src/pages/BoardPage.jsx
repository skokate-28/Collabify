import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import KanbanBoard from '../components/board/KanbanBoard';
import { useBoardStore } from '../store/boardStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useSocketStore } from '../store/socketStore';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import SkeletonLoader from '../components/common/SkeletonLoader';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function BoardPage() {
  const { workspaceId, boardId } = useParams();
  const navigate = useNavigate();
  const { currentBoard, setCurrentBoard, setLoading, isLoading, addColumn } = useBoardStore();
  const { currentWorkspace } = useWorkspaceStore();
  const socket = useSocketStore((s) => s.socket);

  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [columnTitle, setColumnTitle] = useState('');
  const [columnColor, setColumnColor] = useState('#6366F1');

  // AI Summary state
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/boards/${boardId}`);
      setCurrentBoard(res.data.data);
    } catch (error) {
      toast.error('Failed to load board');
      navigate(`/dashboard/workspace/${workspaceId}/boards`);
    } finally {
      setLoading(false);
    }
  }, [boardId, workspaceId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Socket: join board room and listen for live events
  useEffect(() => {
    if (!socket || !boardId) return;
    socket.emit('board:join', { boardId });

    const handleBoardUpdated = (data) => {
      if (data.deleted) {
        toast.error('This board was deleted');
        navigate(`/dashboard/workspace/${workspaceId}/boards`);
        return;
      }
      fetchBoard();
    };

    const handleTaskCreated = (payload) => {
      const task = payload?.task || payload;
      useBoardStore.getState().addTask(task);
    };

    const handleTaskUpdated = (payload) => {
      const task = payload?.task || payload;
      useBoardStore.getState().updateTask(task);
    };

    const handleTaskDeleted = ({ taskId, boardId: bId }) => {
      // We need to find which column the task was in; simple approach - iterate
      const tasks = useBoardStore.getState().currentBoard?.tasks || {};
      for (const colId of Object.keys(tasks)) {
        const found = tasks[colId].find(t => t._id === taskId);
        if (found) {
          useBoardStore.getState().removeTask(taskId, colId);
          break;
        }
      }
    };

    socket.on('board:updated', handleBoardUpdated);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);

    return () => {
      socket.emit('board:leave', { boardId });
      socket.off('board:updated', handleBoardUpdated);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, [socket, boardId, workspaceId, fetchBoard]);

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!columnTitle.trim()) return;
    try {
      const res = await api.post(`/boards/${boardId}/columns`, { title: columnTitle, color: columnColor });
      const newCol = res.data.data.columns[res.data.data.columns.length - 1];
      addColumn(newCol);
      setColumnTitle('');
      setColumnColor('#6366F1');
      setIsAddColumnOpen(false);
      toast.success('Column added');
    } catch (error) {
      toast.error('Failed to add column');
    }
  };

  const handleAiSummary = async () => {
    setIsAiOpen(true);
    setIsAiLoading(true);
    setAiSummary('');
    setAiError(false);
    try {
      const res = await api.post(`/boards/${boardId}/ai-summary`);
      setAiSummary(res.data.data.summary);
    } catch {
      setAiError(true);
      setAiSummary('');
    } finally {
      setIsAiLoading(false);
    }
  };

  const workspaceMembers = currentWorkspace?.members || [];

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex flex-col gap-6">
        <SkeletonLoader variant="text" count={1} />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-[280px] flex-shrink-0 bg-darkSurface border border-darkBorder rounded-xl p-4 animate-pulse h-96" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Board Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-darkBorder bg-darkSurface/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/dashboard/workspace/${workspaceId}/boards`)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-darkInput transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="text-sm font-semibold text-white font-sora">{currentBoard?.board?.name || 'Board'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleAiSummary} className="text-[10px] border border-indigoAccent/50 text-indigoAccent">
            <Sparkles size={14} />
            AI Summary
          </Button>
          <Button variant="secondary" onClick={() => setIsAddColumnOpen(true)} className="text-[10px]">
            <Plus size={14} />
            Add Column
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden p-6">
        <KanbanBoard workspaceId={workspaceId} workspaceMembers={workspaceMembers} />
      </div>

      {/* Add Column Modal */}
      <Modal isOpen={isAddColumnOpen} onClose={() => setIsAddColumnOpen(false)} title="Add Column" className="max-w-sm">
        <form onSubmit={handleAddColumn} className="flex flex-col gap-4">
          <Input
            label="Column Name"
            value={columnTitle}
            onChange={(e) => setColumnTitle(e.target.value)}
            placeholder="e.g. Code Review"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-400">Color</label>
            <div className="flex gap-2">
              {['#F87171','#FB923C','#FACC15','#4ADE80','#22D3EE','#6366F1','#E879F9'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColumnColor(c)}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${
                    columnColor === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddColumnOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add Column</Button>
          </div>
        </form>
      </Modal>

      {/* AI Summary Modal */}
      <Modal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} title="AI Board Summary" className="max-w-xl">
        <div className="flex flex-col gap-4">
          {isAiLoading ? (
            <div className="flex flex-col gap-3 animate-pulse py-8">
              <div className="h-4 bg-darkInput rounded w-full" />
              <div className="h-4 bg-darkInput rounded w-5/6" />
              <div className="h-4 bg-darkInput rounded w-4/6" />
              <div className="h-4 bg-darkInput rounded w-full" />
              <div className="h-4 bg-darkInput rounded w-3/4" />
            </div>
          ) : aiError ? (
            <div className="py-6 text-center">
              <p className="text-sm text-red-400 mb-4">Could not generate summary. Try again.</p>
              <Button variant="primary" onClick={handleAiSummary}>Retry</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {aiSummary.split('\n\n').filter(Boolean).map((section, i) => (
                <div key={i} className="bg-darkInput border-l-4 border-indigoAccent rounded-lg p-4">
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{section}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={handleAiSummary} disabled={isAiLoading}>
              {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : '🔄'} Regenerate
            </Button>
            <Button variant="primary" onClick={() => setIsAiOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
