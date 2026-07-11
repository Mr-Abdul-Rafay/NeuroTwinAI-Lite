import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Download, Eye, Layers, Image as ImageIcon } from 'lucide-react';
import useUploadStore from '../store/uploadStore';

export default function MRISliceViewer({ uploadId }) {
  const { 
    mriData, 
    maskData, 
    currentSlice, 
    totalSlices, 
    viewMode, 
    setSlice, 
    setViewMode 
  } = useUploadStore();

  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1.0);
  const [parsedMri, setParsedMri] = useState(null);
  const [parsedMask, setParsedMask] = useState(null);

  // Helper to decode Base64 to Uint8Array
  const decodeBase64 = (b64) => {
    if (!b64) return null;
    try {
      const binaryString = atob(b64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (e) {
      console.error("Failed to decode base64 slice data:", e);
      return null;
    }
  };

  // Decode volumes when data changes
  useEffect(() => {
    if (mriData) {
      setParsedMri(decodeBase64(mriData));
    } else {
      setParsedMri(null);
    }
  }, [mriData]);

  useEffect(() => {
    if (maskData) {
      setParsedMask(decodeBase64(maskData));
    } else {
      setParsedMask(null);
    }
  }, [maskData]);

  // Keyboard navigation for arrow keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') {
        return;
      }
      if (e.key === 'ArrowLeft') {
        setSlice(Math.max(currentSlice - 1, 0));
      } else if (e.key === 'ArrowRight') {
        setSlice(Math.min(currentSlice + 1, totalSlices - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlice, totalSlices, setSlice]);

  // Color definitions matching the Colab training spec
  const TUMOR_COLORS = {
    0: { r: 0, g: 0, b: 0, a: 0 },        // Background
    1: { r: 255, g: 0, b: 0, a: 200 },     // Necrotic Core (Red)
    2: { r: 255, g: 255, b: 0, a: 200 },   // Edema (Yellow)
    3: { r: 0, g: 0, b: 255, a: 200 },     // Enhancing Tumor (Blue)
  };

  const getColor = (classId) => {
    return TUMOR_COLORS[classId] || TUMOR_COLORS[0];
  };

  const debugClassDistribution = (maskData) => {
    const counts = {0:0, 1:0, 2:0, 3:0};
    for (let i = 0; i < maskData.length; i++) {
      counts[maskData[i]]++;
    }
    console.log('📊 Class Distribution:', counts);
    console.log('   Necrotic (1):', counts[1]);
    console.log('   Edema (2):', counts[2]);
    console.log('   Enhancing (3):', counts[3]);
    return counts;
  };

  // Run class distribution debug when mask changes
  useEffect(() => {
    if (parsedMask) {
      debugClassDistribution(parsedMask);
    }
  }, [parsedMask]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parsedMri) return;

    const ctx = canvas.getContext('2d');
    const size = 128;
    const imgData = ctx.createImageData(size, size);
    const sliceSize = size * size;
    const offset = currentSlice * sliceSize;

    for (let i = 0; i < sliceSize; i++) {
      const pixelIdx = offset + i;
      const mriVal = parsedMri[pixelIdx] ?? 0;
      const maskVal = parsedMask ? (parsedMask[pixelIdx] ?? 0) : 0;
      const canvasIdx = i * 4;

      let r = mriVal;
      let g = mriVal;
      let b = mriVal;
      let a = 255;

      if (viewMode === 'mask') {
        const color = getColor(maskVal);
        if (maskVal > 0) {
          r = color.r;
          g = color.g;
          b = color.b;
        } else {
          r = 0;
          g = 0;
          b = 0;
        }
      } else if (viewMode === 'overlay') {
        if (maskVal > 0) {
          const color = getColor(maskVal);
          // Alpha blending formula: (alpha * mask_color) + ((1 - alpha) * mri_color)
          const alpha = color.a / 255;
          r = Math.round(alpha * color.r + (1 - alpha) * mriVal);
          g = Math.round(alpha * color.g + (1 - alpha) * mriVal);
          b = Math.round(alpha * color.b + (1 - alpha) * mriVal);
        }
      }

      imgData.data[canvasIdx] = r;
      imgData.data[canvasIdx + 1] = g;
      imgData.data[canvasIdx + 2] = b;
      imgData.data[canvasIdx + 3] = a;
    }

    // Scale onto canvas context
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    tempCanvas.getContext('2d').putImageData(imgData, 0, 0);

    ctx.imageSmoothingEnabled = false; // Sharp medical viewer details
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const drawWidth = canvas.width * zoom;
    const drawHeight = canvas.height * zoom;

    ctx.drawImage(
      tempCanvas,
      cx - drawWidth / 2,
      cy - drawHeight / 2,
      drawWidth,
      drawHeight
    );
  }, [currentSlice, viewMode, zoom, parsedMri, parsedMask]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `mri_slice_${currentSlice}_${viewMode}.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(10, 10, 15, 0.65)' }}>
      {/* Canvas Wrapper */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', background: '#050508', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        {parsedMri ? (
          <canvas 
            ref={canvasRef} 
            width={380} 
            height={380} 
            style={{ display: 'block', maxWidth: '100%', height: 'auto', aspectRatio: '1/1' }} 
          />
        ) : (
          <div style={{ width: '380px', height: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', gap: '8px' }}>
            <div className="mini-spinner" style={{ width: '24px', height: '24px' }} />
            Loading MRI volume data...
          </div>
        )}

        <div className="mri-slice-counter" style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontFamily: 'Roboto Mono', color: '#46f1c5' }}>
          Slice: {currentSlice + 1} / {totalSlices}
        </div>
      </div>

      {/* Control bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* View Mode Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { id: 'original', label: 'MRI', icon: ImageIcon },
            { id: 'mask', label: 'Mask', icon: Layers },
            { id: 'overlay', label: 'Overlay', icon: Eye }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: active ? 'rgba(70,241,197,0.15)' : 'transparent',
                  border: active ? '1px solid rgba(70,241,197,0.3)' : '1px solid transparent',
                  color: active ? '#46f1c5' : 'rgba(255,255,255,0.5)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: active ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            onClick={() => setZoom(prev => Math.min(prev + 0.1, 2.5))}
            className="ctrl-btn" 
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button 
            onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
            className="ctrl-btn" 
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button 
            onClick={() => setZoom(1.0)}
            className="ctrl-btn" 
            title="Reset Zoom"
          >
            <RotateCcw size={14} />
          </button>
          <button 
            onClick={handleDownload}
            className="ctrl-btn" 
            title="Download Slice Image"
            disabled={!parsedMri}
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Navigation slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
        <button 
          onClick={() => setSlice(Math.max(currentSlice - 1, 0))}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', transition: 'all 0.2s' }}
          disabled={currentSlice === 0}
        >
          <ChevronLeft size={16} />
        </button>

        <input 
          type="range"
          min={0}
          max={totalSlices - 1}
          value={currentSlice}
          onChange={(e) => setSlice(parseInt(e.target.value))}
          style={{ flex: 1, accentColor: '#46f1c5', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', outline: 'none', cursor: 'pointer' }}
        />

        <button 
          onClick={() => setSlice(Math.min(currentSlice + 1, totalSlices - 1))}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', transition: 'all 0.2s' }}
          disabled={currentSlice === totalSlices - 1}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Color Legend */}
      <div className="color-legend">
        <span><span className="color-box" style={{background: '#FF0000'}}></span> Necrotic Core</span>
        <span><span className="color-box" style={{background: '#FFFF00'}}></span> Edema</span>
        <span><span className="color-box" style={{background: '#0000FF'}}></span> Enhancing Tumor</span>
      </div>

      {/* Navigation Tip */}
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontFamily: 'Roboto Mono' }}>
        Tip: Use keyboard left (◀) and right (▶) arrow keys to navigate slices.
      </div>
    </div>
  );
}
