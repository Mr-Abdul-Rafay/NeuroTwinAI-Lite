/**
 * hooks/useUpload.js
 * React Query hooks for all upload/inference/viz API calls.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  uploadMRI,
  getRecentUploads,
  getUploadStats,
  getResult,
  generateMesh,
} from '../api/upload';
import useUploadStore from '../store/uploadStore';

// ── Mutation: upload MRI file ─────────────────────────────────────────────

export function useUploadMRI(onSuccess) {
  const { setUploadStart, setUploadProgress, setUploadDone, setUploadError } =
    useUploadStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, files, patientId }) =>
      uploadMRI(files || file, patientId, (pct) => setUploadProgress(pct)),

    onMutate: () => {
      setUploadStart();
      toast.loading('Uploading MRI and running AI segmentation…', {
        id: 'mri-upload',
      });
    },

    onSuccess: (data) => {
      const seg = data?.segmentation ?? {};
      setUploadDone(data?.upload_id, seg, data?.mri_data);
      toast.success(
        seg.tumor_detected
          ? `Tumour detected — ${seg.tumor_volume_cm3?.toFixed(1)} cm³ (${(seg.confidence * 100).toFixed(1)}% confidence)`
          : 'No tumour detected — scan clear.',
        { id: 'mri-upload', duration: 5000 },
      );
      // Invalidate recent uploads cache so the sidebar refreshes
      queryClient.invalidateQueries({ queryKey: ['recent-uploads'] });
      queryClient.invalidateQueries({ queryKey: ['upload-stats'] });
      if (onSuccess) onSuccess(data);
    },

    onError: (err) => {
      setUploadError();
      toast.error(err.displayMessage ?? 'Upload failed. Please try again.', {
        id: 'mri-upload',
        duration: 6000,
      });
    },
  });
}

// ── Query: recent uploads ─────────────────────────────────────────────────

export function useRecentUploads(limit = 5) {
  return useQuery({
    queryKey: ['recent-uploads', limit],
    queryFn: () => getRecentUploads(limit),
    staleTime: 30_000,        // re-fetch if data is older than 30 s
    refetchInterval: 60_000,  // background refresh every 60 s
    retry: 1,
    select: (data) => data?.uploads ?? [],
  });
}

// ── Query: upload stats ───────────────────────────────────────────────────

export function useUploadStats() {
  return useQuery({
    queryKey: ['upload-stats'],
    queryFn: getUploadStats,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
    select: (data) => ({
      total:       data?.total       ?? 0,
      thisWeek:    data?.this_week   ?? 0,
      successRate: data?.success_rate ?? 0,
    }),
  });
}

// ── Query: single segmentation result ────────────────────────────────────

export function useResult(uploadId) {
  return useQuery({
    queryKey: ['result', uploadId],
    queryFn: () => getResult(uploadId),
    enabled: !!uploadId,
    staleTime: Infinity,   // results don't change after completion
    retry: 1,
    select: (data) => data?.segmentation ?? null,
  });
}

// ── Mutation: generate 3D mesh ────────────────────────────────────────────

export function useGenerateMesh() {
  const { setMeshLoading, setMesh, setMeshError } = useUploadStore();

  return useMutation({
    mutationFn: ({ uploadId, options }) => generateMesh(uploadId, options),

    onMutate: () => {
      setMeshLoading();
      toast.loading('Generating 3D mesh…', { id: 'mesh-gen' });
    },

    onSuccess: (data) => {
      if (data?.mesh_gltf_b64) {
        setMesh(data.mesh_gltf_b64);
        toast.success('3D model ready!', { id: 'mesh-gen' });
      } else {
        setMeshError();
        toast(data?.message ?? 'No mesh generated (no tumour region).', {
          id: 'mesh-gen',
          icon: 'ℹ️',
        });
      }
    },

    onError: (err) => {
      setMeshError();
      toast.error(err.displayMessage ?? 'Mesh generation failed.', {
        id: 'mesh-gen',
        duration: 5000,
      });
    },
  });
}
