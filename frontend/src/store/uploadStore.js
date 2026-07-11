/**
 * store/uploadStore.js
 * Zustand global store — holds current upload, result, and mesh data.
 * Accessible from any component without prop drilling.
 */
import { create } from 'zustand';

const useUploadStore = create((set, get) => ({
  // ── Upload state ──────────────────────────────────────────────────────────
  uploadId: null,           // "UP-12345" returned from backend
  uploadProgress: 0,        // 0–100 during multipart upload
  isUploading: false,
  uploads: [],              // recent uploads array list

  // ── Segmentation result ───────────────────────────────────────────────────
  segmentation: null,       // full segmentation object from backend
  /*
    segmentation shape:
    {
      tumor_detected: bool,
      tumor_volume_cm3: float,
      confidence: float (0–1),
      necrotic_volume_mm3: float,
      edema_volume_mm3: float,
      enhancing_volume_mm3: float,
      mask_shape: [128,128,128],
    }
  */

  // ── Slice Visualization State ─────────────────────────────────────────────
  mriData: null,            // base64 encoded flat uint8 array of MRI volume
  maskData: null,           // base64 encoded flat uint8 array of segmentation mask
  currentSlice: 64,
  totalSlices: 128,
  viewMode: 'overlay',      // 'original' | 'mask' | 'overlay'

  // ── Mesh ──────────────────────────────────────────────────────────────────
  meshGltfB64: null,        // base64 GLB string
  isGeneratingMesh: false,

  // ── Actions ───────────────────────────────────────────────────────────────
  setUploadStart: () =>
    set({
      isUploading: true,
      uploadProgress: 0,
      segmentation: null,
      meshGltfB64: null,
      mriData: null,
      maskData: null,
      currentSlice: 64,
      totalSlices: 128,
    }),

  setUploadProgress: (pct) => set({ uploadProgress: pct }),

  setUploadDone: (uploadId, segmentation, mriData = null) =>
    set({
      isUploading: false,
      uploadProgress: 100,
      uploadId,
      segmentation,
      mriData: mriData,
      maskData: segmentation?.mask ?? null,
      totalSlices: segmentation?.mask_shape?.[0] ?? 128,
      currentSlice: Math.floor((segmentation?.mask_shape?.[0] ?? 128) / 2),
    }),

  setUploadError: () =>
    set({ isUploading: false, uploadProgress: 0 }),

  setSlice: (sliceNum) => set({ currentSlice: sliceNum }),
  setViewMode: (mode) => set({ viewMode: mode }),

  setMeshLoading: () => set({ isGeneratingMesh: true }),

  setMesh: (b64) => set({ meshGltfB64: b64, isGeneratingMesh: false }),

  setMeshError: () => set({ isGeneratingMesh: false }),

  clearUpload: () =>
    set({
      uploadId: null,
      uploadProgress: 0,
      isUploading: false,
      segmentation: null,
      mriData: null,
      maskData: null,
      currentSlice: 64,
      totalSlices: 128,
      viewMode: 'overlay',
      meshGltfB64: null,
      isGeneratingMesh: false,
    }),

  setUploads: (uploads) => set({ uploads }),
  removeUploadsForPatient: (patientId) => set((state) => ({
    uploads: state.uploads.filter((u) => u.patient_id !== patientId)
  })),
  addUpload: (upload) => set((state) => ({
    uploads: [upload, ...state.uploads],
  })),
  getPatientUploads: (patientId) => {
    return get().uploads.filter((u) => u.patient_id === patientId);
  },
  clearUploads: () => set({
    uploads: [],
    uploadId: null,
    segmentation: null,
    mriData: null,
    maskData: null,
    isUploading: false,
    uploadProgress: 0
  }),
}));

export default useUploadStore;
