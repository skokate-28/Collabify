import { create } from 'zustand';

export const useWorkspaceStore = create((set) => ({
  workspaces: [],
  currentWorkspace: null,

  setWorkspaces: (workspaces) => set({ workspaces }),
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  addWorkspace: (workspace) =>
    set((state) => ({ workspaces: [...state.workspaces, workspace] })),
  removeWorkspace: (workspaceId) =>
    set((state) => {
      const filtered = state.workspaces.filter((w) => w._id !== workspaceId);
      const nextCurrent =
        state.currentWorkspace?._id === workspaceId
          ? filtered[0] || null
          : state.currentWorkspace;
      return { workspaces: filtered, currentWorkspace: nextCurrent };
    }),
  updateWorkspace: (updatedWorkspace) =>
    set((state) => {
      const updatedList = state.workspaces.map((w) =>
        w._id === updatedWorkspace._id ? updatedWorkspace : w
      );
      const isCurrent = state.currentWorkspace?._id === updatedWorkspace._id;
      return {
        workspaces: updatedList,
        currentWorkspace: isCurrent ? updatedWorkspace : state.currentWorkspace,
      };
    }),
}));
