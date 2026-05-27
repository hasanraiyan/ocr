"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import {
  UploadCloud,
  History,
  Sparkles,
  Cpu,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Plus,
  ChevronRight,
  RefreshCw,
  Database,
  ArrowUpRight
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import { uploadDocument, getDocumentResult, listDocuments, API_BASE_URL } from '@/lib/api';
import DocPreviewOverlay from '@/components/DocPreviewOverlay';
import ResultsViewer from '@/components/ResultsViewer';

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(null);
  const [activeHoverField, setActiveHoverField] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
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
          stopPolling();
          toast.success("Document intelligence extraction complete!");
          fetchHistory();
        } else if (docResult.status === "FAILED") {
          stopPolling();
          toast.error(docResult.error_message || "Document processing failed");
          fetchHistory();
        }
      } catch {
        stopPolling();
        toast.error("Status check failed");
      }
    }, 1500);
  };

  const handleSelectDoc = (doc) => {
    stopPolling();
    setSelectedDocId(doc.id);
    setActiveDoc(doc);
    setPollingStatus(doc.status);

    if (doc.status !== "COMPLETED" && doc.status !== "FAILED") {
      startPolling(doc.id);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Ingesting file constraints and upload...");

    try {
      const response = await uploadDocument(file);
      setIsUploading(false);
      toast.dismiss(toastId);
      toast.success("Document uploaded successfully! Starting background task.");

      const newJob = {
        id: response.documentId,
        filename: response.filename,
        status: response.status,
        created_at: new Date().toISOString(),
        file_path: "",
      };

      setHistory(prev => [newJob, ...prev]);
      setSelectedDocId(response.documentId);
      setActiveDoc(newJob);
      startPolling(response.documentId);
    } catch (err) {
      setIsUploading(false);
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to process file");
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-0.5 text-[10px]">
            READY
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-red-50 text-red-700 border border-red-200 font-bold px-2.5 py-0.5 text-[10px]">
            FAILED
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-muted text-muted-foreground border border-border font-bold px-2.5 py-0.5 text-[10px] animate-pulse">
            QUEUED
          </Badge>
        );
      default:
        return (
          <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold px-2.5 py-0.5 text-[10px] animate-pulse">
            {status}
          </Badge>
        );
    }
  };

  const getStepIndicatorStyle = (stepStatus, currentStatus) => {
    const statusPriority = {
      "PENDING": 0, "VALIDATING": 1, "CONVERTING": 2,
      "PREPROCESSING": 3, "RUNNING_OCR": 4, "AI_EXTRACTION": 5, "COMPLETED": 6
    };

    const currentPriority = statusPriority[currentStatus] || 0;
    const stepPriority = statusPriority[stepStatus];

    if (currentStatus === "FAILED") {
      return {
        container: "border-red-200 bg-red-50/50",
        dot: "bg-red-500",
        text: "text-red-600"
      };
    }
    if (currentPriority > stepPriority) {
      return {
        container: "border-emerald-200 bg-emerald-50/50",
        dot: "bg-emerald-500",
        text: "text-emerald-700"
      };
    }
    if (currentPriority === stepPriority) {
      return {
        container: "border-primary/30 bg-primary/5 shadow-sm animate-pulse",
        dot: "bg-primary animate-ping",
        text: "text-primary font-medium"
      };
    }
    return {
      container: "border-border bg-muted/30",
      dot: "bg-muted-foreground/30",
      text: "text-muted-foreground"
    };
  };

  const getStaticFileUrl = (filePath) => {
    if (!filePath) return "";
    const basename = filePath.replace(/^.*[\\\/]/, '');
    return `${API_BASE_URL.replace("/api", "")}/uploads/${basename}`;
  };

  const getFileExtension = (filename) => {
    if (!filename) return "";
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      <Toaster theme="light" position="top-right" richColors />

      {/* ==========================================
          LEFT SIDEBAR: Document History List
          ========================================== */}
      <aside className="w-80 border-r border-border bg-card flex flex-col h-full shrink-0 overflow-hidden">
        {/* Sidebar Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-foreground">DocuSense AI</h1>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Database className="w-3 h-3 text-primary" />
                <span>Supabase Live</span>
              </p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              stopPolling();
              setSelectedDocId(null);
              setActiveDoc(null);
              setPollingStatus(null);
            }}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* History Label */}
        <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            Processing History
          </span>
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border font-mono">
            {history.length} Jobs
          </span>
        </div>

        {/* Scrollable Document Items — plain div keeps overflow-x constrained; ScrollArea's Radix viewport overrides overflow-x */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
          <div className="p-3 flex flex-col gap-1.5">
            {history.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 text-muted opacity-60" />
                No documents uploaded yet
              </div>
            ) : (
              history.map((item) => {
                const isActive = item.id === selectedDocId;
                const ext = getFileExtension(item.filename);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectDoc(item)}
                    className={`
                      p-3 rounded-lg border text-left cursor-pointer transition-all duration-200 flex flex-col gap-2
                      ${isActive
                        ? 'border-primary/40 bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/20 bg-card hover:bg-accent/40'
                      }
                    `}
                  >
                    {/* Row 1: ext badge + filename + chevron */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0 border border-border">
                        {ext.toUpperCase() || 'FILE'}
                      </span>
                      <h4 className="text-xs font-semibold text-foreground truncate flex-1 min-w-0">
                        {item.filename}
                      </h4>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform ${isActive ? 'rotate-90 text-primary' : ''}`} />
                    </div>

                    {/* Row 2: date + status badge */}
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground min-w-0">
                      <span className="truncate">{new Date(item.created_at).toLocaleDateString()}</span>
                      <span className="shrink-0">{getStatusBadge(item.status)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border bg-background flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            Pipeline Status
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchHistory}
            className="w-6 h-6 hover:bg-accent text-muted-foreground hover:text-foreground transition"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </aside>

      {/* ==========================================
          MAIN WORKSPACE
          ========================================== */}
      <main className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-sm text-foreground">Intelligent Document Extraction</h2>
            {selectedDocId && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded select-all font-mono">
                  {selectedDocId}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`${API_BASE_URL.replace("/api", "")}/docs`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1 border border-border px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-accent"
            >
              <span>Swagger API Docs</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 overflow-hidden relative">

          {/* A. WELCOME / UPLOAD STATE */}
          {!selectedDocId && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
              <div className="max-w-xl w-full flex flex-col gap-8">

                {/* Intro */}
                <div className="text-center flex flex-col gap-2 max-w-sm mx-auto">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                    Welcome to DocuSense
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload scanned identity cards, degrees, academic credentials, or international documents to extract structured entity records using OCR and Gemini.
                  </p>
                </div>

                {/* Drag & Drop */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[220px] select-none
                    ${isDragOver
                      ? 'border-primary bg-primary/5 scale-[1.01]'
                      : 'border-border hover:border-primary/40 bg-muted/30 hover:bg-muted/50'
                    }
                  `}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-sm font-semibold text-foreground">Ingesting document file...</p>
                      <p className="text-xs text-muted-foreground">Checking boundaries and saving file securely...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center transition">
                        <UploadCloud className="w-7 h-7 text-primary animate-bounce" style={{ animationDuration: '3s' }} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-bold text-foreground">Drag & Drop document here</p>
                        <p className="text-xs text-muted-foreground">
                          or <span className="text-primary hover:text-primary/80 font-medium">browse local files</span>
                        </p>
                      </div>
                      <Badge className="bg-muted border border-border px-2.5 py-1 text-[10px] text-muted-foreground">
                        Supports PDF, PNG, JPG, JPEG (Max 10MB)
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="text-primary mt-0.5">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">OpenCV Preprocessing</h4>
                        <p className="text-[10px] text-muted-foreground leading-normal mt-1">Cleans noise, filters grays, and corrects skews for 99% character legibility.</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="text-emerald-600 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Layout-Aware OCR</h4>
                        <p className="text-[10px] text-muted-foreground leading-normal mt-1">Detects raw word structures mapping precise coordinate bounding boxes.</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="text-indigo-600 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Gemini LLM Structurer</h4>
                        <p className="text-[10px] text-muted-foreground leading-normal mt-1">Runs strict JSON validation schemas to structure credential details.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </div>
            </div>
          )}

          {/* B. PROCESSING / POLLING STATE */}
          {selectedDocId && activeDoc && pollingStatus !== "COMPLETED" && pollingStatus !== "FAILED" && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-muted/10">
              <div className="max-w-md w-full flex flex-col gap-6">

                {/* Loader Header */}
                <div className="text-center flex flex-col gap-2">
                  <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin absolute" />
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-md font-bold text-foreground mt-2 select-all truncate">
                    Processing: {activeDoc.filename}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Orchestrating stateful LangGraph nodes inside background worker.
                  </p>
                </div>

                {/* Steps */}
                <div className="flex flex-col gap-3.5 bg-card p-6 rounded-2xl border border-border shadow-sm">
                  {[
                    { step: "PENDING", label: "1. Ingestion Upload Completed", alwaysCheck: true },
                    { step: "CONVERTING", label: "2. PDF Page Conversion / Rasterizing" },
                    { step: "PREPROCESSING", label: "3. OpenCV Grays & Skew Orientation Filters" },
                    { step: "RUNNING_OCR", label: "4. Layout Bounding Box & EasyOCR Scanning" },
                    { step: "AI_EXTRACTION", label: "5. Structured JSON Mapping (Google Gemini)" },
                  ].map(({ step, label, alwaysCheck }) => {
                    const s = getStepIndicatorStyle(step, pollingStatus);
                    const statusPriority = { "PENDING": 0, "VALIDATING": 1, "CONVERTING": 2, "PREPROCESSING": 3, "RUNNING_OCR": 4, "AI_EXTRACTION": 5, "COMPLETED": 6 };
                    const isDone = alwaysCheck || (statusPriority[pollingStatus] || 0) > (statusPriority[step] || 0);
                    return (
                      <div key={step} className={`flex items-center gap-3 p-3 rounded-lg border text-xs transition duration-200 ${s.container}`}>
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`}></span>
                        <span className={`flex-1 ${s.text}`}>{label}</span>
                        {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          )}

          {/* C. FAILED STATE */}
          {selectedDocId && activeDoc && pollingStatus === "FAILED" && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8">
              <div className="max-w-md w-full bg-card border border-border p-8 rounded-2xl shadow-sm flex flex-col items-center gap-5 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-md font-bold text-foreground">Document Processing Failed</h3>
                  <p className="text-xs text-red-600 font-semibold truncate max-w-xs">{activeDoc.filename}</p>
                </div>
                <div className="w-full bg-muted p-4 rounded-xl border border-border text-xs font-mono text-muted-foreground text-left select-all leading-normal whitespace-pre-wrap">
                  {activeDoc.error_message || "An unknown execution error occurred in the state machine."}
                </div>
                <Button
                  onClick={() => handleSelectDoc(activeDoc)}
                  variant="secondary"
                  className="w-full font-semibold"
                >
                  Retry Execution
                </Button>
              </div>
            </div>
          )}

          {/* D. COMPLETED STATE */}
          {selectedDocId && activeDoc && pollingStatus === "COMPLETED" && (
            <div className="w-full h-full flex p-6 gap-6 overflow-hidden">
              <div className="flex-1 h-full overflow-hidden">
                <DocPreviewOverlay
                  fileUrl={getStaticFileUrl(activeDoc.file_path)}
                  fileType={getFileExtension(activeDoc.filename)}
                  layoutData={activeDoc.layout_data || []}
                  activeFieldText={activeHoverField}
                />
              </div>
              <ScrollArea className="flex-1 h-full">
                <div className="py-1 pr-1">
                  <ResultsViewer
                    extractedData={activeDoc.extracted_data || {}}
                    onHoverField={setActiveHoverField}
                  />
                </div>
              </ScrollArea>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
