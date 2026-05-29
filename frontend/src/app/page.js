"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import {
  UploadCloud, History, Sparkles, FileText,
  AlertTriangle, Loader2, CheckCircle2, Plus,
  ChevronRight, RefreshCw, Database, ArrowUpRight,
  Menu, Cpu
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { useIsMobile } from '@/hooks/use-mobile';
import { uploadDocument, getDocumentResult, listDocuments, API_BASE_URL } from '@/lib/api';
import DocPreviewOverlay from '@/components/DocPreviewOverlay';
import ResultsViewer from '@/components/ResultsViewer';

export default function Dashboard() {
  const isMobile = useIsMobile();

  const [history, setHistory] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const fileInputRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    fetchHistory();
    return () => stopPolling();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await listDocuments();
      setHistory(data);
    } catch {
      toast.error("Failed to load historical items");
    }
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startPolling = (docId) => {
    stopPolling();
    setPollingStatus("PENDING");
    pollIntervalRef.current = setInterval(async () => {
      try {
        const docResult = await getDocumentResult(docId);
        setActiveDoc(docResult);
        setPollingStatus(docResult.status);
        setHistory(prev => prev.map(item => item.id === docId ? docResult : item));
        if (docResult.status === "COMPLETED") {
          stopPolling(); toast.success("Extraction complete!"); fetchHistory();
        } else if (docResult.status === "FAILED") {
          stopPolling(); toast.error(docResult.error_message || "Processing failed"); fetchHistory();
        }
      } catch {
        stopPolling(); toast.error("Status check failed");
      }
    }, 1500);
  };

  const handleSelectDoc = (doc) => {
    stopPolling();
    setSelectedDocId(doc.id);
    setActiveDoc(doc);
    setPollingStatus(doc.status);
    setMobileSidebarOpen(false);
    if (doc.status !== "COMPLETED" && doc.status !== "FAILED") startPolling(doc.id);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    const tid = toast.loading("Uploading document...");
    try {
      const response = await uploadDocument(file);
      setIsUploading(false);
      toast.dismiss(tid);
      toast.success("Uploaded! Background task started.");
      const newJob = { id: response.documentId, filename: response.filename, status: response.status, created_at: new Date().toISOString(), file_path: "" };
      setHistory(prev => [newJob, ...prev]);
      setSelectedDocId(response.documentId);
      setActiveDoc(newJob);
      startPolling(response.documentId);
    } catch (err) {
      setIsUploading(false); toast.dismiss(tid); toast.error(err.message || "Upload failed");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  /* ── Helpers ── */
  const getStatusBadge = (status) => {
    const map = {
      COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      FAILED:    "bg-red-50 text-red-700 border-red-200",
      PENDING:   "bg-muted text-muted-foreground border-border animate-pulse",
    };
    const label = { COMPLETED: "READY", FAILED: "FAILED", PENDING: "QUEUED" };
    const cls = map[status] || "bg-primary/10 text-primary border-primary/20 animate-pulse";
    return <Badge className={`font-bold px-2.5 py-0.5 text-[10px] border ${cls}`}>{label[status] || status}</Badge>;
  };

  const stepPriority = { PENDING:0, VALIDATING:1, CONVERTING:2, AI_EXTRACTION:3, COMPLETED:4 };
  const getStepStyle = (stepStatus, curStatus) => {
    const cur = stepPriority[curStatus] || 0, step = stepPriority[stepStatus];
    if (curStatus === "FAILED") return { c:"border-red-200 bg-red-50/50", d:"bg-red-500", t:"text-red-600" };
    if (cur > step) return { c:"border-emerald-200 bg-emerald-50/50", d:"bg-emerald-500", t:"text-emerald-700" };
    if (cur === step) return { c:"border-primary/30 bg-primary/5 animate-pulse", d:"bg-primary animate-ping", t:"text-primary font-medium" };
    return { c:"border-border bg-muted/30", d:"bg-muted-foreground/30", t:"text-muted-foreground" };
  };

  const getStaticFileUrl = (fp) => {
    if (!fp) return "";
    if (fp.startsWith("http://") || fp.startsWith("https://")) return fp;
    return `${API_BASE_URL.replace("/api","")}/uploads/${fp.replace(/^.*[\\\/]/,'')}`;
  };
  const getExt = (fn) => fn ? fn.slice(((fn.lastIndexOf(".")-1)>>>0)+2) : "";

  const STEPS = [
    { step:"PENDING",       label:"1. Document Upload Completed",               done: true },
    { step:"CONVERTING",    label:"2. Preparing Document Images" },
    { step:"AI_EXTRACTION", label:"3. AI Visual Extraction (Google Gemini)" },
  ];

  /* ── Sidebar body (reused in <aside> and Sheet) ── */
  const SidebarBody = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-wide text-foreground">DocuSense AI</h1>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Database className="w-3 h-3 text-primary shrink-0" /><span>Supabase Live</span>
            </p>
          </div>
        </div>
        <Button size="icon" variant="ghost"
          onClick={() => { stopPolling(); setSelectedDocId(null); setActiveDoc(null); setPollingStatus(null); setMobileSidebarOpen(false); }}
          className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* History label */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between text-xs text-muted-foreground shrink-0">
        <span className="font-semibold flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Processing History</span>
        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border font-mono">{history.length} Jobs</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
        <div className="p-3 flex flex-col gap-1.5">
          {history.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />No documents yet
            </div>
          ) : history.map((item) => {
            const isActive = item.id === selectedDocId;
            return (
              <div key={item.id} onClick={() => handleSelectDoc(item)}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 flex flex-col gap-2 ${
                  isActive ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-border hover:border-primary/20 bg-card hover:bg-accent/40'
                }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0 border border-border">
                    {getExt(item.filename).toUpperCase() || 'FILE'}
                  </span>
                  <h4 className="text-xs font-semibold text-foreground truncate flex-1 min-w-0">{item.filename}</h4>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform ${isActive ? 'rotate-90 text-primary' : ''}`} />
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground min-w-0">
                  <span className="truncate">{new Date(item.created_at).toLocaleDateString()}</span>
                  <span className="shrink-0">{getStatusBadge(item.status)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-background flex items-center justify-between text-xs text-muted-foreground shrink-0">
        <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" />Pipeline Status</span>
        <Button variant="ghost" size="icon" onClick={fetchHistory}
          className="w-6 h-6 hover:bg-accent text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      <Toaster theme="light" position="top-right" richColors />

      {/* ── DESKTOP SIDEBAR ── */}
      {!isMobile && (
        <aside className="w-80 border-r border-border bg-card flex-col h-full shrink-0 overflow-hidden flex">
          <SidebarBody />
        </aside>
      )}

      {/* ── MOBILE SIDEBAR (Sheet drawer) ── */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80 max-w-[85vw]" showCloseButton={false}>
          <SheetHeader className="sr-only"><SheetTitle>Document History</SheetTitle></SheetHeader>
          <SidebarBody />
        </SheetContent>
      </Sheet>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col h-full bg-background overflow-hidden min-w-0">

        {/* Mobile top bar */}
        {isMobile && (
          <div className="h-14 px-4 border-b border-border flex items-center gap-3 bg-background shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(true)}
              className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-accent shrink-0">
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm text-foreground truncate">DocuSense AI</span>
            </div>
            {pollingStatus && <div className="shrink-0">{getStatusBadge(pollingStatus)}</div>}
          </div>
        )}

        {/* Desktop top navbar */}
        {!isMobile && (
          <header className="h-16 border-b border-border bg-background flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="font-bold text-sm text-foreground whitespace-nowrap">Intelligent Document Extraction</h2>
              {selectedDocId && (
                <>
                  <span className="text-muted-foreground shrink-0">/</span>
                  <span className="text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded select-all font-mono truncate max-w-[260px]">
                    {selectedDocId}
                  </span>
                </>
              )}
            </div>
            <a href={`${API_BASE_URL.replace("/api","")}/docs`} target="_blank" rel="noreferrer"
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1 border border-border px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-accent">
              <span>Swagger API Docs</span><ArrowUpRight className="w-3 h-3" />
            </a>
          </header>
        )}

        {/* ── WORKSPACE ── */}
        <div className="flex-1 overflow-hidden">

          {/* A. WELCOME */}
          {!selectedDocId && (
            <div className="w-full h-full flex flex-col items-center justify-center px-4 py-6 overflow-y-auto">
              <div className="max-w-xl w-full flex flex-col gap-6">
                <div className="text-center flex flex-col gap-2 max-w-sm mx-auto">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />Welcome to DocuSense
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload identity cards, degrees, or academic credentials. Gemini reads the document visually and extracts structured data — no OCR middleware needed.
                  </p>
                </div>

                {/* Upload zone */}
                <div onDragOver={(e)=>{e.preventDefault();setIsDragOver(true)}} onDragLeave={()=>setIsDragOver(false)} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl px-6 py-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 select-none ${
                    isDragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/40 bg-muted/30 hover:bg-muted/50'
                  }`}>
                  <input type="file" ref={fileInputRef} onChange={(e)=>e.target.files&&handleFileUpload(e.target.files[0])} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-9 h-9 text-primary animate-spin" />
                      <p className="text-sm font-semibold text-foreground">Uploading document...</p>
                      <p className="text-xs text-muted-foreground">Saving securely...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center">
                        <UploadCloud className="w-6 h-6 text-primary animate-bounce" style={{animationDuration:'3s'}} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-foreground">Drag & Drop document here</p>
                        <p className="text-xs text-muted-foreground">or <span className="text-primary font-medium">browse local files</span></p>
                      </div>
                      <Badge className="bg-muted border border-border px-2.5 py-1 text-[10px] text-muted-foreground">PDF · PNG · JPG · JPEG (Max 10MB)</Badge>
                    </div>
                  )}
                </div>

                {/* Feature cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { icon:<Cpu className="w-4 h-4"/>, color:"text-primary", title:"Direct Image Upload", desc:"Documents are sent directly to Gemini as images — no preprocessing pipeline." },
                    { icon:<Sparkles className="w-4 h-4"/>, color:"text-indigo-600", title:"Gemini Multimodal AI", desc:"Gemini reads text, layout, and context natively from images and returns structured JSON." },
                  ].map(({icon,color,title,desc})=>(
                    <Card key={title} className="bg-card border-border">
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className={`${color} mt-0.5 shrink-0`}>{icon}</div>
                        <div><h4 className="text-xs font-bold text-foreground">{title}</h4><p className="text-[10px] text-muted-foreground leading-normal mt-1">{desc}</p></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* B. PROCESSING */}
          {selectedDocId && activeDoc && pollingStatus !== "COMPLETED" && pollingStatus !== "FAILED" && (
            <div className="w-full h-full flex flex-col items-center justify-center px-4 py-6 bg-muted/10 overflow-y-auto">
              <div className="max-w-md w-full flex flex-col gap-6">
                <div className="text-center flex flex-col gap-2">
                  <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin absolute" />
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mt-2 px-4 truncate">Processing: {activeDoc.filename}</h3>
                  <p className="text-xs text-muted-foreground">Orchestrating stateful LangGraph nodes in background worker.</p>
                </div>
                <div className="flex flex-col gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
                  {STEPS.map(({step,label,done})=>{
                    const s = getStepStyle(step, pollingStatus);
                    const isDone = done || (stepPriority[pollingStatus]||0) > (stepPriority[step]||0);
                    return (
                      <div key={step} className={`flex items-center gap-3 p-3 rounded-lg border text-xs transition-all ${s.c}`}>
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.d}`}></span>
                        <span className={`flex-1 ${s.t}`}>{label}</span>
                        {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* C. FAILED */}
          {selectedDocId && activeDoc && pollingStatus === "FAILED" && (
            <div className="w-full h-full flex flex-col items-center justify-center px-4 py-6 overflow-y-auto">
              <div className="max-w-sm w-full bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col items-center gap-5 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-sm font-bold text-foreground">Document Processing Failed</h3>
                  <p className="text-xs text-red-600 font-semibold truncate max-w-[260px]">{activeDoc.filename}</p>
                </div>
                <div className="w-full bg-muted p-4 rounded-xl border border-border text-xs font-mono text-muted-foreground text-left select-all leading-normal whitespace-pre-wrap">
                  {activeDoc.error_message || "Unknown error in state machine."}
                </div>
                <Button onClick={()=>handleSelectDoc(activeDoc)} variant="secondary" className="w-full font-semibold">Retry Execution</Button>
              </div>
            </div>
          )}

          {/* D. COMPLETED */}
          {selectedDocId && activeDoc && pollingStatus === "COMPLETED" && (
            isMobile ? (
              /* Mobile: Tabbed */
              <Tabs defaultValue="preview" className="flex flex-col h-full gap-0">
                <div className="px-4 pt-3 pb-2 border-b border-border bg-background shrink-0">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="preview" className="gap-1.5">
                      <FileText className="w-3.5 h-3.5" />Preview
                    </TabsTrigger>
                    <TabsTrigger value="results" className="gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />Results
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="preview" className="flex-1 overflow-hidden m-0 p-3">
                  <div className="h-full">
                    <DocPreviewOverlay
                      fileUrl={getStaticFileUrl(activeDoc.file_path)}
                      fileType={getExt(activeDoc.filename)}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="results" className="flex-1 overflow-hidden m-0">
                  <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-none">
                    <div className="p-4 pb-8">
                      <ResultsViewer extractedData={activeDoc.extracted_data||{}} />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              /* Desktop: side-by-side */
              <div className="w-full h-full flex p-6 gap-6 overflow-hidden">
                <div className="flex-1 h-full overflow-hidden">
                  <DocPreviewOverlay
                    fileUrl={getStaticFileUrl(activeDoc.file_path)}
                    fileType={getExt(activeDoc.filename)}
                    layoutData={activeDoc.layout_data||[]}
                    activeFieldText={activeHoverField}
                  />
                </div>
                <div className="flex-1 h-full overflow-y-auto overflow-x-hidden scrollbar-none">
                  <div className="py-1 pr-1">
                    <ResultsViewer extractedData={activeDoc.extracted_data||{}} onHoverField={setActiveHoverField} />
                  </div>
                </div>
              </div>
            )
          )}

        </div>
      </main>
    </div>
  );
}
