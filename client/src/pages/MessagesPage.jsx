import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckSquare, FileText, Folder, Link as LinkIcon, Loader2, MessageSquare,
  Search, Send, X, KanbanSquare,
} from 'lucide-react';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useMessageStore } from '../store/messageStore';
import { useSocket } from '../hooks/useSocket';
import { formatDistance } from '../utils/formatDate';
import api from '../services/api';
import toast from 'react-hot-toast';

const resourceIcons = { board: KanbanSquare, task: CheckSquare, doc: FileText, folder: Folder };
const flattenFolders = (nodes = []) => nodes.flatMap((node) => [node, ...flattenFolders(node.children)]);

function ResourceCard({ resource, onRemove }) {
  const Icon = resourceIcons[resource.type] || LinkIcon;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-darkInput border border-darkBorder rounded-lg">
      <Icon size={15} className="text-indigoAccent" />
      <span className="text-xs text-white truncate flex-1">{resource.title}</span>
      <button type="button" onClick={onRemove} className="text-gray-500 hover:text-white"><X size={14} /></button>
    </div>
  );
}

export default function MessagesPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { socket, joinRoom } = useSocket();
  const { setUnreadTotal, incrementUnread } = useMessageStore();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [membersQuery, setMembersQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [resource, setResource] = useState(null);
  const [resourceTab, setResourceTab] = useState('boards');
  const [folderTree, setFolderTree] = useState([]);
  const bottomRef = useRef(null);

  const otherParticipant = (conversation) =>
    conversation?.participants?.find((participant) => participant._id !== user?._id);

  const loadConversations = async () => {
    const res = await api.get(`/messages/conversations/workspace/${workspaceId}`);
    setConversations(res.data.data.conversations || []);
    setUnreadTotal(res.data.data.unreadTotal || 0);
  };

  useEffect(() => {
    if (!workspaceId) return;
    setIsLoading(true);
    loadConversations().catch(() => toast.error('Failed to load conversations')).finally(() => setIsLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleNotification = (data) => {
      if (data.workspaceId === workspaceId) {
        incrementUnread();
        loadConversations().catch(() => {});
      }
    };
    socket.on('dm:notification', handleNotification);
    return () => socket.off('dm:notification', handleNotification);
  }, [socket, workspaceId]);

  useEffect(() => {
    if (!socket || !active?._id) return undefined;
    joinRoom('dm:join', { conversationId: active._id }, 'dm:leave', { conversationId: active._id });
    const handleMessage = ({ message }) => {
      if (message.conversation !== active._id && message.conversation?._id !== active._id) return;
      setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]);
      loadConversations().catch(() => {});
    };
    socket.on('dm:message', handleMessage);
    return () => socket.off('dm:message', handleMessage);
  }, [socket, active?._id, joinRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = async (conversation) => {
    setActive(conversation);
    setPage(1);
    try {
      const res = await api.get(`/messages/conversations/${conversation._id}/messages`, { params: { page: 1, limit: 50 } });
      setMessages((res.data.data.messages || []).reverse());
      setHasMore(res.data.data.pagination?.hasNextPage || false);
      await api.patch(`/messages/conversations/${conversation._id}/read`);
      await loadConversations();
    } catch {
      toast.error('Failed to load messages');
    }
  };

  const startConversation = async (member) => {
    try {
      const res = await api.post('/messages/conversations', { workspaceId, recipientId: member._id });
      const conversation = res.data.data;
      await loadConversations();
      selectConversation(conversation);
      setMembersQuery('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start conversation');
    }
  };

  const loadMore = async () => {
    if (!active || !hasMore) return;
    const nextPage = page + 1;
    const res = await api.get(`/messages/conversations/${active._id}/messages`, { params: { page: nextPage, limit: 50 } });
    setMessages((current) => [...(res.data.data.messages || []).reverse(), ...current]);
    setHasMore(res.data.data.pagination?.hasNextPage || false);
    setPage(nextPage);
  };

  const sendMessage = async (event) => {
    event?.preventDefault();
    if (!active || !messageText.trim() || isSending) return;
    setIsSending(true);
    try {
      const res = await api.post(`/messages/conversations/${active._id}/messages`, { content: messageText.trim(), resourceLink: resource });
      setMessages((current) => current.some((item) => item._id === res.data.data._id) ? current : [...current, res.data.data]);
      setMessageText('');
      setResource(null);
      await loadConversations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const filteredMembers = useMemo(() => {
    const members = (currentWorkspace?.members || []).map((member) => member.user || member).filter((member) => member._id !== user?._id);
    if (!membersQuery.trim()) return [];
    return members.filter((member) => member.name?.toLowerCase().includes(membersQuery.toLowerCase()));
  }, [currentWorkspace, membersQuery, user?._id]);

  const openResourcePicker = async () => {
    setResourceOpen(true);
    if (!folderTree.length) {
      try {
        const res = await api.get(`/folders/workspace/${workspaceId}`);
        setFolderTree(res.data.data.tree || []);
      } catch {
        toast.error('Failed to load documents');
      }
    }
  };

  const chooseResource = (type, item) => {
    const id = item._id;
    const path = type === 'board' ? `/dashboard/workspace/${workspaceId}/boards/${id}` : type === 'doc' ? `/dashboard/workspace/${workspaceId}/docs/${id}` : `/dashboard/workspace/${workspaceId}/docs?folder=${id}`;
    setResource({ type, resourceId: id, title: item.title || item.name, url: path });
    setResourceOpen(false);
  };

  return (
    <div className="h-full min-h-0 flex">
      <aside className="w-[300px] flex-shrink-0 border-r border-darkBorder bg-darkSurface flex flex-col">
        <div className="p-5 border-b border-darkBorder"><h1 className="text-lg font-sora font-bold text-white">Messages</h1><div className="relative mt-4"><Search size={14} className="absolute left-3 top-2.5 text-gray-500" /><input value={membersQuery} onChange={(event) => setMembersQuery(event.target.value)} placeholder="Find or start a conversation..." className="w-full bg-darkInput border border-darkBorder rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-indigoAccent" /></div></div>
        {filteredMembers.length > 0 && <div className="p-2 border-b border-darkBorder">{filteredMembers.map((member) => <button key={member._id} type="button" onClick={() => startConversation(member)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-darkInput text-left"><Avatar src={member.avatar} name={member.name} size="xs" /><span className="text-xs text-gray-200">{member.name}</span></button>)}</div>}
        <div className="flex-1 overflow-y-auto p-2">{isLoading ? <Loader2 className="mx-auto mt-6 animate-spin text-indigoAccent" size={18} /> : conversations.map((conversation) => { const person = otherParticipant(conversation); return <button key={conversation._id} type="button" onClick={() => selectConversation(conversation)} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${active?._id === conversation._id ? 'bg-indigoAccent/10' : 'hover:bg-darkInput'}`}><Avatar src={person?.avatar} name={person?.name} size="sm" /><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-white truncate">{person?.name || 'Teammate'}</span><span className="block text-[11px] text-gray-500 truncate">{conversation.lastMessage?.content || 'No messages yet'}</span></span>{conversation.lastMessageAt && <span className="text-[10px] text-gray-500">{formatDistance(conversation.lastMessageAt)}</span>}{conversation.unreadCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-indigoAccent text-white text-[10px] flex items-center justify-center">{conversation.unreadCount}</span>}</button>; })}</div>
      </aside>
      <section className="flex-1 min-w-0 flex flex-col">
        {!active ? <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center"><MessageSquare size={34} className="text-indigoAccent" /><p className="text-sm text-gray-400">Select a conversation or find a teammate to message</p></div> : <><header className="h-16 flex items-center gap-3 px-6 border-b border-darkBorder bg-darkSurface"><Avatar src={otherParticipant(active)?.avatar} name={otherParticipant(active)?.name} size="sm" /><span className="text-sm font-semibold text-white flex-1">{otherParticipant(active)?.name}</span><button type="button" onClick={() => setActive(null)} className="p-2 text-gray-500 hover:text-white"><X size={16} /></button></header><div className="flex-1 overflow-y-auto p-6 space-y-3">{hasMore && <Button variant="secondary" onClick={loadMore}>Load More</Button>}{messages.map((message) => { const mine = message.sender?._id === user?._id || message.sender === user?._id; return <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[70%] px-4 py-2 rounded-xl ${mine ? 'bg-indigoAccent text-white' : 'bg-[#222536] text-gray-200'}`}>{!mine && <p className="text-[10px] font-semibold mb-1 text-gray-400">{message.sender?.name}</p>}<p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>{message.resourceLink?.type && <button type="button" onClick={() => navigate(message.resourceLink.url)} className="mt-2 w-full flex items-center gap-2 text-left bg-black/20 border-l-2 border-indigoAccent rounded p-2"><FileText size={14} /><span className="text-xs font-semibold truncate">{message.resourceLink.title}</span></button>}<p className="text-[10px] opacity-60 mt-1 text-right">{formatDistance(message.createdAt)}</p></div></div>; })}<div ref={bottomRef} /></div><form onSubmit={sendMessage} className="p-4 border-t border-darkBorder bg-darkSurface"><div className="flex gap-2 mb-2">{resource && <ResourceCard resource={resource} onRemove={() => setResource(null)} />}</div><div className="flex items-end gap-2"><button type="button" onClick={openResourcePicker} className="p-2.5 text-gray-400 hover:text-white bg-darkInput rounded-lg"><LinkIcon size={17} /></button><textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(event); } }} rows={1} placeholder="Write a message..." className="flex-1 resize-none bg-darkInput border border-darkBorder rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-indigoAccent" /><button type="submit" disabled={isSending || !messageText.trim()} className="p-2.5 rounded-lg bg-indigoAccent text-white disabled:opacity-50"><Send size={17} /></button></div></form></>}
      </section>
      <Modal isOpen={resourceOpen} onClose={() => setResourceOpen(false)} title="Share a resource" className="max-w-lg"><div className="flex gap-1 mb-4">{['boards', 'documents', 'folders'].map((tab) => <button key={tab} type="button" onClick={() => setResourceTab(tab)} className={`px-3 py-2 text-xs rounded-lg ${resourceTab === tab ? 'bg-indigoAccent text-white' : 'text-gray-400 hover:bg-darkInput'}`}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</div>{resourceTab === 'boards' && (currentWorkspace?.boards || []).map((board) => <button key={board._id} type="button" onClick={() => chooseResource('board', board)} className="w-full flex items-center gap-2 p-3 text-left hover:bg-darkInput rounded-lg"><KanbanSquare size={15} className="text-indigoAccent" />{board.name}</button>)}{resourceTab === 'documents' && flattenFolders(folderTree).flatMap((folder) => (folder.documents || []).map((doc) => <button key={doc._id} type="button" onClick={() => chooseResource('doc', doc)} className="w-full flex items-center gap-2 p-3 text-left hover:bg-darkInput rounded-lg"><FileText size={15} />{doc.title}</button>))}{resourceTab === 'folders' && flattenFolders(folderTree).map((folder) => <button key={folder._id} type="button" onClick={() => chooseResource('folder', folder)} className="w-full flex items-center gap-2 p-3 text-left hover:bg-darkInput rounded-lg"><Folder size={15} />{folder.name}</button>)}</Modal>
    </div>
  );
}
