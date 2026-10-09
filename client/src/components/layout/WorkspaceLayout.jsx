import React, { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useSocketStore } from '../../store/socketStore';
import { useWorkspaceStore } from '../../store/workspaceStore';

export default function WorkspaceLayout() {
  const { workspaceId } = useParams();
  const socket = useSocketStore((s) => s.socket);
  const { workspaces, setCurrentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (!workspaceId) return;
    const ws = workspaces.find((w) => w._id === workspaceId);
    if (ws) setCurrentWorkspace(ws);
  }, [workspaceId, workspaces, setCurrentWorkspace]);

  useEffect(() => {
    if (!socket || !workspaceId) return;
    socket.emit('workspace:join', { workspaceId });
    return () => {
      socket.emit('workspace:leave', { workspaceId });
    };
  }, [socket, workspaceId]);

  return <Outlet />;
}
