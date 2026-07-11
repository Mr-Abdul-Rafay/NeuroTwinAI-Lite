import api from './client';

export const reportsApi = {
  getAll: () => api.get('/reports').then((r) => r.data),
  getById: (id) => api.get(`/reports/${id}`).then((r) => r.data),
  getByPatient: (patientId) => api.get(`/patients/${patientId}/reports`).then((r) => r.data),
  generate: (uploadId) => api.post(`/reports/generate/${uploadId}`).then((r) => r.data),
  create: (data) => api.post('/reports', data).then((r) => r.data),
  delete: (id) => api.delete(`/reports/${id}`).then((r) => r.data),
};
