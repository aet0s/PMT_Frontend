// client/src/components/shared/ImageCropModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Check } from 'lucide-react';

const STAGE_SIZE = 240; // 240px circle fits comfortably on all screens with zero scrollbar
const OUTPUT_SIZE = 512; // 512x512 crisp high-res export

export default function ImageCropModal({
  isOpen,
  onClose,
  imageFile,
  title = 'Crop & Fit Icon',
  description = 'Position and scale your image to fit inside the circle.',
  onConfirm,
  isProcessing = false
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [fitZoom, setFitZoom] = useState(1);
  const [fillZoom, setFillZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const imgRef = useRef(null);

  // Load image data from imageFile
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImageSrc(objectUrl);

    const img = new Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      const fit = STAGE_SIZE / Math.max(img.naturalWidth, img.naturalHeight);
      const fill = STAGE_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
      setFitZoom(fit);
      setFillZoom(fill);

      // Default to fit if rectangular, fill if square-ish
      const isSquareish =
        Math.abs(img.naturalWidth - img.naturalHeight) / Math.max(img.naturalWidth, img.naturalHeight) < 0.15;
      const initialZoom = isSquareish ? fill : fit * 0.92;
      setZoom(initialZoom);
      setOffset({ x: 0, y: 0 });
    };
    img.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  // Pointer drag handling for pan (supports both mouse and touch)
  const handlePointerDown = (e) => {
    if (e.button && e.button !== 0) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: dragStartRef.current.offsetX + dx,
      y: dragStartRef.current.offsetY + dy,
    });
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Mouse wheel zoom inside stage
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const minZ = fitZoom * 0.4;
    const maxZ = Math.max(fillZoom, fitZoom) * 4;
    setZoom((prev) => Math.min(Math.max(prev + delta * prev, minZ), maxZ));
  };

  // Presets
  const handleFit = () => {
    setZoom(fitZoom * 0.92);
    setOffset({ x: 0, y: 0 });
  };

  const handleFill = () => {
    setZoom(fillZoom);
    setOffset({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setZoom(fitZoom * 0.92);
    setOffset({ x: 0, y: 0 });
  };

  // Export cropped 512x512 image on canvas with clean white background
  const handleApply = useCallback(() => {
    if (!imageSrc || !imgRef.current) return;

    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fill with clean white background so transparent logos/images always have crisp contrast
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const scaleRatio = OUTPUT_SIZE / STAGE_SIZE;
    const renderedWidth = img.naturalWidth * zoom * scaleRatio;
    const renderedHeight = img.naturalHeight * zoom * scaleRatio;
    const drawX = (OUTPUT_SIZE - renderedWidth) / 2 + offset.x * scaleRatio;
    const drawY = (OUTPUT_SIZE - renderedHeight) / 2 + offset.y * scaleRatio;

    ctx.drawImage(img, drawX, drawY, renderedWidth, renderedHeight);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File(
          [blob],
          imageFile?.name ? imageFile.name.replace(/\.[^/.]+$/, '') + '.png' : 'icon.png',
          { type: 'image/png' }
        );
        onConfirm?.(croppedFile);
      },
      'image/png',
      0.95
    );
  }, [imageSrc, zoom, offset, imageFile, onConfirm]);

  const minZoomVal = fitZoom * 0.4 || 0.1;
  const maxZoomVal = Math.max(fillZoom, fitZoom) * 3 || 3;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? undefined : onClose}
      title={title}
      description={description}
      size="sm"
      bodyClassName="p-4 sm:p-5 overflow-hidden"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            leftIcon={<Check className="w-4 h-4" />}
            onClick={handleApply}
            disabled={isProcessing || !imageSrc}
            className="whitespace-nowrap px-5 font-bold"
          >
            {isProcessing ? 'Applying...' : 'Apply & Save'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 select-none flex flex-col items-center">
        {/* Main Stage: Pure Circle with White Background */}
        <div className="flex flex-col items-center">
          <div
            className={`relative overflow-hidden rounded-full bg-white border-2 border-border shadow-md ring-4 ring-primary/5 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{ width: STAGE_SIZE, height: STAGE_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            {/* Image positioned by offset & zoom */}
            {imageSrc && (
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                className="absolute pointer-events-none origin-center max-w-none transition-none"
                style={{
                  width: `${naturalSize.width * zoom}px`,
                  height: `${naturalSize.height * zoom}px`,
                  left: `${(STAGE_SIZE - naturalSize.width * zoom) / 2 + offset.x}px`,
                  top: `${(STAGE_SIZE - naturalSize.height * zoom) / 2 + offset.y}px`,
                }}
              />
            )}

            {/* Dashed circular boundary outline */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/40 pointer-events-none" />

            {/* Subtle center crosshair guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
              <div className="w-5 h-0.5 bg-text-primary" />
              <div className="w-0.5 h-5 bg-text-primary -ml-2.5" />
            </div>
          </div>

          <span className="text-[11px] text-text-muted mt-2 text-center">
            Drag to position • Scroll or slider to zoom
          </span>
        </div>

        {/* Compact Zoom Slider & Presets Toolbar */}
        <div className="w-full p-2.5 bg-surface-muted/50 border border-border/70 rounded-xl space-y-2">
          <div className="flex items-center gap-2.5 px-1">
            <ZoomOut className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <input
              type="range"
              min={minZoomVal}
              max={maxZoomVal}
              step={(maxZoomVal - minZoomVal) / 100}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <ZoomIn className="w-3.5 h-3.5 text-text-muted shrink-0" />
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 px-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleFit}
                className="px-2 py-0.5 rounded-lg bg-surface hover:bg-surface-muted border border-border/80 text-text-secondary hover:text-text-primary text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Minimize2 className="w-3 h-3 text-primary" />
                Fit inside
              </button>
              <button
                type="button"
                onClick={handleFill}
                className="px-2 py-0.5 rounded-lg bg-surface hover:bg-surface-muted border border-border/80 text-text-secondary hover:text-text-primary text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3 h-3 text-primary" />
                Fill circle
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="px-1.5 py-0.5 text-[11px] text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
