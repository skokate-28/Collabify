import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import JoinPage from './pages/JoinPage';
import AppLayout from './components/layout/AppLayout';
import WorkspaceLayout from './components/layout/WorkspaceLayout';
import DashboardPage from './pages/DashboardPage';
import BoardsPage from './pages/BoardsPage';
import BoardPage from './pages/BoardPage';
import DocsPage from './pages/DocsPage';
import DocEditorPage from './pages/DocEditorPage';
import ProfilePage from './pages/ProfilePage';
import MessagesPage from './pages/MessagesPage';

function AppRoutes() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/join/:inviteCode" element={<JoinPage />} />

      <Route path="/dashboard" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="workspace/:workspaceId" element={<WorkspaceLayout />}>
          <Route path="boards" element={<BoardsPage />} />
          <Route path="boards/:boardId" element={<BoardPage />} />
          <Route path="docs" element={<DocsPage />} />
          <Route path="docs/:docId" element={<DocEditorPage />} />
          <Route path="messages" element={<MessagesPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#16181D',
            border: '1px solid #2A2D35',
            color: '#fff',
            fontSize: '12px',
          },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  );
}
