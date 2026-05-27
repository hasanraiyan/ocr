"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Award,
  Building,
  Download,
  Copy,
  Check,
  FileText,
  ChevronDown,
} from 'lucide-react';

export default function ResultsViewer({ extractedData = {}, onHoverField }) {
  const [copiedField, setCopiedField] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  const {
    holder = {},
    credential = {},
    issuer = {},
    confidence = {},
    rawText = '',
  } = extractedData;

  const handleCopy = (fieldId, val) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const downloadJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(extractedData, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `extracted_data_${holder.name || 'document'}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const getConfidenceMeta = (score) => {
    if (!score) return { badge: 'bg-muted text-muted-foreground border-border', label: 'N/A', bar: 'bg-muted-foreground/30' };
    const num = parseFloat(score);
    if (num >= 90) return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'High', bar: 'bg-emerald-500' };
    if (num >= 70) return { badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Med', bar: 'bg-amber-500' };
    return { badge: 'bg-red-50 text-red-700 border-red-200', label: 'Low', bar: 'bg-red-500' };
  };

  const nameMeta = getConfidenceMeta(confidence.name);
  const degreeMeta = getConfidenceMeta(confidence.degree);

  /* ── Copy button: always visible on touch, hover-only on desktop ── */
  const CopyBtn = ({ fieldId, value }) => {
    if (!value) return null;
    return (
      <Button
        variant="ghost"
        size="icon"
        className="w-6 h-6 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent transition
                   opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        onClick={(e) => { e.stopPropagation(); handleCopy(fieldId, value); }}
      >
        {copiedField === fieldId
          ? <Check className="w-3.5 h-3.5 text-emerald-600" />
          : <Copy className="w-3.5 h-3.5" />}
      </Button>
    );
  };

  /* ── Field row: stacked on mobile, side-by-side on sm+
        Hover passes its specific value to DocPreviewOverlay highlight ── */
  const FieldRow = ({ label, value, fieldId }) => (
    <div
      className="flex flex-col gap-0.5 group rounded-md px-1.5 -mx-1.5 py-1 transition-colors
                 hover:bg-accent/50 cursor-default
                 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
      onMouseEnter={() => value && onHoverField?.(value)}
      onMouseLeave={() => onHoverField?.(null)}
    >
      <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="text-foreground font-medium text-xs break-words min-w-0 flex-1 sm:truncate sm:text-right"
          title={value || ''}
        >
          {value || (
            <span className="text-muted-foreground/50 italic font-normal">Not found</span>
          )}
        </span>
        <CopyBtn fieldId={fieldId} value={value} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">

      {/* ── Action header ── */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-bold text-foreground leading-tight">
              Extracted Insights
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs mt-0.5">
              Gemini multimodal extraction &amp; layout analysis
            </CardDescription>
          </div>
          <Button
            onClick={downloadJson}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold
                       flex items-center gap-2 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </Button>
        </CardContent>
      </Card>

      {/* ── Confidence cards ── */}
      <div className="grid grid-cols-2 gap-3">

        {[
          { label: 'Name', score: confidence.name, meta: nameMeta },
          { label: 'Degree', score: confidence.degree, meta: degreeMeta },
        ].map(({ label, score, meta }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide leading-tight">
                  {label} Conf.
                </span>
                <Badge className={`px-1.5 py-0.5 text-[10px] border font-bold leading-none shrink-0 ${meta.badge}`}>
                  {score ? `${score}%` : '—'}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${meta.bar}`}
                    style={{ width: `${score || 0}%` }}
                  />
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wide shrink-0 ${
                  meta.label === 'High' ? 'text-emerald-600'
                  : meta.label === 'Med' ? 'text-amber-600'
                  : meta.label === 'Low' ? 'text-red-600'
                  : 'text-muted-foreground'
                }`}>
                  {meta.label}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}

      </div>

      {/* ── Data cards ── */}
      <div className="flex flex-col gap-3">

        {/* Holder */}
        <Card className="bg-card border-border hover:border-primary/30 transition-colors duration-200">
          <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold text-foreground">Candidate / Holder</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground">Bio-data details</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-1">
            <FieldRow label="Full Name"     value={holder.name}       fieldId="h_name"   />
            <FieldRow label="Father's Name" value={holder.fatherName} fieldId="h_father" />
            <FieldRow label="Date of Birth" value={holder.dob}        fieldId="h_dob"    />
          </CardContent>
        </Card>

        {/* Credential */}
        <Card className="bg-card border-border hover:border-emerald-300/50 transition-colors duration-200">
          <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold text-foreground">Degree &amp; Performance</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground">Credential and grades</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-1">
            <FieldRow label="Degree / Credential"  value={credential.degree}      fieldId="c_degree" />
            <FieldRow label="Awarding Institution"  value={credential.institution} fieldId="c_inst"   />
            <FieldRow label="Graduation Year"       value={credential.year}        fieldId="c_year"   />
            <FieldRow label="CGPA / Performance"    value={credential.cgpa}        fieldId="c_cgpa"   />
          </CardContent>
        </Card>

        {/* Issuer */}
        <Card className="bg-card border-border hover:border-amber-300/50 transition-colors duration-200">
          <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Building className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold text-foreground">Awarding Authority</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground">Issuer or Signatory</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <FieldRow label="Authority Name" value={issuer.name} fieldId="i_name" />
          </CardContent>
        </Card>

      </div>

      {/* ── Raw OCR text — collapsible ── */}
      {rawText && (
        <Card className="bg-card border-border overflow-hidden">
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between gap-3
                       hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-bold text-foreground">OCR Raw Text</span>
              <span className="text-[10px] text-muted-foreground bg-muted border border-border
                               px-1.5 py-0.5 rounded font-mono shrink-0">
                {rawText.length} chars
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200
                          ${showRaw ? 'rotate-180' : ''}`}
            />
          </button>
          {showRaw && (
            <div className="border-t border-border">
              <ScrollArea className="h-36 text-[10px] font-mono leading-relaxed p-3 text-muted-foreground whitespace-pre-wrap select-text">
                {rawText}
              </ScrollArea>
            </div>
          )}
        </Card>
      )}

    </div>
  );
}
