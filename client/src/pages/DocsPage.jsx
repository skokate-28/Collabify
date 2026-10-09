import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  FileText, Folder, Plus, MoreVertical, Pencil, Trash2, FolderInput,
  ChevronRight, ChevronDown, FolderPlus,
} from 'lucide-react';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import SkeletonLoader from '../components/common/SkeletonLoader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { formatDistance } from '../utils/formatDate';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useOutsideClick } from '../hooks/useOutsideClick';

function flattenFolders(nodes, trail = []) {
  if (!nodes) return [];
  return nodes.flatMap((node) => {
    const path = [...trail, node.name];
    return [{ ...node, path }, ...flattenFolders(node.children, path)];
  });
}

function findFolderPath(nodes, id, trail = []) {
  if (!id || !nodes) return [];
  for (const node of nodes) {
    const next = [...trail, node];
    if (node._id === id) return next;
    const nested = findFolderPath(node.children, id, next);
    if (nested.length) return nested;
  }
  return [];
}

function TreeRow({ folder, depth, selectedId, expanded, onToggle, onSelect, onMenu }) {
  const isOpen = expanded[folder._id];
  const isActive = selectedId === folder._id;
  const hasChildren = (folder.children || []).length > 0;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 pr-2 py-1.5 cursor-pointer text-xs ${
          isActive
            ? 'bg-indigoAccent/10 text-white border-l-2 border-indigoAccent'
            : 'text-gray-400 hover:bg-darkInput hover:text-white border-l-2 border-transparent'
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => onSelect(folder)}
        onContextMenu={(e) => {
          e.preventDefault();
          onMenu(e, folder);
        }}
      >
        <button
          type="button"
          className="p-0.5 rounded hover:bg-darkBorder flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(folder._id);
          }}
        >
          {hasChildren ? (
            isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <span className="w-3 inline-block" />
          )}
        </button>
        <Folder size={14} className="flex-shrink-0 text-indigo-300" />
        <span className="truncate flex-1">{folder.name}</span>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-500 hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            onMenu(e, folder);
          }}
        >
          <MoreVertical size={12} />
        </button>
      </div>
      {isOpen &&
        (folder.children || []).map((child) => (
          <TreeRow
            key={child._id}
            folder={child}
            depth={depth + 1}
            selectedId={selectedId}
            expanded={expanded}
            onToggle={onToggle}
            onSelect={onSelect}
            onMenu={onMenu}
          />
        ))}
    </div>
  );
}

