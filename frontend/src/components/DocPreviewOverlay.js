"use client";

import React, { useState, useRef, useEffect } from 'react';

export default function DocPreviewOverlay({
  fileUrl,
  fileType,
  layoutData = [],
  activeFieldText = null,
}) {
  const [dimensions, setDimensions] = useState({
    naturalWidth: 0,
    naturalHeight: 0,
    renderedWidth: 0,
    renderedHeight: 0,
  });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hoveredBox, setHoveredBox] = useState(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  /* Reset skeleton when URL changes (new document selected) */
  useEffect(() => {
    setImageLoaded(false);
    setDimensions({ naturalWidth: 0, naturalHeight: 0, renderedWidth: 0, renderedHeight: 0 });
  }, [fileUrl]);

  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current?.complete) {
        const { naturalWidth, naturalHeight, width, height } = imageRef.current;
        setDimensions({ naturalWidth, naturalHeight, renderedWidth: width, renderedHeight: height });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight, width, height } = e.target;
    setDimensions({ naturalWidth, naturalHeight, renderedWidth: width, renderedHeight: height });
    setImageLoaded(true);
  };

  const isPDF = fileType?.toLowerCase() === '.pdf' || fileType?.toLowerCase() === 'pdf';

  const getScaledBoxStyle = (boxCoords) => {
    if (!dimensions.naturalWidth || !dimensions.naturalHeight) return { display: 'none' };

    const xCoords = boxCoords.map((pt) => pt[0]);
    const yCoords = boxCoords.map((pt) => pt[1]);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    const scaleX = dimensions.renderedWidth / dimensions.naturalWidth;
    const scaleY = dimensions.renderedHeight / dimensions.naturalHeight;

    return {
      position: 'absolute',
      left: `${minX * scaleX}px`,
      top: `${minY * scaleY}px`,
      width: `${(maxX - minX) * scaleX}px`,
      height: `${(maxY - minY) * scaleY}px`,
    };
  };

  const isBoxHighlighted = (boxText) => {
    if (!activeFieldText) return false;
    const cleanBox = boxText.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanActive = activeFieldText.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanBox.includes(cleanActive) || cleanActive.includes(cleanBox);
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-xl border border-border overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
          <h3 className="text-sm font-semibold text-foreground truncate">Document Preview</h3>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground
                        bg-background px-2 py-1 rounded-md border border-border shrink-0">
          <span className="whitespace-nowrap">Responsive Fit</span>
        </div>
      </div>

      {/* ── Preview area ── */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto p-4 flex items-start justify-center bg-muted/10"
      >
        {isPDF ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center">
            <object
              data={fileUrl}
              type="application/pdf"
              className="w-full h-full rounded-lg border border-border"
            >
              <div className="flex flex-col items-center justify-center p-8 bg-card rounded-xl border border-border max-w-sm">
                <p className="text-sm text-muted-foreground mb-4">
                  Your browser does not support inline PDF previews.
                </p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition"
                >
                  Open PDF in New Tab
                </a>
              </div>
            </object>
          </div>
        ) : (
          <div className="relative inline-block select-none shadow-sm rounded-lg overflow-hidden border border-border">

            {/* Skeleton shown while image loads */}
            {!imageLoaded && (
              <div className="min-w-[280px] min-h-[380px] bg-muted/60 animate-pulse rounded-lg flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted-foreground/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-2 w-24 bg-muted-foreground/15 rounded-full" />
                  <div className="h-1.5 w-16 bg-muted-foreground/10 rounded-full" />
                </div>
              </div>
            )}

            {/* Base image — hidden until loaded */}
            <img
              ref={imageRef}
              src={fileUrl}
              alt="Uploaded document scan"
              onLoad={handleImageLoad}
              draggable="false"
              className={`block object-contain transition-opacity duration-500 ${
                imageLoaded ? 'opacity-100' : 'opacity-0 absolute top-0 left-0'
              }`}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 140px)',
                width: 'auto',
                height: 'auto',
              }}
            />

            {/* OCR bounding-box overlays */}
            {imageLoaded && dimensions.naturalWidth > 0 &&
              layoutData.map((elem, idx) => {
                const active = isBoxHighlighted(elem.text);
                return (
                  <div
                    key={idx}
                    style={getScaledBoxStyle(elem.box)}
                    className={`
                      group cursor-pointer rounded-sm transition-all duration-200
                      ${active
                        ? 'border border-primary bg-primary/15 shadow-md z-20 scale-[1.02]'
                        : 'border border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5 z-10'
                      }
                    `}
                    onMouseEnter={() => setHoveredBox(elem)}
                    onMouseLeave={() => setHoveredBox(null)}
                  >
                    {active && (
                      <>
                        <span className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-primary rounded-full" />
                        <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full" />
                      </>
                    )}
                  </div>
                );
              })
            }

            {/* Hover tooltip */}
            {hoveredBox && (
              <div
                className="absolute bg-popover text-popover-foreground border border-border rounded-lg
                           p-2.5 shadow-md text-xs max-w-xs z-30 select-text
                           animate-in fade-in zoom-in-95 duration-100"
                style={{
                  left: `${Math.min(
                    dimensions.renderedWidth - 180,
                    Math.max(10,
                      (hoveredBox.box[0][0] + hoveredBox.box[1][0]) / 2 *
                      (dimensions.renderedWidth / dimensions.naturalWidth) - 90
                    )
                  )}px`,
                  top: `${Math.max(
                    10,
                    hoveredBox.box[0][1] *
                    (dimensions.renderedHeight / dimensions.naturalHeight) - 45
                  )}px`,
                }}
              >
                <div className="font-semibold text-primary flex items-center justify-between gap-2 mb-1">
                  <span>OCR Block</span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded border border-border">
                    {hoveredBox.confidence}%
                  </span>
                </div>
                <p className="text-foreground leading-normal line-clamp-3">"{hoveredBox.text}"</p>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
