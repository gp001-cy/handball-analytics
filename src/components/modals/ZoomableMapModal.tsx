import React, { useEffect, useRef, useState } from 'react';

export interface ZoomableMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const ZoomableMapModal: React.FC<ZoomableMapModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const startPanRef = useRef<{
    startX: number;
    startY: number;
    initPanX: number;
    initPanY: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initPanX: 0,
    initPanY: 0,
    hasMoved: false,
  });

  // Reset zoom & pan when opening
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () =>
    setZoom((z) => Math.min(3.0, Number((z + 0.3).toFixed(1))));
  const handleZoomOut = () =>
    setZoom((z) => Math.max(0.7, Number((z - 0.3).toFixed(1))));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setIsPanning(true);
    startPanRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPanX: pan.x,
      initPanY: pan.y,
      hasMoved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning || zoom <= 1) return;
    const dx = e.clientX - startPanRef.current.startX;
    const dy = e.clientY - startPanRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      startPanRef.current.hasMoved = true;
    }
    setPan({
      x: startPanRef.current.initPanX + dx,
      y: startPanRef.current.initPanY + dy,
    });
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 12, 0.95)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Sticky Header with Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-strong)',
          gap: '10px',
          flexWrap: 'wrap',
          zIndex: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: 'var(--text-primary)',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Zoom In/Out & Reset toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            style={{
              minWidth: '38px',
              minHeight: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            －
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            title="Reset Zoom"
            className="tabular-nums"
            style={{
              minHeight: '38px',
              padding: '0 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              color: 'var(--accent-primary)',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {Math.round(zoom * 100)}% ↺
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            style={{
              minWidth: '38px',
              minHeight: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            ＋
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close Fullscreen"
            style={{
              minWidth: '38px',
              minHeight: '38px',
              marginLeft: '6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--sem-fault-bg)',
              border: '1.5px solid var(--sem-fault)',
              color: 'var(--sem-fault)',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Interactive Zoomable Canvas Area */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          flex: 1,
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
          touchAction: zoom > 1 ? 'none' : 'auto',
        }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 180ms ease-out',
            width: '94%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>

        {/* Pan / Zoom helper badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 14px',
            borderRadius: '999px',
            background: 'rgba(0, 0, 0, 0.75)',
            border: '1px solid var(--border-subtle)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            pointerEvents: 'none',
          }}
        >
          {zoom > 1
            ? 'Drag to pan · Tap + / - to zoom'
            : 'Tap ＋ to zoom in · Tap map to select'}
        </div>
      </div>
    </div>
  );
};