function ItemMenu({ open, onClose, items }) {
  const ref = useOutsideClick(() => onClose?.());
  if (!open) return null;
  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 z-30 bg-darkSurface border border-darkBorder rounded-lg py-1 w-40 shadow-xl">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-darkInput ${
            item.danger ? 'text-red-400' : 'text-gray-300'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default function DocsPage() {
  const { workspaceId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();

  const [tree, setTree] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ hasNextPage: false, page: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState({});

  const [menu, setMenu] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [moveDest, setMoveDest] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState(null);
  const [newFolderError, setNewFolderError] = useState('');
  const [ctxMenu, setCtxMenu] = useState(null);

  const ctxRef = useOutsideClick(() => setCtxMenu(null));

  const isAdmin = currentWorkspace?.members?.some(
    (m) => (m.user?._id || m.user) === user?._id && m.role === 'admin'
  );
  const canEdit = currentWorkspace?.members?.some(
    (m) =>
      (m.user?._id || m.user) === user?._id && ['admin', 'member'].includes(m.role)
  );

  const allFolders = useMemo(() => flattenFolders(tree), [tree]);
  const breadcrumb = useMemo(
    () => findFolderPath(tree, selectedFolder?._id),
    [tree, selectedFolder]
  );

  const fetchTree = useCallback(async () => {
    const res = await api.get(`/folders/workspace/${workspaceId}`);
    setTree(res.data.data.tree || []);
  }, [workspaceId]);

  const fetchContents = useCallback(
    async (folder, page = 1, append = false) => {
      const folderId = folder?._id || 'root';
      const res = await api.get(`/folders/${folderId}/contents`, {
        params: { workspaceId, page, limit: 20 },
      });
      const data = res.data.data;
      setFolders(data.folders || []);
      setDocuments((prev) => (append ? [...prev, ...(data.documents || [])] : data.documents || []));
      setPagination(data.pagination || { hasNextPage: false, page: 1 });
      if (data.folder) setSelectedFolder(data.folder);
    },
    [workspaceId]
  );

  const refresh = useCallback(
    async (folder = selectedFolder) => {
      setIsLoading(true);
      try {
        await fetchTree();
        await fetchContents(folder, 1, false);
      } catch {
        toast.error('Failed to load documents');
      } finally {
        setIsLoading(false);
      }
    },
    [fetchTree, fetchContents, selectedFolder]
  );

  useEffect(() => {
    const boot = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/folders/workspace/${workspaceId}`);
        const t = res.data.data.tree || [];
        setTree(t);
        const folderParam = searchParams.get('folder');
        let initial = null;
        if (folderParam) {
          const found = flattenFolders(t).find((f) => f._id === folderParam);
          if (found) initial = found;
        }
        setSelectedFolder(initial);
        await fetchContents(initial, 1, false);
      } catch {
        toast.error('Failed to load documents');
      } finally {
        setIsLoading(false);
      }
    };
    if (workspaceId) boot();
  }, [workspaceId]);

  const selectFolder = (folder) => {
    setSelectedFolder(folder);
    if (folder?._id) {
      setSearchParams({ folder: folder._id });
      setExpanded((prev) => ({ ...prev, [folder._id]: true }));
    } else {
      setSearchParams({});
    }
    fetchContents(folder, 1, false);
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    setNewFolderError('');
    if (!newFolderName.trim()) {
      setNewFolderError('Folder name is required');
      return;
    }
    try {
      await api.post('/folders', {
        name: newFolderName.trim(),
        workspaceId,
        parentId: newFolderParent?._id || undefined,
      });
      setNewFolderOpen(false);
      setNewFolderName('');
      toast.success('Folder created');
      await fetchTree();
      await fetchContents(selectedFolder, 1, false);
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const handleCreateDoc = async () => {
    try {
      const res = await api.post('/docs', {
        workspaceId,
        folderId: selectedFolder?._id || undefined,
      });
      navigate(`/dashboard/workspace/${workspaceId}/docs/${res.data.data._id}`);
    } catch {
      toast.error('Failed to create document');
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    setRenameError('');
    if (!renameValue.trim()) {
      setRenameError('Name is required');
      return;
    }
    try {
      if (renameTarget.kind === 'folder') {
        await api.patch(`/folders/${renameTarget.item._id}`, { name: renameValue.trim() });
      } else {
        await api.patch(`/docs/${renameTarget.item._id}`, { title: renameValue.trim() });
      }
      setRenameTarget(null);
      toast.success('Renamed');
      await fetchTree();
      await fetchContents(selectedFolder, 1, false);
    } catch {
      toast.error('Failed to rename');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === 'folder') {
        await api.delete(`/folders/${deleteTarget.item._id}`);
        if (selectedFolder?._id === deleteTarget.item._id) {
          setSelectedFolder(null);
        }
      } else {
        await api.delete(`/docs/${deleteTarget.item._id}`);
      }
      setDeleteTarget(null);
      toast.success('Deleted');
      await fetchTree();
      await fetchContents(
        selectedFolder?._id === deleteTarget.item._id ? null : selectedFolder,
        1,
        false
      );
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleMove = async (e) => {
    e.preventDefault();
    if (!moveTarget) return;
    const dest = moveDest || null;
    try {
      if (moveTarget.kind === 'folder') {
        await api.patch(`/folders/${moveTarget.item._id}/move`, { newParentId: dest });
      } else {
        await api.patch(`/docs/${moveTarget.item._id}/move`, { newFolderId: dest });
      }
      setMoveTarget(null);
      toast.success('Moved');
      await fetchTree();
      await fetchContents(selectedFolder, 1, false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to move');
    }
  };

  const moveItem = async (kind, id, destFolderId) => {
    try {
      if (kind === 'folder') {
        if (id === destFolderId) return;
        await api.patch(`/folders/${id}/move`, { newParentId: destFolderId });
      } else {
        await api.patch(`/docs/${id}/move`, { newFolderId: destFolderId });
      }
      await fetchTree();
      await fetchContents(selectedFolder, 1, false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to move');
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const destId = result.destination.droppableId;
    const newParent = destId === 'drop-root' ? null : destId.replace('drop-folder-', '');
    const dragId = result.draggableId;
    if (dragId.startsWith('drag-doc-')) {
      moveItem('doc', dragId.replace('drag-doc-', ''), newParent);
    } else if (dragId.startsWith('drag-folder-')) {
      const id = dragId.replace('drag-folder-', '');
      moveItem('folder', id, newParent);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchContents(selectedFolder, (pagination.page || 1) + 1, true);
    } finally {
      setLoadingMore(false);
    }
  };

  const folderMenuItems = (folder) => [
    canEdit && {
      label: 'New Subfolder',
      icon: <FolderPlus size={12} />,
      onClick: () => {
        setNewFolderParent(folder);
        setNewFolderOpen(true);
      },
    },
    canEdit && {
      label: 'Rename',
      icon: <Pencil size={12} />,
      onClick: () => {
        setRenameTarget({ kind: 'folder', item: folder });
        setRenameValue(folder.name);
        setRenameError('');
      },
    },
    canEdit && {
      label: 'Move',
      icon: <FolderInput size={12} />,
      onClick: () => {
        setMoveTarget({ kind: 'folder', item: folder });
        setMoveDest('');
      },
    },
    isAdmin && {
      label: 'Delete',
      icon: <Trash2 size={12} />,
      danger: true,
      onClick: () => setDeleteTarget({ kind: 'folder', item: folder }),
    },
  ].filter(Boolean);

  const docMenuItems = (doc) => [
    canEdit && {
      label: 'Rename',
      icon: <Pencil size={12} />,
      onClick: () => {
        setRenameTarget({ kind: 'doc', item: doc });
        setRenameValue(doc.title);
        setRenameError('');
      },
    },
    canEdit && {
      label: 'Move',
      icon: <FolderInput size={12} />,
      onClick: () => {
        setMoveTarget({ kind: 'doc', item: doc });
        setMoveDest('');
      },
    },
    isAdmin && {
      label: 'Delete',
      icon: <Trash2 size={12} />,
      danger: true,
      onClick: () => setDeleteTarget({ kind: 'doc', item: doc }),
    },
  ].filter(Boolean);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex flex-col gap-6">
        <SkeletonLoader variant="card" count={3} />
      </div>
    );
  }

  const empty = folders.length === 0 && documents.length === 0;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full min-h-0">
        <aside className="w-[280px] flex-shrink-0 border-r border-darkBorder bg-darkSurface flex flex-col">
          <div className="p-3 border-b border-darkBorder">
            <Button
              variant="secondary"
              className="w-full text-xs"
              onClick={() => {
                setNewFolderParent(null);
                setNewFolderName('');
                setNewFolderError('');
                setNewFolderOpen(true);
              }}
              disabled={!canEdit}
            >
              <FolderPlus size={14} />
              New Folder
            </Button>
          </div>
          <Droppable droppableId="drop-root">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex-1 overflow-y-auto py-2 ${snapshot.isDraggingOver ? 'bg-indigoAccent/5' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => selectFolder(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${
                    !selectedFolder
                      ? 'bg-indigoAccent/10 text-white border-l-2 border-indigoAccent'
                      : 'text-gray-400 hover:bg-darkInput border-l-2 border-transparent'
                  }`}
                >
                  <FileText size={14} />
                  All Documents
                </button>
                {tree.map((folder) => (
                  <Droppable droppableId={`drop-folder-${folder._id}`} key={folder._id}>
                    {(p) => (
                      <div ref={p.innerRef} {...p.droppableProps}>
                        <TreeRow
                          folder={folder}
                          depth={0}
                          selectedId={selectedFolder?._id}
                          expanded={expanded}
                          onToggle={(id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))}
                          onSelect={selectFolder}
                          onMenu={(e, f) => {
                            setCtxMenu({ x: e.clientX, y: e.clientY, folder: f });
                          }}
                        />
                        {p.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </aside>

        <section className="flex-1 min-w-0 overflow-y-auto p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-1 flex-wrap">
                <button type="button" className="hover:text-white" onClick={() => selectFolder(null)}>
                  Root
                </button>
                {breadcrumb.map((f) => (
                  <span key={f._id} className="flex items-center gap-1">
                    <ChevronRight size={10} />
                    <button type="button" className="hover:text-white" onClick={() => selectFolder(f)}>
                      {f.name}
                    </button>
                  </span>
                ))}
              </div>
              <h1 className="text-lg font-bold text-white font-sora">
                {selectedFolder?.name || 'All Documents'}
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setNewFolderParent(selectedFolder);
                  setNewFolderName('');
                  setNewFolderError('');
                  setNewFolderOpen(true);
                }}
                disabled={!canEdit}
              >
                <FolderPlus size={14} />
                New Folder
              </Button>
              <Button variant="primary" onClick={handleCreateDoc} disabled={!canEdit}>
                <Plus size={16} />
                New Document
              </Button>
            </div>
          </div>

          {empty ? (
            <div className="bg-darkSurface border border-darkBorder rounded-2xl p-12 text-center flex flex-col items-center gap-4 mt-4">
              <div className="w-12 h-12 rounded-xl bg-indigoAccent/10 border border-indigoAccent/20 flex items-center justify-center text-indigoAccent">
                <Folder size={22} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">This folder is empty</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  Create a folder or document to start organizing your workspace.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setNewFolderParent(selectedFolder);
                    setNewFolderOpen(true);
                  }}
                >
                  New Folder
                </Button>
                <Button variant="primary" onClick={handleCreateDoc}>
                  New Document
                </Button>
              </div>
            </div>
          ) : (
            <>
              {folders.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Folders</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {folders.map((folder, index) => (
                      <Droppable droppableId={`drop-folder-${folder._id}`} key={folder._id}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps}>
                            <Draggable draggableId={`drag-folder-${folder._id}`} index={index}>
                              {(drag) => (
                                <div
                                  ref={drag.innerRef}
                                  {...drag.draggableProps}
                                  {...drag.dragHandleProps}
                                  className={`bg-darkSurface border rounded-xl p-5 flex flex-col gap-3 relative group ${
                                    snapshot.isDraggingOver
                                      ? 'border-indigoAccent'
                                      : 'border-darkBorder hover:border-indigoAccent/50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => selectFolder(folder)}
                                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                                    >
                                      <Folder size={20} className="text-indigo-300 flex-shrink-0" />
                                      <h3 className="text-sm font-semibold text-white truncate">{folder.name}</h3>
                                    </button>
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() => setMenu(menu === folder._id ? null : folder._id)}
                                        className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-darkInput"
                                      >
                                        <MoreVertical size={16} />
                                      </button>
                                      <ItemMenu
                                        open={menu === folder._id}
                                        onClose={() => setMenu(null)}
                                        items={folderMenuItems(folder)}
                                      />
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-gray-500">
                                    {folder.subfolderCount || 0} folders · {folder.documentCount || 0} documents
                                  </p>
                                  {provided.placeholder}
                                </div>
                              )}
                            </Draggable>
                          </div>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </div>
              )}

              {documents.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Documents</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc, index) => (
                      <Draggable draggableId={`drag-doc-${doc._id}`} index={index} key={doc._id}>
                        {(drag) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            {...drag.dragHandleProps}
                            className="bg-darkSurface border border-darkBorder hover:border-indigoAccent/50 transition-all rounded-xl p-5 flex flex-col gap-3 relative"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/dashboard/workspace/${workspaceId}/docs/${doc._id}`)}
                                className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                              >
                                <FileText size={18} className="text-amber-400 flex-shrink-0" />
                                <h3 className="text-sm font-semibold text-white truncate">{doc.title}</h3>
                              </button>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setMenu(menu === doc._id ? null : doc._id)}
                                  className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-darkInput"
                                >
                                  <MoreVertical size={16} />
                                </button>
                                <ItemMenu
                                  open={menu === doc._id}
                                  onClose={() => setMenu(null)}
                                  items={docMenuItems(doc)}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-gray-500 border-t border-darkBorder pt-3">
                              <span>{formatDistance(doc.updatedAt)}</span>
                              {doc.lastEditedBy && (
                                <span className="flex items-center gap-1.5">
                                  <Avatar src={doc.lastEditedBy.avatar} name={doc.lastEditedBy.name} size="xs" />
                                  {doc.lastEditedBy.name}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                </div>
              )}

              {pagination.hasNextPage && (
                <div className="flex justify-center mt-6">
                  <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {ctxMenu && (
        <div
          ref={ctxRef}
          className="fixed z-50 bg-darkSurface border border-darkBorder rounded-lg py-1 w-40 shadow-xl"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          {folderMenuItems(ctxMenu.folder).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick();
                setCtxMenu(null);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-darkInput ${
                item.danger ? 'text-red-400' : 'text-gray-300'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={newFolderOpen} onClose={() => setNewFolderOpen(false)} title="New Folder" className="max-w-sm">
        <form onSubmit={handleCreateFolder} className="flex flex-col gap-4">
          <Input
            label="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            error={newFolderError}
            placeholder="e.g. Project Specs"
            autoFocus
          />
          <p className="text-[11px] text-gray-500">
            {newFolderParent ? `Created inside ${newFolderParent.name}` : 'Created at workspace root'}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!renameTarget} onClose={() => setRenameTarget(null)} title="Rename" className="max-w-sm">
        <form onSubmit={handleRename} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            error={renameError}
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button variant="primary" type="submit">Rename</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!moveTarget} onClose={() => setMoveTarget(null)} title="Move" className="max-w-sm">
        <form onSubmit={handleMove} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-400">Destination folder</label>
            <select
              value={moveDest}
              onChange={(e) => setMoveDest(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-darkInput border border-darkBorder text-gray-200 text-sm focus:outline-none focus:border-indigoAccent"
            >
              <option value="">Root (All Documents)</option>
              {allFolders
                .filter((f) => f._id !== moveTarget?.item?._id)
                .map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.path.join(' / ')}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setMoveTarget(null)}>Cancel</Button>
            <Button variant="primary" type="submit">Move</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.kind === 'folder' ? 'Delete Folder' : 'Delete Document'}
        message={
          deleteTarget?.kind === 'folder'
            ? `Delete "${deleteTarget?.item?.name}" and everything inside it? This cannot be undone.`
            : `Are you sure you want to delete "${deleteTarget?.item?.title}"? This cannot be undone.`
        }
        confirmText="Delete"
        type="danger"
      />
    </DragDropContext>
  );
}
