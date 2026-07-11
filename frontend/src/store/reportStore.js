import { create } from 'zustand';

export const useReportStore = create((set, get) => ({
  reports: [],
  currentReport: null,
  isLoading: false,
  error: null,
  
  setReports: (reports) => set({ reports }),
  setCurrentReport: (report) => set({ currentReport: report }),
  addReport: (report) => set((state) => ({
    reports: [report, ...state.reports]
  })),
  removeReport: (id) => set((state) => ({
    reports: state.reports.filter(r => r.id !== id)
  })),
  clearReports: () => set({ reports: [], currentReport: null }),
}));

export default useReportStore;
