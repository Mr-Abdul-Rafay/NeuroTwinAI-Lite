import { useEffect, useState } from 'react';
import useUploadStore from '../store/uploadStore';
import client from '../api/client';
import toast from 'react-hot-toast';

export function useSliceData(uploadId) {
  const { 
    mriData, 
    maskData, 
    currentSlice, 
    totalSlices, 
    setSlice, 
    setUploadDone 
  } = useUploadStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (maskData) {
      console.log('📁 Mask data type:', typeof maskData);
      console.log('📁 Mask data length:', maskData.length);
      console.log('📁 Mask data sample:', maskData.slice(0, 10));
    }
  }, [maskData]);

  useEffect(() => {
    if (!uploadId) return;
    
    // If we already have mriData and maskData in the global store for this uploadId, skip fetching
    const storeUploadId = useUploadStore.getState().uploadId;
    if (storeUploadId === uploadId && mriData && maskData) {
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch from backend
    client.get(`/inference/result/${uploadId}`)
      .then((r) => {
        const data = r.data;
        if (data && data.status === 'success') {
          setUploadDone(uploadId, data.segmentation, data.mri_data);
        } else {
          setError('Failed to load slice data.');
        }
      })
      .catch((err) => {
        console.error('Error fetching slice data:', err);
        setError(err.message || 'Error fetching slice data.');
        toast.error('Failed to load MRI slice data.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [uploadId, mriData, maskData, setUploadDone]);

  const nextSlice = () => {
    setSlice(Math.min(currentSlice + 1, totalSlices - 1));
  };

  const prevSlice = () => {
    setSlice(Math.max(currentSlice - 1, 0));
  };

  return {
    loading,
    error,
    currentSlice,
    totalSlices,
    setSlice,
    nextSlice,
    prevSlice,
  };
}
