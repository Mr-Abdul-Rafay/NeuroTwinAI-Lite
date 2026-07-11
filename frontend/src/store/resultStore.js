import { create } from 'zustand';

const useResultStore = create((set) => ({
  currentResults: null,
  setResults: (results) => set({ currentResults: results }),
  clearResults: () => set({ currentResults: null }),
}));

export default useResultStore;
