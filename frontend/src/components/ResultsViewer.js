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
  FileText
} from 'lucide-react';

export default function ResultsViewer({ extractedData = {}, onHoverField }) {
  const [copiedField, setCopiedField] = useState(null);

  const {
    holder = {},
    credential = {},
    issuer = {},
    confidence = {},
    rawText = ""
  } = extractedData;

  const handleCopy = (fieldId, val) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const downloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(extractedData, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `extracted_data_${holder.name || 'document'}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const getConfidenceMeta = (score) => {
    if (!score) return { badge: "bg-muted text-muted-foreground border-border", label: "N/A" };
    const num = parseFloat(score);
    if (num >= 90) return { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "High" };
    if (num >= 70) return { badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Moderate" };
    return { badge: "bg-red-50 text-red-700 border-red-200", label: "Review" };
  };

  const nameMeta = getConfidenceMeta(confidence.name);
  const degreeMeta = getConfidenceMeta(confidence.degree);

  const CopyBtn = ({ fieldId, value }) => {
    if (!value) return null;
    return (
      <Button
        variant="ghost"
        size="icon"
        className="w-6 h-6 text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition"
        onClick={() => handleCopy(fieldId, value)}
      >
        {copiedField === fieldId
          ? <Check className="w-3.5 h-3.5 text-emerald-600" />
          : <Copy className="w-3.5 h-3.5" />
        }
      </Button>
    );
  };

  const FieldRow = ({ label, value, fieldId }) => (
    <div className="flex items-center justify-between gap-3 text-sm group">
      <span className="text-muted-foreground text-xs shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-foreground font-medium truncate text-right"
          title={value || ''}
        >
          {value || 'Not Found'}
        </span>
        <CopyBtn fieldId={fieldId} value={value} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">

      {/* Action Header */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-lg text-foreground">
              Extracted Structured Insights
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs mt-1">
              Parsed via Gemini multimodal extraction &amp; layout analysis.
            </CardDescription>
          </div>
          <Button
            onClick={downloadJson}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download JSON
          </Button>
        </CardContent>
      </Card>

      {/* Confidence Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium whitespace-nowrap">Name Confidence</span>
              <Badge className={`px-2 py-0.5 text-[10px] border font-bold shrink-0 ${nameMeta.badge}`}>
                {confidence.name ? `${confidence.name}%` : 'N/A'} — {nameMeta.label}
              </Badge>
            </div>
            <Progress value={confidence.name || 0} className="h-1.5" />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium whitespace-nowrap">Degree Confidence</span>
              <Badge className={`px-2 py-0.5 text-[10px] border font-bold shrink-0 ${degreeMeta.badge}`}>
                {confidence.degree ? `${confidence.degree}%` : 'N/A'} — {degreeMeta.label}
              </Badge>
            </div>
            <Progress value={confidence.degree || 0} className="h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Data Cards */}
      <div className="flex flex-col gap-4">

        {/* Holder */}
        <Card
          className="bg-card border-border hover:border-primary/20 transition duration-200"
          onMouseEnter={() => onHoverField(holder.name)}
          onMouseLeave={() => onHoverField(null)}
        >
          <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <User className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Candidate / Holder Identity</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground">Extracted bio-data details</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-3">
            <FieldRow label="Full Name"     value={holder.name}       fieldId="h_name"   />
            <FieldRow label="Father's Name" value={holder.fatherName} fieldId="h_father" />
            <FieldRow label="Date of Birth" value={holder.dob}        fieldId="h_dob"    />
          </CardContent>
        </Card>

        {/* Credential */}
        <Card
          className="bg-card border-border hover:border-primary/20 transition duration-200"
          onMouseEnter={() => onHoverField(credential.degree)}
          onMouseLeave={() => onHoverField(null)}
        >
          <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Degree &amp; Performance</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground">Credential and grades details</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-3">
            <FieldRow label="Credential/Degree"    value={credential.degree}      fieldId="c_degree" />
            <FieldRow label="Awarding Institution" value={credential.institution} fieldId="c_inst"   />
            <FieldRow label="Graduation Year"      value={credential.year}        fieldId="c_year"   />
            <FieldRow label="CGPA / Performance"   value={credential.cgpa}        fieldId="c_cgpa"   />
          </CardContent>
        </Card>

        {/* Issuer */}
        <Card
          className="bg-card border-border hover:border-primary/20 transition duration-200"
          onMouseEnter={() => onHoverField(issuer.name)}
          onMouseLeave={() => onHoverField(null)}
        >
          <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Awarding Authority</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground">Issuer or Signatory information</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-3">
            <FieldRow label="Authority Name" value={issuer.name} fieldId="i_name" />
          </CardContent>
        </Card>

      </div>

      {/* Raw OCR Text */}
      {rawText && (
        <Card className="bg-card border-border">
          <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-xs font-bold text-foreground">Original OCR Raw Text Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-32 text-[10px] font-mono leading-relaxed p-3 text-muted-foreground whitespace-pre-wrap select-text">
              {rawText}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
