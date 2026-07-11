/**
 * api/upload.js
 * Service functions that wrap every backend endpoint used by the frontend.
 */
import client from './client';

// ── Health ────────────────────────────────────────────────────────────────
export const checkHealth = () =>
  client.get('/health').then((r) => r.data);

// ── Upload ────────────────────────────────────────────────────────────────

/**
 * Upload one or more MRI NIfTI files and trigger AI segmentation.
 * @param {File|File[]} files       The file(s) to upload (.nii / .nii.gz / .dcm / .zip)
 * @param {string}      patientId   Optional patient reference (e.g. "TX-7430")
 * @param {Function}    onProgress  Optional (pct: number) => void progress callback
 */
export const uploadMRI = (files, patientId = '', onProgress = null) => {
  const form = new FormData();
  if (Array.isArray(files)) {
    files.forEach((file) => {
      form.append('files', file);
    });
  } else if (files) {
    form.append('files', files);
  }
  if (patientId) form.append('patient_id', patientId);

  return client
    .post('/upload/mri', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (evt) => {
            const pct = Math.round((evt.loaded * 100) / (evt.total || 1));
            onProgress(pct);
          }
        : undefined,
    })
    .then((r) => r.data);
};

/**
 * GET /api/upload/recent
 * Returns the last N MRI upload records.
 */
export const getRecentUploads = (limit = 5) =>
  client.get('/upload/recent', { params: { limit } }).then((r) => r.data);

/**
 * GET /api/upload/stats
 * Returns aggregate upload statistics (total, this_week, success_rate).
 */
export const getUploadStats = () =>
  client.get('/upload/stats').then((r) => r.data);

// ── Inference ─────────────────────────────────────────────────────────────

/**
 * GET /api/inference/result/{uploadId}
 * Retrieves stored segmentation result for a given upload ID.
 */
export const getResult = (uploadId) =>
  client.get(`/inference/result/${uploadId}`).then((r) => r.data);

/**
 * GET /api/inference/model-info
 */
export const getModelInfo = () =>
  client.get('/inference/model-info').then((r) => r.data);

// ── Visualisation ─────────────────────────────────────────────────────────

/**
 * POST /api/viz/mesh
 * Generate a 3D GLTF mesh from a stored segmentation mask.
 * Returns base64-encoded .glb binary in response.json.mesh_gltf_b64
 */
export const generateMesh = (uploadId, options = {}) =>
  client
    .post('/viz/mesh', {
      upload_id: uploadId,
      classes: options.classes ?? [1, 2, 3],
      level: options.level ?? 0.5,
      step_size: options.step_size ?? 2,
    })
    .then((r) => r.data);

export const uploadApi = {
  uploadMRI: async (files, patientId, onProgress = null) => {
    const formData = new FormData();
    if (Array.isArray(files)) {
      files.forEach((file) => {
        formData.append('files', file);
      });
    } else if (files) {
      formData.append('files', files);
    }
    if (patientId) formData.append('patient_id', patientId);
    
    try {
      const response = await client.post('/upload/mri', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          console.log(`📤 Upload progress: ${percentCompleted}%`);
          if (onProgress) {
            onProgress(percentCompleted);
          }
        },
      });
      console.log('✅ Upload successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Upload failed:', error.message);
      throw error;
    }
  },
};

