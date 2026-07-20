import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Sliders, Eye,
  Sparkles, FileText, Activity, Layers, Brain,
} from 'lucide-react';
import useUploadStore from '../store/uploadStore';

/* ─────────────────────────────────────────────────────────────────────────
   Jet colormap helper  (identical to the Python one in xai_service.py)
───────────────────────────────────────────────────────────────────────── */
function getJetColor(val) {
  const v = val / 255;
  const r = Math.min(Math.max(1.5 - Math.abs(v * 4 - 3), 0), 1) * 255;
  const g = Math.min(Math.max(1.5 - Math.abs(v * 4 - 2), 0), 1) * 255;
  const b = Math.min(Math.max(1.5 - Math.abs(v * 4 - 1), 0), 1) * 255;
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

/* ─────────────────────────────────────────────────────────────────────────
   LayeredSliceView – stacks MRI + heatmap PNG with live CSS opacity
   Props:
     mriSrc      – data URI for grayscale MRI slice PNG
     heatmapSrc  – data URI for RGBA heatmap-only PNG (transparent bg)
     opacity     – 0..1, how opaque the heatmap overlay is
     label       – corner label string
     size        – pixel size for the square canvas (default 320)
───────────────────────────────────────────────────────────────────────── */
function LayeredSliceView({ mriSrc, heatmapSrc, opacity, label, size = 320 }) {
  const hasBothLayers = !!(mriSrc && heatmapSrc);
  const hasAnyImage   = !!(mriSrc || heatmapSrc);

  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#050508',
        flexShrink: 0,
      }}
    >
      {/* ── MRI background layer ── */}
      {mriSrc && (
        <img
          src={mriSrc}
          alt="MRI background"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      )}

      {/* ── Heatmap overlay layer (adjustable opacity) ── */}
      {heatmapSrc && (
        <img
          src={heatmapSrc}
          alt="Heatmap overlay"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity,                          // ← the key: live CSS opacity
            mixBlendMode: 'screen',           // blends jet colours onto grey MRI
            transition: 'opacity 0.05s linear',
          }}
        />
      )}

      {/* ── Fallback when only overlay_png is available (legacy) ── */}
      {!hasBothLayers && hasAnyImage && (
        <img
          src={mriSrc || heatmapSrc}
          alt="MRI / heatmap overlay"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}

      {/* ── Placeholder when nothing loaded yet ── */}
      {!hasAnyImage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'rgba(255,255,255,0.2)',
          }}
        >
          <Brain size={36} />
          <span style={{ fontSize: '11px' }}>Loading slice…</span>
        </div>
      )}

      {/* ── Slice label ── */}
      {label && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            background: 'rgba(0,0,0,0.75)',
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'Roboto Mono, monospace',
            color: '#46f1c5',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main GradCAMViewer component
───────────────────────────────────────────────────────────────────────── */
export default function GradCAMViewer({ xaiData }) {
  const { mriData } = useUploadStore();

  // ── View & control state ──────────────────────────────────────────────
  const [viewType, setViewType]               = useState('axial');
  const [activeExplanation, setActiveExplanation] = useState('clinical');
  const [interactiveSlice, setInteractiveSlice]   = useState(64);
  // opacity: 0 = MRI only, 1 = heatmap only, default 0.6
  const [opacity, setOpacity] = useState(0.6);

  // ── Canvas (interactive mode) ─────────────────────────────────────────
  const canvasRef        = useRef(null);
  const [parsedMri,     setParsedMri]     = useState(null);
  const [parsedHeatmap, setParsedHeatmap] = useState(null);

  // Decode base64 binary blob
  const decodeBase64 = (b64) => {
    if (!b64) return null;
    try {
      const bin  = atob(b64);
      const arr  = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    } catch (e) {
      console.error('[GradCAMViewer] base64 decode failed:', e);
      return null;
    }
  };

  // Decode raw voxel data for interactive canvas
  useEffect(() => {
    if (mriData)                   setParsedMri(decodeBase64(mriData));
    if (xaiData?.heatmap_data)     setParsedHeatmap(decodeBase64(xaiData.heatmap_data));
  }, [mriData, xaiData]);

  // ── Sync interactive slice to peak axial slice when switching modes ───
  useEffect(() => {
    if (viewType === 'interactive' && xaiData?.key_slices?.axial?.slice_idx != null) {
      setInteractiveSlice(xaiData.key_slices.axial.slice_idx);
    }
  }, [viewType, xaiData]);

  // ── Interactive canvas render loop ────────────────────────────────────
  useEffect(() => {
    if (viewType !== 'interactive') return;
    const canvas = canvasRef.current;
    if (!canvas || !parsedMri || !parsedHeatmap) return;

    const ctx       = canvas.getContext('2d');
    const SIZE      = 128;
    const sliceSize = SIZE * SIZE;
    const offset    = interactiveSlice * sliceSize;
    const imgData   = ctx.createImageData(SIZE, SIZE);

    // Heatmap threshold consistent with backend (35%)
    const THRESHOLD = Math.round(0.35 * 255);

    for (let i = 0; i < sliceSize; i++) {
      const mriVal  = parsedMri[offset + i]  ?? 0;
      const heatVal = parsedHeatmap[offset + i] ?? 0;
      const ci      = i * 4;

      // Base: grayscale MRI
      let r = mriVal, g = mriVal, b = mriVal;

      if (heatVal > THRESHOLD) {
        const jet = getJetColor(heatVal);
        // Alpha-blend: result = (1-opacity)*mri + opacity*jet
        r = Math.round((1 - opacity) * mriVal + opacity * jet.r);
        g = Math.round((1 - opacity) * mriVal + opacity * jet.g);
        b = Math.round((1 - opacity) * mriVal + opacity * jet.b);
      }

      imgData.data[ci]     = r;
      imgData.data[ci + 1] = g;
      imgData.data[ci + 2] = b;
      imgData.data[ci + 3] = 255;
    }

    // Scale 128×128 → 320×320
    const tmp = document.createElement('canvas');
    tmp.width = tmp.height = SIZE;
    tmp.getContext('2d').putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  }, [interactiveSlice, opacity, viewType, parsedMri, parsedHeatmap]);

  // ── Derive data ───────────────────────────────────────────────────────
  const explanations = xaiData?.explanations || {};
  const technical    = explanations?.technical || xaiData?.technical || {};
  const confidence   = ((technical.confidence ?? 0) * 100).toFixed(1);
  const volume       = (technical.volume_cm3 ?? 0).toFixed(3);
  const keySlices    = xaiData?.key_slices || {};

  // Extract per-view images (support old string format + new dict format)
  const getViewImages = (viewKey) => {
    const entry = keySlices[viewKey];
    if (!entry) return { mri: null, heatmap: null, overlay: null, sliceIdx: 64 };
    return {
      mri:      entry.mri_png     || null,
      heatmap:  entry.heatmap_png || null,
      overlay:  entry.overlay_png || entry.image || null,
      sliceIdx: entry.slice_idx   ?? 64,
    };
  };

  const currentView = getViewImages(viewType);
  const totalSlices = 128;

  // ── View tabs config ──────────────────────────────────────────────────
  const viewTabs = [
    { id: 'axial',       label: 'Axial',       title: 'Top-to-bottom horizontal slices' },
    { id: 'sagittal',    label: 'Sagittal',     title: 'Left-to-right vertical slices'   },
    { id: 'coronal',     label: 'Coronal',      title: 'Front-to-back vertical slices'   },
    { id: 'interactive', label: 'Interactive',  title: 'Adjustable axial slice + opacity' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        width: '100%',
      }}
    >
      {/* ══════════════════════════════════════════════════════════════
          LEFT PANEL – Image viewer
      ══════════════════════════════════════════════════════════════ */}
      <div
        className="glass-card"
        style={{
          padding: '24px',
          background: 'rgba(15,15,25,0.7)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* ── View-type tabs ── */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            background: 'rgba(255,255,255,0.03)',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {viewTabs.map(({ id, label, title }) => (
            <button
              key={id}
              title={title}
              onClick={() => setViewType(id)}
              style={{
                flex: 1,
                background: viewType === id ? 'rgba(70,241,197,0.15)' : 'transparent',
                border: 'none',
                color: viewType === id ? '#46f1c5' : 'rgba(255,255,255,0.5)',
                padding: '7px 4px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Main viewer area ── */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#050508',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
            padding: '16px',
            minHeight: '340px',
          }}
        >
          {/* Static pre-rendered views (axial / sagittal / coronal) */}
          {viewType !== 'interactive' && (
            <LayeredSliceView
              mriSrc={currentView.mri}
              heatmapSrc={currentView.heatmap}
              opacity={opacity}
              label={`${viewType.charAt(0).toUpperCase() + viewType.slice(1)} · Slice ${currentView.sliceIdx} (Max Focus)`}
              size={320}
            />
          )}

          {/* Interactive canvas view */}
          {viewType === 'interactive' && (
            <div
              style={{
                position: 'relative',
                width: '320px',
                height: '320px',
              }}
            >
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                style={{ display: 'block', width: '320px', height: '320px', borderRadius: '8px' }}
              />
              {/* Show placeholder if data not ready */}
              {(!parsedMri || !parsedHeatmap) && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: 'rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    background: '#050508',
                  }}
                >
                  <Brain size={36} />
                  <span style={{ fontSize: '11px' }}>
                    Raw volume data not available –<br />use Axial / Sagittal / Coronal views
                  </span>
                </div>
              )}
              {/* Slice label */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  background: 'rgba(0,0,0,0.75)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontFamily: 'Roboto Mono, monospace',
                  color: '#46f1c5',
                }}
              >
                Interactive · Slice {interactiveSlice + 1} / {totalSlices} (Axial)
              </div>
            </div>
          )}

          {/* ── Jet colormap legend ── */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              background: 'rgba(0,0,0,0.65)',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '10px',
              color: 'rgba(255,255,255,0.75)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Attention
            </div>
            {[
              { color: '#ff0000', label: 'High (Red)' },
              { color: '#ffff00', label: 'Med (Yellow)' },
              { color: '#00ffff', label: 'Low (Cyan)' },
              { color: '#0000ff', label: 'Min (Blue)' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Opacity slider (visible for ALL view modes) ── */}
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Opacity header + value badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              <Layers size={13} />
              <span>Heatmap Overlay Opacity</span>
            </div>
            <div
              style={{
                background: 'rgba(70,241,197,0.1)',
                border: '1px solid rgba(70,241,197,0.25)',
                padding: '2px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                fontFamily: 'Roboto Mono, monospace',
                color: '#46f1c5',
              }}
            >
              {Math.round(opacity * 100)}%
            </div>
          </div>

          {/* Labels + slider row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
              🧠 MRI Only
            </span>
            <input
              id="heatmap-opacity-slider"
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              style={{
                flex: 1,
                accentColor: '#46f1c5',
                height: '5px',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
              🔴 Heatmap
            </span>
          </div>

          {/* Quick preset buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: 'MRI Only',  value: 0    },
              { label: '30%',       value: 0.30 },
              { label: '60% ★',    value: 0.60 },
              { label: '80%',       value: 0.80 },
              { label: 'Heat Only', value: 1    },
            ].map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setOpacity(value)}
                style={{
                  flex: 1,
                  background: Math.abs(opacity - value) < 0.01
                    ? 'rgba(70,241,197,0.2)'
                    : 'rgba(255,255,255,0.04)',
                  border: Math.abs(opacity - value) < 0.01
                    ? '1px solid rgba(70,241,197,0.4)'
                    : '1px solid rgba(255,255,255,0.06)',
                  color: Math.abs(opacity - value) < 0.01
                    ? '#46f1c5'
                    : 'rgba(255,255,255,0.5)',
                  borderRadius: '6px',
                  padding: '5px 2px',
                  fontSize: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Interactive-only: slice navigation ── */}
        {viewType === 'interactive' && (
          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'Roboto Mono, monospace',
              }}
            >
              <span>Slice Selector (Axial)</span>
              <span style={{ color: '#46f1c5' }}>{interactiveSlice + 1} / {totalSlices}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setInteractiveSlice((p) => Math.max(p - 1, 0))}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', width: '26px', height: '26px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronLeft size={14} />
              </button>
              <input
                type="range"
                min={0}
                max={totalSlices - 1}
                value={interactiveSlice}
                onChange={(e) => setInteractiveSlice(parseInt(e.target.value))}
                style={{ flex: 1, accentColor: '#46f1c5', height: '4px', cursor: 'pointer' }}
              />
              <button
                onClick={() => setInteractiveSlice((p) => Math.min(p + 1, totalSlices - 1))}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', width: '26px', height: '26px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── All 3 static views thumbnail strip ── */}
        {viewType !== 'interactive' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {['axial', 'sagittal', 'coronal'].map((v) => {
              const vd = getViewImages(v);
              const isActive = v === viewType;
              return (
                <button
                  key={v}
                  onClick={() => setViewType(v)}
                  title={`Switch to ${v} view`}
                  style={{
                    flex: 1,
                    position: 'relative',
                    padding: 0,
                    border: isActive
                      ? '2px solid #46f1c5'
                      : '2px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: '#050508',
                    aspectRatio: '1',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {vd.mri && (
                    <img
                      src={vd.mri}
                      alt={`${v} mri`}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  )}
                  {vd.heatmap && (
                    <img
                      src={vd.heatmap}
                      alt={`${v} heatmap`}
                      style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%',
                        objectFit: 'contain', opacity, mixBlendMode: 'screen',
                        transition: 'opacity 0.05s linear',
                      }}
                    />
                  )}
                  {!vd.mri && !vd.heatmap && vd.overlay && (
                    <img
                      src={vd.overlay}
                      alt={`${v} overlay`}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0, left: 0, right: 0,
                      background: isActive ? 'rgba(70,241,197,0.25)' : 'rgba(0,0,0,0.55)',
                      fontSize: '9px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: isActive ? '#46f1c5' : 'rgba(255,255,255,0.6)',
                      textAlign: 'center',
                      padding: '3px 0',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {v}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT PANEL – AI metrics + explanations
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div
            className="glass-card"
            style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}
          >
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Confidence</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#46f1c5', marginTop: '4px' }}>{confidence}%</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Voxel activation confidence</div>
          </div>
          <div
            className="glass-card"
            style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}
          >
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tumor Volume</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginTop: '4px' }}>
              {volume} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>cm³</span>
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Volumetric 3D approximation</div>
          </div>
        </div>

        {/* Opacity hint card */}
        <div
          style={{
            background: 'rgba(70,241,197,0.03)',
            border: '1px solid rgba(70,241,197,0.12)',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.55)',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          }}
        >
          <Sliders size={15} style={{ color: '#46f1c5', flexShrink: 0, marginTop: '1px' }} />
          <span>
            <strong style={{ color: '#46f1c5' }}>Tip:</strong> Use the{' '}
            <em>Heatmap Overlay Opacity</em> slider to blend between pure MRI (0%) and full
            heatmap (100%). A value of <strong>60%</strong> gives the best clinical view — brain
            anatomy visible with tumor-attention zones highlighted in red/yellow.
          </span>
        </div>

        {/* Explanation tabs */}
        <div
          className="glass-card"
          style={{
            flex: 1,
            padding: '24px',
            background: 'rgba(15,15,25,0.7)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Tab selectors */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2px' }}>
            {[
              { id: 'clinical', icon: <FileText size={14} />, label: 'Clinical Report (MD)' },
              { id: 'patient',  icon: <Sparkles size={14} />, label: 'Patient Guide'        },
            ].map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveExplanation(id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeExplanation === id ? '2px solid #46f1c5' : '2px solid transparent',
                  color: activeExplanation === id ? '#46f1c5' : 'rgba(255,255,255,0.5)',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Explanation body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '220px',
              fontSize: '13px',
              lineHeight: '1.65',
              color: 'rgba(255,255,255,0.85)',
              paddingRight: '6px',
            }}
          >
            {activeExplanation === 'clinical' ? (
              <div>
                <p style={{ marginTop: 0 }}>{explanations.clinical}</p>
                <div
                  style={{
                    marginTop: '16px',
                    background: 'rgba(70,241,197,0.03)',
                    border: '1px dashed rgba(70,241,197,0.2)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'rgba(70,241,197,0.8)',
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <Activity size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    <strong>Clinician Note:</strong> The highlighted focus maps the neural target
                    coordinates used by the 3D U-Net model's deep feature representations. Adjust
                    the Heatmap Opacity slider to 60–70% for optimal anatomical context.
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ marginTop: 0 }}>{explanations.patient_friendly}</p>
                <div
                  style={{
                    marginTop: '16px',
                    background: 'rgba(245,158,11,0.03)',
                    border: '1px dashed rgba(245,158,11,0.2)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'rgba(245,158,11,0.8)',
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <Eye size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    <strong>Guide Tip:</strong> The red and yellow areas show exactly where the AI
                    looked closely. Use the opacity slider — drag it left to see the brain scan,
                    right to see the AI's attention map, or keep it at 60% to see both together.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
