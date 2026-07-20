import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Brain, ShieldAlert, Sparkles, Activity } from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import useUploadStore from '../store/uploadStore';
import { useRecentUploads } from '../hooks/useUpload';
import api from '../api/client';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import GradCAMViewer from '../components/GradCAMViewer';

export default function XAIPage({ onNavigate }) {
  const { selectedPatientId, selectedPatient } = usePatient();
  const { uploadId } = useUploadStore();
  const { data: recentUploads = [] } = useRecentUploads(1);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [xaiData, setXaiData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const abortControllerRef = useRef(null);
  const isFetchingRef = useRef(false); // Prevents concurrent duplicate fetches
  const mountedRef = useRef(true);     // Tracks if component is mounted

  // Track mount status so we don't show cancel errors from unmount-driven aborts
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Resolve upload ID (priority to active upload, fallback to last completed upload)
  const activeUploadId = uploadId || (recentUploads?.[0]?.status === 'Completed' ? recentUploads[0].upload_id : null);

  useEffect(() => {
    if (!activeUploadId) return;

    // Check if data is already in session storage (client-side cache)
    const stored = sessionStorage.getItem(`xai_${activeUploadId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Cache-bust: if the stored response is the old single-image format
        // (missing separate mri_png / heatmap_png fields), discard it so we
        // fetch fresh data from the updated backend.
        const hasNewFormat = parsed?.key_slices?.axial?.mri_png;
        if (hasNewFormat) {
          setXaiData(parsed);
          setError(null);
          setIsLoading(false);
          return;
        }
        // Old format – remove and re-fetch
        sessionStorage.removeItem(`xai_${activeUploadId}`);
      } catch (e) {
        sessionStorage.removeItem(`xai_${activeUploadId}`);
      }
    }

    const fetchXAI = async () => {
      // Hard guard: if a fetch is already underway, do nothing
      if (isFetchingRef.current) return;
      if (isLoading) return;
      if (retryCount > 2) {
        setError('Failed to load explainability metrics after multiple attempts. Please restart backend or check resources.');
        toast.error('Failed to load explanation after multiple attempts');
        return;
      }

      isFetchingRef.current = true;

      setIsLoading(true);
      setError(null); // Always clear previous error before a new fetch

      // Create abort controller for request canceling capability
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        logger_console("Requesting XAI Grad-CAM for: " + activeUploadId);
        const response = await api.post(`/inference/xai/gradcam/${activeUploadId}`, {}, {
          signal: controller.signal,
          timeout: 200000 // 200-second axios timeout (backend takes up to 180s on CPU)
        });

        if (response.data?.status === 'success') {
          setXaiData(response.data);
          try {
            sessionStorage.setItem(`xai_${activeUploadId}`, JSON.stringify(response.data));
          } catch (storageErr) {
            console.warn("Could not cache XAI response in sessionStorage due to storage quota limits:", storageErr);
          }
          setError(null);
        } else {
          setError(response.data?.message || 'Failed to compute explainability map.');
        }
      } catch (err) {
        if (axios.isCancel(err) || err.name === 'CanceledError') {
          // If the component is still mounted, it was an explicit user cancel
          if (mountedRef.current) {
            setError('Analysis request was canceled.');
            toast.success('Request canceled');
          }
          // If unmounted (navigating away), silently ignore — no error state
        } else {
          console.error("XAI request error:", err);
          setRetryCount(prev => prev + 1);
          setError(err.displayMessage || 'Request timed out. Please try again.');
          toast.error('Request timed out. Please try again.');
        }
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false; // Release guard
      }
    };

    fetchXAI();

    // Abort ongoing network requests on component unmount to prevent leaks and timeouts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeUploadId, fetchTrigger]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    setXaiData(null);
    setError(null);
    isFetchingRef.current = false; // Allow retry fetch
    sessionStorage.removeItem(`xai_${activeUploadId}`);
    setFetchTrigger(prev => prev + 1); // Trigger refetch in useEffect
  };

  // Safe logging helper
  const logger_console = (msg) => {
    console.log(`[XAIPage] ${msg}`);
  };

  if (!selectedPatientId || !selectedPatient) {
    return (
      <div className="page-content fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <Brain size={48} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '16px' }} />
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0' }}>No Patient Selected</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 16px 0' }}>
          Please select a patient in the registry before accessing explainability.
        </p>
        <button onClick={() => onNavigate('patients')} className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
          Go to Patient Directory
        </button>
      </div>
    );
  }

  return (
    <div className="page-content fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', color: '#fff' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => onNavigate('ai-results')}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
              transition: 'all 0.2s',
            }}
            title="Back to AI Results"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: '#46f1c5' }} />
              AI Explainability Portal
            </h1>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0 0' }}>
              Visualizing network attention zones via 3D U-Net Backpropagation (Grad-CAM)
            </p>
          </div>
        </div>

        {/* Patient demographic card */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '6px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'flex', gap: '16px' }}>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: '6px' }}>PATIENT:</span>
            <strong>{selectedPatient.name}</strong>
          </div>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: '6px' }}>CASE ID:</span>
            <span style={{ fontFamily: 'Roboto Mono', color: '#46f1c5' }}>{selectedPatientId}</span>
          </div>
        </div>
      </div>

      {/* Main Panel content */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '45vh', background: 'rgba(15, 15, 25, 0.4)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '40px', gap: '16px' }}>
          <div className="mini-spinner" style={{ width: '36px', height: '36px', borderWidth: '3px' }} />
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '600', margin: 0 }}>Computing Neural Attention Maps</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0, maxWidth: '400px' }}>
              Running Gradient-weighted Class Activation Mapping (Grad-CAM) on the final feature layers of the 3D U-Net. This may take a few seconds...
            </p>
            <button 
              onClick={handleCancel}
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '5px 12px', borderColor: 'rgba(255,107,107,0.3)', color: '#FF6B6B', marginTop: '8px' }}
            >
              Cancel Calculation
            </button>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed rgba(239, 68, 68, 0.2)', borderRadius: '16px', padding: '40px', gap: '16px' }}>
          <ShieldAlert size={40} style={{ color: '#ef4444' }} />
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ color: '#ef4444', fontSize: '15px', fontWeight: '600', margin: 0 }}>XAI Generation Error</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '0 0 8px 0', maxWidth: '350px' }}>
              {error}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleRetry}
                className="btn-primary" 
                style={{ fontSize: '12px', padding: '6px 16px' }}
              >
                Retry Analysis
              </button>
              <button 
                onClick={() => onNavigate('ai-results')}
                className="btn-secondary" 
                style={{ fontSize: '12px', padding: '6px 16px' }}
              >
                Return to Results
              </button>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && xaiData && (
        <div className="fade-in">
          <GradCAMViewer xaiData={xaiData} />
        </div>
      )}

      {!isLoading && !error && !activeUploadId && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', textAlign: 'center' }}>
          <Brain size={40} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '12px' }} />
          <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '600', margin: '0 0 6px 0' }}>No Active Scans</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '0 0 16px 0' }}>
            There are no completed scans on record for this patient. Please upload an MRI scan first.
          </p>
          <button onClick={() => onNavigate('mri-upload')} className="btn-primary" style={{ fontSize: '12px' }}>
            Upload MRI Scan
          </button>
        </div>
      )}

    </div>
  );
}
