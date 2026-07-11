import { useEffect } from 'react';
import usePatientStore from '../store/patientStore';
import useUploadStore from '../store/uploadStore';
import useResultStore from '../store/resultStore';
import useReportStore from '../store/reportStore';

export function usePatientCleanup() {
  const patients = usePatientStore((state) => state.patients);
  const clearUploads = useUploadStore((state) => state.clearUploads);
  const clearResults = useResultStore((state) => state.clearResults);
  const clearReports = useReportStore((state) => state.clearReports);
  
  useEffect(() => {
    // When patients array becomes empty, clear all associated data
    if (patients.length === 0) {
      console.log('🧹 No patients found. Clearing all associated data...');
      clearUploads();  // Clear upload store
      clearResults();  // Clear results store
      clearReports();  // Clear reports store
      
      // Also clear local storage if using it
      localStorage.removeItem('selectedPatient');
      localStorage.removeItem('currentResults');
    }
  }, [patients, clearUploads, clearResults, clearReports]);
}
