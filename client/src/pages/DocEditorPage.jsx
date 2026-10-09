import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import LiveCursors from '../components/docs/LiveCursors';
import RichTextEditor, { normalizeEditorContent } from '../components/docs/RichTextEditor';
import Avatar from '../components/common/Avatar';
import SkeletonLoader from '../components/common/SkeletonLoader';
import api from '../services/api';
import toast from 'react-hot-toast';

const CURSOR_COLORS = ['#F87171', '#FB923C', '#FACC15', '#4ADE80', '#34D399', '#22D3EE', '#818CF8', '#E879F9'];

function pickColor(userId) {
  let hash = 0;
  const str = userId || 'user';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export default function DocEditorPage() {
  const { workspaceId, docId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket, joinRoom } = useSocket();

  const [doc, setDoc] = useState(null);
  const [content, setContent] = useState(null);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [cursors, setCursors] = useState({});
  const [collaborators, setCollaborators] = useState({});

  const saveTimerRef = useRef(null);
  const socketTimerRef = useRef(null);
  const contentRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);

  const userColor = useMemo(() => pickColor(user?._id), [user?._id]);

  const fetchDoc = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/docs/${docId}`);
      const data = res.data.data;
      setDoc(data);
      setTitle(data.title);
      const normalized = normalizeEditorContent(data.content);
      setContent(normalized);
      contentRef.current = normalized;
    } catch {
      toast.error('Failed to load document');
      navigate(`/dashboard/workspace/${workspaceId}/docs`);
    } finally {
      setIsLoading(false);
    }
  }, [docId, workspaceId, navigate]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  useEffect(() => {
    if (!socket || !docId || !user) return;

    joinRoom('doc:join', { docId, userName: user.name, color: userColor }, 'doc:leave', { docId });

    setCollaborators((prev) => ({
      ...prev,
      [user._id]: { userName: user.name, color: userColor, avatar: user.avatar },
    }));

    const handleDocUpdate = (data) => {
      if (data.userId === user._id) return;
      if (data.content !== undefined) {
        const incoming = normalizeEditorContent(data.content);
        if (JSON.stringify(incoming) !== JSON.stringify(contentRef.current)) {
          isRemoteUpdateRef.current = true;
          setContent(incoming);
          contentRef.current = incoming;
        }
      }
      if (data.lastEditedBy?.name) {
        setCollaborators((prev) => ({
          ...prev,
          [data.userId]: {
            userName: data.lastEditedBy.name,
            color: prev[data.userId]?.color || pickColor(data.userId),
          },
        }));
      }
    };

    const handleCursorUpdate = (data) => {
      if (data.userId === user._id) return;
      setCursors((prev) => ({
        ...prev,
        [data.userId]: {
          position: data.position,
          userName: data.userName,
          color: data.color,
        },
      }));
      setCollaborators((prev) => ({
        ...prev,
        [data.userId]: {
          userName: data.userName,
          color: data.color,
          avatar: prev[data.userId]?.avatar,
        },
      }));
    };

    const handleCollaborator = (data) => {
      if (data.userId === user._id) return;
      setCollaborators((prev) => {
        const next = { ...prev };
        if (data.joined) {
          next[data.userId] = {
            userName: data.userName,
            color: data.color || pickColor(data.userId),
          };
        } else {
          delete next[data.userId];
        }
        return next;
      });
    };

    socket.on('doc:update', handleDocUpdate);
    socket.on('cursor:update', handleCursorUpdate);
    socket.on('doc:collaborator', handleCollaborator);

    return () => {
      socket.off('doc:update', handleDocUpdate);
      socket.off('cursor:update', handleCursorUpdate);
      socket.off('doc:collaborator', handleCollaborator);
    };
  }, [socket, docId, user, userColor, joinRoom]);

  const saveContent = useCallback(
    async (newContent) => {
      setSaveStatus('saving');
      try {
        await api.patch(`/docs/${docId}`, { content: newContent });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
        toast.error('Failed to save document');
      }
    },
    [docId]
  );

  const emitTyping = useCallback(
    (newContent) => {
      if (!socket || !user) return;
      socket.emit('doc:typing', {
        docId,
        content: newContent,
        cursorPosition: 0,
        userName: user.name,
        color: userColor,
      });
    },
    [socket, docId, user, userColor]
  );

  const handleContentChange = (json) => {
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }
    setContent(json);
    contentRef.current = json;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveContent(json), 1000);

    if (socketTimerRef.current) clearTimeout(socketTimerRef.current);
    socketTimerRef.current = setTimeout(() => emitTyping(json), 300);
  };

  const handleTitleBlur = async () => {
    if (!title.trim() || title === doc?.title) return;
    try {
      const res = await api.patch(`/docs/${docId}`, { title: title.trim() });
      setDoc(res.data.data);
      toast.success('Title updated');
    } catch {
      toast.error('Failed to update title');
      setTitle(doc?.title || '');
    }
  };

  const handleTogglePublic = async () => {
    try {
      const res = await api.patch(`/docs/${docId}`, { isPublic: !doc.isPublic });
      setDoc(res.data.data);
      toast.success(res.data.data.isPublic ? 'Document is now public' : 'Document is now private');
    } catch {
      toast.error('Failed to update sharing settings');
    }
  };

  const handleShare = () => {
    if (doc?.isPublic) {
      const link = `${window.location.origin}/dashboard/workspace/${workspaceId}/docs/${docId}`;
      navigator.clipboard.writeText(link);
      toast.success('Public link copied');
    } else {
      handleTogglePublic();
    }
  };

  const collabList = Object.entries(collaborators);
  const visibleCollabs = collabList.slice(0, 4);
  const overflowCount = collabList.length - 4;

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <SkeletonLoader variant="text" count={3} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-darkBorder bg-darkSurface/80 backdrop-blur-sm flex-shrink-0 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => navigate(`/dashboard/workspace/${workspaceId}/docs`)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-darkInput transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="flex-1 min-w-0 bg-transparent text-white font-sora text-[28px] font-semibold border-none outline-none focus:ring-0 placeholder-gray-600 truncate"
            placeholder="Untitled Document"
          />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center -space-x-2">
            {visibleCollabs.map(([id, collab]) => (
              <div
                key={id}
                className="rounded-full ring-2 ring-darkSurface"
                style={{ boxShadow: `0 0 0 2px ${collab.color}` }}
              >
                <Avatar src={collab.avatar} name={collab.userName} size="xs" />
              </div>
            ))}
            {overflowCount > 0 && (
              <div className="w-6 h-6 rounded-full bg-darkInput border border-darkBorder flex items-center justify-center text-[9px] text-gray-400 font-semibold">
                +{overflowCount}
              </div>
            )}
          </div>

          <span className="text-[10px] text-gray-500 flex items-center gap-1">
            {saveStatus === 'saving' && (
              <>
                <Loader2 size={10} className="animate-spin" />
                Saving...
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check size={10} className="text-green-400" />
                Saved
              </>
            )}
            {saveStatus === 'error' && <span className="text-red-400">Save failed</span>}
          </span>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigoAccent/50 text-indigoAccent text-xs font-semibold hover:bg-indigoAccent/10 transition-colors"
          >
            <Share2 size={14} />
            {doc?.isPublic ? 'Copy Link' : 'Make Public'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        <LiveCursors cursors={cursors} />
        <RichTextEditor content={content} onChange={handleContentChange} />
      </div>
    </div>
  );
}
