"use client";

import React, { useState } from 'react';

export default function DocPreviewOverlay({ fileUrl, fileType }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const isPDF = fileType?.toLowerCase() === '.pdf' || fileType?.toLowerCase() === 'pdf';

  return (
    <div className="flex flex-col h-full bg-background rounded-xl border border-border overflow-hidden">

      {/* Header */}
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

      {/* Preview area */}
      <div className="relative flex-1 overflow-auto p-4 flex items-start justify-center bg-muted/10">
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

            <img
              src={fileUrl}
              alt="Uploaded document"
              onLoad={() => setImageLoaded(true)}
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
          </div>
        )}
      </div>
    </div>
  );
}
