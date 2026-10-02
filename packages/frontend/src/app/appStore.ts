import { create } from 'zustand';

export type SceneId = 'shapes' | 'draw';

interface AppStore {
  activeScene: SceneId | null;
  menuOpen: boolean;
  setScene: (id: SceneId | null) => void;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  activeScene: 'shapes',
  menuOpen: true, // start at the launcher
  setScene: (id) => set({ activeScene: id, menuOpen: false }),
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),
  toggleMenu: () => set({ menuOpen: !get().menuOpen }),
}));
