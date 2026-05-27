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
  AlertCircle 
} from 'lucide-react';

export default function ResultsViewer({ 
  extractedData = {}, 
  onHoverField 
}) {
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
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `extracted_data_${holder.name || 'document'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Helper to determine color schemes for confidence scores
  const getConfidenceLevel = (score) => {
    if (!score) return { color: 'text-zinc-400 bg-zinc-900 border-zinc-800', barColor: 'bg-zinc-700', label: 'N/A' };
    const num = parseFloat(score);
    if (num >= 90) return { color: 'text-emerald-400 bg-emerald-950/50 border-emerald-900', barColor: 'bg-emerald-500', label: 'High' };
    if (num >= 70) return { color: 'text-amber-400 bg-amber-950/50 border-amber-900', barColor: 'bg-amber-500', label: 'Moderate' };
    return { color: 'text-rose-400 bg-rose-950/50 border-rose-900', barColor: 'bg-rose-500', label: 'Review' };
  };

  const nameScore = (confidence.name !== undefined && confidence.name !== null) ? confidence.name : confidence['holder.name'];
  const degreeScore = (confidence.degree !== undefined && confidence.degree !== null) ? confidence.degree : confidence['credential.degree'];

  const nameConf = getConfidenceLevel(nameScore);
  const degreeConf = getConfidenceLevel(degreeScore);

  return (
    <div className="flex flex-col gap-6">
      {/* Action Header Card */}
      <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-md">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-lg text-zinc-100 flex items-center gap-2">
              <span>Extracted Structured Insights</span>
            </CardTitle>
            <CardDescription className="text-zinc-400 text-xs mt-1">
              Parsed via Gemini multimodal extraction & layout analysis.
            </CardDescription>
          </div>
          <Button 
            onClick={downloadJson} 
            size="sm" 
            className="bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download JSON
          </Button>
        </CardContent>
      </Card>

      {/* Row of Confidence Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name Confidence */}
        <Card className="bg-zinc-950 border-zinc-900">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 font-medium">Name Confidence Score</span>
              <Badge className={`px-2 py-0.5 text-[10px] border font-bold ${nameConf.color}`}>
                {nameScore !== undefined && nameScore !== null ? `${nameScore}%` : 'N/A'} - {nameConf.label}
              </Badge>
            </div>
            <Progress 
              value={nameScore || 0} 
              className="h-1.5 bg-zinc-850" 
              indicatorClassName={nameConf.barColor}
            />
          </CardContent>
        </Card>

        {/* Degree Confidence */}
        <Card className="bg-zinc-950 border-zinc-900">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 font-medium">Degree Confidence Score</span>
              <Badge className={`px-2 py-0.5 text-[10px] border font-bold ${degreeConf.color}`}>
                {degreeScore !== undefined && degreeScore !== null ? `${degreeScore}%` : 'N/A'} - {degreeConf.label}
              </Badge>
            </div>
            <Progress 
              value={degreeScore || 0} 
              className="h-1.5 bg-zinc-850" 
              indicatorClassName={degreeConf.barColor}
            />
          </CardContent>
        </Card>
      </div>

      {/* Data Cards (Holder, Credential, Issuer) */}
      <div className="flex flex-col gap-4">
        {/* Card 1: Holder Details */}
        <Card 
          className="bg-zinc-950 border-zinc-900 hover:border-zinc-800 transition duration-200"
          onMouseEnter={() => onHoverField(holder.name)}
          onMouseLeave={() => onHoverField(null)}
        >
          <CardHeader className="py-3 px-4 border-b border-zinc-900 flex flex-row items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-800/30 flex items-center justify-center text-purple-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-zinc-200">Candidate / Holder Identity</CardTitle>
              <CardDescription className="text-[10px] text-zinc-500">Extracted bio-data details</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-3">
            {/* Name */}
            <div className="flex items-center justify-between text-sm group">
              <span className="text-zinc-500 text-xs">Full Name</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-medium">{holder.name || 'Not Found'}</span>
                {holder.name && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => handleCopy('h_name', holder.name)}
                  >
                    {copiedField === 'h_name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Father's Name */}
            <div className="flex items-center justify-between text-sm group">
              <span className="text-zinc-500 text-xs">Father's Name</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-medium">{holder.fatherName || 'Not Found'}</span>
                {holder.fatherName && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => handleCopy('h_father', holder.fatherName)}
                  >
                    {copiedField === 'h_father' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            </div>

            {/* Date of Birth */}
            <div className="flex items-center justify-between text-sm group">
              <span className="text-zinc-500 text-xs">Date of Birth</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-medium">{holder.dob || 'Not Found'}</span>
                {holder.dob && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => handleCopy('h_dob', holder.dob)}
                  >
                    {copiedField === 'h_dob' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Credential Details */}
        <Card 
          className="bg-zinc-950 border-zinc-900 hover:border-zinc-800 transition duration-200"
          onMouseEnter={() => onHoverField(credential.degree)}
          onMouseLeave={() => onHoverField(null)}
        >
          <CardHeader className="py-3 px-4 border-b border-zinc-900 flex flex-row items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/30 flex items-center justify-center text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-zinc-200">Degree & Performance</CardTitle>
              <CardDescription className="text-[10px] text-zinc-500">Credential and grades details</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-3">
            {/* Degree */}
            <div className="flex items-center justify-between text-sm group">
              <span className="text-zinc-500 text-xs">Credential/Degree</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-medium">{credential.degree || 'Not Found'}</span>
                {credential.degree && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => handleCopy('c_degree', credential.degree)}
                  >
                    {copiedField === 'c_degree' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            </div>

            {/* Institution */}
            <div className="flex items-center justify-between text-sm group">
              <span className="text-zinc-500 text-xs">Awarding Institution</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-medium">{credential.institution || 'Not Found'}</span>
                {credential.institution && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => handleCopy('c_inst', credential.institution)}
                  >
                    {copiedField === 'c_inst' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            </div>

            {/* Year */}
            <div className="flex items-center justify-between text-sm group">
              <span className="text-zinc-500 text-xs">Graduation Year</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-medium">{credential.year || 'Not Found'}</span>
                {credential.year && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => handleCopy('c_year', credential.year)}
                  >
                    {copiedField === 'c_year' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            </div>

            {/* CGPA */}
            <div className="flex items-center justify-between text-sm group">
              <span className="text-zinc-500 text-xs">CGPA / Performance</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-medium">{credential.cgpa || 'Not Found'}</span>
                {credential.cgpa && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => handleCopy('c_cgpa', credential.cgpa)}
                  >
                    {copiedField === 'c_cgpa' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Issuer Details */}
        <Card 
          className="bg-zinc-950 border-zinc-900 hover:border-zinc-800 transition duration-200"
          onMouseEnter={() => onHoverField(issuer.name)}
          onMouseLeave={() => onHoverField(null)}
        >
          <CardHeader className="py-3 px-4 border-b border-zinc-900 flex flex-row items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-800/30 flex items-center justify-center text-amber-400">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-zinc-200">Awarding Authority</CardTitle>
              <CardDescription className="text-[10px] text-zinc-500">Issuer or Signatory information</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-3">
            {/* Issuer Name */}
            <div className="flex items-center justify-between text-sm group">
              <span className="text-zinc-500 text-xs">Authority Name</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-medium">{issuer.name || 'Not Found'}</span>
                {issuer.name && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => handleCopy('i_name', issuer.name)}
                  >
                    {copiedField === 'i_name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Raw Text Accordion/Scrollarea */}
      {rawText && (
        <Card className="bg-zinc-950 border-zinc-900">
          <CardHeader className="py-3 px-4 border-b border-zinc-900 flex flex-row items-center gap-2 text-zinc-300">
            <FileText className="w-4 h-4 text-zinc-400" />
            <CardTitle className="text-xs font-bold">Original OCR Raw Text Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-32 text-[10px] font-mono leading-relaxed p-3 text-zinc-500 whitespace-pre-wrap select-text">
              {rawText}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
