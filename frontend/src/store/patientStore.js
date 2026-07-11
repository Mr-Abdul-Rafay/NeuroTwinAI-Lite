import { create } from 'zustand';
import { patientApi } from '../api/patients';

const usePatientStore = create((set) => ({
  patients: [],
  selectedPatient: null,
  isLoading: false,
  error: null,

  setPatients: (patients) => set({ patients }),
  setSelectedPatient: (patient) => set({ selectedPatient: patient }),
  
  fetchPatients: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await patientApi.getAll();
      if (res.status === 'success') {
        set({ patients: res.patients, isLoading: false });
      } else {
        set({ error: 'Failed to fetch patients', isLoading: false });
      }
    } catch (err) {
      set({ error: err.message || 'Error fetching patients', isLoading: false });
    }
  },

  addPatient: (patient) => set((state) => ({ 
    patients: [patient, ...state.patients] 
  })),

  updatePatientInStore: (id, data) => set((state) => ({
    patients: state.patients.map((p) => (p.id === id ? { ...p, ...data } : p)),
    selectedPatient: state.selectedPatient && state.selectedPatient.id === id 
      ? { ...state.selectedPatient, ...data } 
      : state.selectedPatient
  })),

  removePatient: (id) => set((state) => ({
    patients: state.patients.filter((p) => p.id !== id),
    selectedPatient: state.selectedPatient && state.selectedPatient.id === id ? null : state.selectedPatient
  })),
}));

export default usePatientStore;
