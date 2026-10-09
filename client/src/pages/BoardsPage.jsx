import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Calendar, Clock, User, ChevronRight } from 'lucide-react';
import { useBoardStore } from '../store/boardStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import SkeletonLoader from '../components/common/SkeletonLoader';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function BoardsPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { boards, setBoards } = useBoardStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isNewBoardOpen, setIsNewBoardOpen] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [errors, setErrors] = useState({});

  const fetchBoards = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/boards/workspace/${workspaceId}`);
      setBoards(res.data.data);
    } catch (error) {
      toast.error('Failed to load boards');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchBoards();
    }
  }, [workspaceId]);

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!boardName.trim()) {
      setErrors({ name: 'Board name is required' });
      return;
    }

    try {
      const res = await api.post('/boards', {
        name: boardName,
        workspaceId,
      });
      setBoards([...boards, res.data.data]);
      setIsNewBoardOpen(false);
      setBoardName('');
      toast.success('Board created successfully');
      navigate(`/dashboard/workspace/${workspaceId}/boards/${res.data.data._id}`);
    } catch (error) {
      toast.error('Failed to create board');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="h-8 w-32 bg-darkInput animate-pulse rounded" />
          <div className="h-10 w-24 bg-darkInput animate-pulse rounded" />
        </div>
        <SkeletonLoader variant="card" count={3} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white font-sora">Boards</h1>
          <p className="text-xs text-gray-500 mt-1">Manage, categorize, and execute work cards in columns.</p>
        </div>
        <Button variant="primary" onClick={() => setIsNewBoardOpen(true)}>
          <Plus size={16} />
          New Board
        </Button>
      </div>

      {/* Grid */}
      {boards.length === 0 ? (
        <div className="bg-darkSurface border border-darkBorder rounded-2xl p-12 text-center flex flex-col items-center gap-4 mt-4">
          <div className="w-12 h-12 rounded-xl bg-indigoAccent/10 border border-indigoAccent/20 flex items-center justify-center text-indigoAccent">
            <FolderKanban size={22} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">No boards yet</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">Create a board to start mapping out tasks, assigning members, and tracking progress.</p>
          </div>
          <Button variant="primary" className="mt-2" onClick={() => setIsNewBoardOpen(true)}>
            Create First Board
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {boards.map((board) => (
            <div
              key={board._id}
              onClick={() => navigate(`/dashboard/workspace/${workspaceId}/boards/${board._id}`)}
              className="bg-darkSurface border border-darkBorder hover:border-indigoAccent/50 transition-all rounded-xl p-5 cursor-pointer flex flex-col gap-4 group relative overflow-hidden shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigoAccent/5 border border-indigoAccent/10 flex items-center justify-center text-indigoAccent">
                    <FolderKanban size={16} />
                  </div>
                  <h3 className="text-xs font-semibold text-white group-hover:text-indigo-400 transition-colors truncate max-w-[150px]">
                    {board.name}
                  </h3>
                </div>
                <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition-colors" />
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2 pl-0.5 border-t border-darkBorder pt-3">
                <span>{board.columns?.length || 3} Columns</span>
                <span>Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      <Modal isOpen={isNewBoardOpen} onClose={() => setIsNewBoardOpen(false)} title="Create Board">
        <form onSubmit={handleCreateBoard} className="flex flex-col gap-4">
          <Input
            label="Board Name"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            error={errors.name}
            placeholder="e.g. Sprint 1 Roadmap"
          />
          <p className="text-[10px] text-gray-500 leading-relaxed">
            * Creating a board will initialize it with 3 default columns: <strong>Todo</strong>, <strong>In Progress</strong>, and <strong>Done</strong>.
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" type="button" onClick={() => setIsNewBoardOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Board
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
