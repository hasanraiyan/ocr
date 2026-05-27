"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';

export default function DocPreviewOverlay({ 
  fileUrl, 
  fileType, 
  layoutData = [], 
  activeFieldText = null 
}) {
  const [dimensions, setDimensions] = useState({
    naturalWidth: 0,
    naturalHeight: 0,
    renderedWidth: 0,
    renderedHeight: 0,
  });

  const [hoveredBox, setHoveredBox] = useState(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Re-calculate dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current && imageRef.current.complete) {
        const { naturalWidth, naturalHeight, width, height } = imageRef.current;
        setDimensions({
          naturalWidth,
          naturalHeight,
          renderedWidth: width,
          renderedHeight: height,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight, width, height } = e.target;
    setDimensions({
      naturalWidth,
      naturalHeight,
      renderedWidth: width,
      renderedHeight: height,
    });
  };

  const isPDF = fileType?.toLowerCase() === '.pdf';

  // Helper to scale layout coordinates to current rendered size
  const getScaledBoxStyle = (boxCoords) => {
    if (!dimensions.naturalWidth || !dimensions.naturalHeight) return { display: 'none' };

    // Extract corners: [[tl_x, tl_y], [tr_x, tr_y], [br_x, br_y], [bl_x, bl_y]]
    const xCoords = boxCoords.map(pt => pt[0]);
    const yCoords = boxCoords.map(pt => pt[1]);

    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    const scaleX = dimensions.renderedWidth / dimensions.naturalWidth;
    const scaleY = dimensions.renderedHeight / dimensions.naturalHeight;

    const left = minX * scaleX;
    const top = minY * scaleY;
    const width = (maxX - minX) * scaleX;
    const height = (maxY - minY) * scaleY;

    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  // Check if a box text matches the active text highlighted from extracted cards
  const isBoxHighlighted = (boxText) => {
    if (!activeFieldText) return false;
    const cleanBox = boxText.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanActive = activeFieldText.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanBox.includes(cleanActive) || cleanActive.includes(cleanBox);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
          <h3 className="text-sm font-semibold text-zinc-200">Document Visual Preview</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800">
          <span>Scale Mode: Responsive Fit</span>
        </div>
      </div>

      {/* Main Preview Workarea */}
      <div 
        ref={containerRef}
        className="relative flex-1 overflow-auto p-4 flex items-center justify-center min-h-[450px]"
      >
        {isPDF ? (
          <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center text-center">
            {/* Embed PDF. Note: highlighted layout overlays are designed primarily for images, 
                for PDF we can render the fallback standard browser embed */}
            <object
              data={fileUrl}
              type="application/pdf"
              className="w-full h-full min-h-[500px] rounded-lg border border-zinc-800"
            >
              <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-xl border border-zinc-800 max-w-sm">
                <p className="text-sm text-zinc-400 mb-4">
                  Your browser does not support inline PDF previews.
                </p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition"
                >
                  Open PDF in New Tab
                </a>
              </div>
            </object>
          </div>
        ) : (
          <div className="relative inline-block select-none shadow-2xl rounded-lg overflow-hidden border border-zinc-800">
            {/* Base Image */}
            <img
              ref={imageRef}
              src={fileUrl}
              alt="Uploaded document scan"
              onLoad={handleImageLoad}
              className="max-w-full max-h-[600px] object-contain block"
              draggable="false"
            />

            {/* Layout overlays (Transparent coordinate divs) */}
            {dimensions.naturalWidth > 0 && layoutData.map((elem, idx) => {
              const active = isBoxHighlighted(elem.text);
              return (
                <div
                  key={idx}
                  style={getScaledBoxStyle(elem.box)}
                  className={`
                    group cursor-pointer rounded-sm transition-all duration-200
                    ${active 
                      ? 'border border-purple-400 bg-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.6)] z-20 scale-[1.02]' 
                      : 'border border-dashed border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/10 z-10'
                    }
                  `}
                  onMouseEnter={() => setHoveredBox(elem)}
                  onMouseLeave={() => setHoveredBox(null)}
                >
                  {/* Glowing corners for active fields */}
                  {active && (
                    <>
                      <span className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-purple-300 rounded-full"></span>
                      <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-purple-300 rounded-full"></span>
                    </>
                  )}
                </div>
              );
            })}

            {/* Hover Tooltip Overlay */}
            {hoveredBox && (
              <div 
                className="absolute bg-zinc-900/95 text-white border border-zinc-800 rounded-lg p-2.5 shadow-xl text-xs max-w-xs z-30 select-text animate-in fade-in zoom-in-95 duration-100"
                style={{
                  left: `${Math.min(
                    dimensions.renderedWidth - 180,
                    Math.max(10, (hoveredBox.box[0][0] + hoveredBox.box[1][0]) / 2 * (dimensions.renderedWidth / dimensions.naturalWidth) - 90)
                  )}px`,
                  top: `${Math.max(
                    10,
                    hoveredBox.box[0][1] * (dimensions.renderedHeight / dimensions.naturalHeight) - 45
                  )}px`
                }}
              >
                <div className="font-semibold text-emerald-400 flex items-center justify-between gap-2 mb-1">
                  <span>OCR Detected Block</span>
                  <span className="text-[10px] text-zinc-400 bg-zinc-950 px-1 py-0.5 rounded border border-zinc-800">
                    Conf: {hoveredBox.confidence}%
                  </span>
                </div>
                <p className="text-zinc-200 leading-normal line-clamp-2">"{hoveredBox.text}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
