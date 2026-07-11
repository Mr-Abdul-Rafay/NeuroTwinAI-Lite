/**
 * api/patients.js
 * API client methods for patient CRUD operations.
 */
import client from './client';

export const patientApi = {
  create: (data) => client.post('/patients', data).then((r) => r.data),
  getAll: () => client.get('/patients').then((r) => r.data),
  getById: (id) => client.get(`/patients/${id}`).then((r) => r.data),
  update: (id, data) => client.put(`/patients/${id}`, data).then((r) => r.data),
  delete: (id) => client.delete(`/patients/${id}`).then((r) => r.data),
  getUploads: (id) => client.get(`/patients/${id}/uploads`).then((r) => r.data),
  getReports: (id) => client.get(`/patients/${id}/reports`).then((r) => r.data),
};
