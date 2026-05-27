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
  Clock, 
  Plus, 
  ChevronRight, 
  RefreshCw, 
  Database,
  ArrowUpRight
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import { uploadDocument, getDocumentResult, listDocuments, API_BASE_URL } from '@/lib/api';
import DocPreviewOverlay from '@/components/DocPreviewOverlay';
import ResultsViewer from '@/components/ResultsViewer';

export default function Dashboard() {
  // App state
  const [history, setHistory] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(null);
  const [activeHoverField, setActiveHoverField] = useState(null);
  
  // Drag & drop visual state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Poll database status during background tasks
  const pollIntervalRef = useRef(null);

  // 1. Fetch History on Mount
  useEffect(() => {
    fetchHistory();
    return () => stopPolling();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await listDocuments();
      setHistory(data);
    } catch (err) {
      toast.error("Failed to load historical items");
    }
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // 2. Start Status Polling for Asynchronous Jobs
  const startPolling = (docId) => {
    stopPolling();
    setPollingStatus("PENDING");
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const docResult = await getDocumentResult(docId);
        setActiveDoc(docResult);
        setPollingStatus(docResult.status);
        
        // Update history in-place
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
      } catch (err) {
        stopPolling();
        toast.error("Status check failed");
      }
    }, 1500); // Poll every 1.5 seconds
  };

  // 3. Selection of historical files
  const handleSelectDoc = (doc) => {
    stopPolling();
    setSelectedDocId(doc.id);
    setActiveDoc(doc);
    setPollingStatus(doc.status);

    if (doc.status !== "COMPLETED" && doc.status !== "FAILED") {
      startPolling(doc.id);
    }
  };

  // 4. File Upload Ingestion
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
      
      // Kickoff real-time status check loop
      startPolling(response.documentId);
    } catch (err) {
      setIsUploading(false);
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to process file");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // 5. Layout Helpers
  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-emerald-950/60 text-emerald-400 border border-emerald-900 font-bold px-2.5 py-0.5 text-[10px]">READY</Badge>;
      case "FAILED":
        return <Badge className="bg-rose-950/60 text-rose-400 border border-rose-900 font-bold px-2.5 py-0.5 text-[10px]">FAILED</Badge>;
      case "PENDING":
        return <Badge className="bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold px-2.5 py-0.5 text-[10px] animate-pulse">QUEUED</Badge>;
      default:
        return <Badge className="bg-purple-950/60 text-purple-400 border border-purple-900 font-bold px-2.5 py-0.5 text-[10px] animate-pulse">{status}</Badge>;
    }
  };

  const getStepIndicatorStyle = (stepStatus, currentStatus) => {
    const statusPriority = {
      "PENDING": 0,
      "VALIDATING": 1,
      "CONVERTING": 2,
      "PREPROCESSING": 3,
      "RUNNING_OCR": 4,
      "AI_EXTRACTION": 5,
      "COMPLETED": 6
    };

    const currentPriority = statusPriority[currentStatus] || 0;
    const stepPriority = statusPriority[stepStatus];

    if (currentStatus === "FAILED") {
      return { container: "border-rose-900/30 bg-rose-950/10", dot: "bg-rose-500", text: "text-rose-400" };
    }

    if (currentPriority > stepPriority) {
      // Completed Step
      return { container: "border-emerald-900/30 bg-emerald-950/15", dot: "bg-emerald-500", text: "text-emerald-400" };
    }
    if (currentPriority === stepPriority) {
      // Active Step
      return { container: "border-purple-800 bg-purple-950/30 shadow-[0_0_12px_rgba(168,85,247,0.25)] animate-pulse", dot: "bg-purple-500 animate-ping", text: "text-purple-300 font-medium" };
    }
    // Pending Step
    return { container: "border-zinc-800 bg-zinc-900/20", dot: "bg-zinc-800", text: "text-zinc-500" };
  };

  // Convert SQLite local saved file path to backend static uploads URL
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
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      <Toaster theme="dark" position="top-right" richColors />

      {/* ==========================================
          1. LEFT SIDEBAR: Document History List
          ========================================== */}
      <aside className="w-80 border-r border-zinc-800 bg-zinc-900 flex flex-col h-full shrink-0">
        {/* Sidebar Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-zinc-100">DocuSense AI</h1>
              <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                <Database className="w-3 h-3 text-purple-400" />
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
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* History Search / Label */}
        <div className="px-5 py-3 border-b border-zinc-850 bg-zinc-900/80 flex items-center justify-between text-xs text-zinc-400">
          <span className="font-semibold flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-zinc-500" />
            Processing History
          </span>
          <span className="text-[10px] bg-zinc-850 px-1.5 py-0.5 rounded text-zinc-500 border border-zinc-800 font-mono">
            {history.length} Jobs
          </span>
        </div>

        {/* Scrollable Document Items */}
        <ScrollArea className="flex-1 bg-zinc-900/40">
          <div className="p-3 flex flex-col gap-1.5">
            {history.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs text-zinc-600">
                <FileText className="w-8 h-8 mx-auto mb-2 text-zinc-800 opacity-60" />
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
                        ? 'border-purple-800 bg-purple-950/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.25)]' 
                        : 'border-zinc-850 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800/40'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded shrink-0 border border-zinc-700">
                          {ext.toUpperCase() || 'FILE'}
                        </span>
                        <h4 className="text-xs font-semibold text-zinc-200 truncate select-all">
                          {item.filename}
                        </h4>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 text-zinc-500 transition-transform ${isActive ? 'rotate-90 text-purple-400' : ''}`} />
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Sync Footer */}
        <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-600" />
            Pipeline Status
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchHistory}
            className="w-6 h-6 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </aside>

      {/* ==========================================
          2. MAIN WORKSPACE
          ========================================== */}
      <main className="flex-1 flex flex-col h-full bg-zinc-950 relative overflow-hidden">
        {/* Main Dashboard Top Navbar */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-sm text-zinc-100">Intelligent Document Extraction</h2>
            {selectedDocId && (
              <>
                <span className="text-zinc-600">/</span>
                <span className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded select-all font-mono">
                  {selectedDocId}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Quick API Swagger reference link */}
            <a 
              href={`${API_BASE_URL.replace("/api", "")}/docs`} 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1 border border-zinc-800 px-3 py-1.5 rounded-lg bg-zinc-900/60"
            >
              <span>Swagger API Docs</span>
              <ArrowUpRight className="w-3 h-3 text-zinc-500" />
            </a>
          </div>
        </header>

        {/* Workspace Panels */}
        <div className="flex-1 overflow-hidden relative">
          
          {/* A. DEFAULT STATE: Welcomer & Drag-and-Drop Area */}
          {!selectedDocId && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
              <div className="max-w-xl w-full flex flex-col gap-8">
                
                {/* Intro Title */}
                <div className="text-center flex flex-col gap-2 max-w-sm mx-auto">
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center justify-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-500 animate-pulse" />
                    Welcome to DocuSense
                  </h2>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Upload scanned identity cards, degrees, academic credentials, or international documents to extract structured entity records using OCR and Gemini.
                  </p>
                </div>

                {/* Drag and Drop Workspace */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[220px] select-none
                    ${isDragOver 
                      ? 'border-purple-500 bg-purple-950/20 shadow-[0_0_24px_rgba(168,85,247,0.15)] scale-[1.01]' 
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/80'
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
                      <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                      <p className="text-sm font-semibold text-zinc-300">Ingesting document file...</p>
                      <p className="text-xs text-zinc-500">Checking boundaries and saving file securely...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 transition">
                        <UploadCloud className="w-7 h-7 text-purple-400 animate-bounce" style={{ animationDuration: '3s' }} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-bold text-zinc-200">Drag & Drop document here</p>
                        <p className="text-xs text-zinc-500">
                          or <span className="text-purple-400 hover:text-purple-300 font-medium">browse local files</span>
                        </p>
                      </div>
                      <Badge className="bg-zinc-950 border-zinc-850 px-2.5 py-1 text-[10px] text-zinc-500">
                        Supports PDF, PNG, JPG, JPEG (Max 10MB)
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-zinc-900/30 border-zinc-900/80">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="text-purple-400 mt-0.5">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-300">OpenCV Preprocessing</h4>
                        <p className="text-[10px] text-zinc-500 leading-normal mt-1">Cleans noise, filters grays, and corrects skews for 99% character legibility.</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/30 border-zinc-900/80">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="text-emerald-400 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-300">Layout-Aware OCR</h4>
                        <p className="text-[10px] text-zinc-500 leading-normal mt-1">Detects raw word structures mapping precise coordinate bounding boxes.</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/30 border-zinc-900/80">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="text-indigo-400 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-300">Gemini LLM Structurer</h4>
                        <p className="text-[10px] text-zinc-500 leading-normal mt-1">Runs strict JSON validation schemas to structure credential details.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </div>
            </div>
          )}

          {/* B. ONGOING POLLING / PROGRESS STATE: Real-time Workflow Stepper */}
          {selectedDocId && activeDoc && pollingStatus !== "COMPLETED" && pollingStatus !== "FAILED" && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-zinc-950/40">
              <div className="max-w-md w-full flex flex-col gap-6">
                
                {/* Loader header */}
                <div className="text-center flex flex-col gap-2">
                  <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin absolute" />
                    <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  </div>
                  <h3 className="text-md font-bold text-zinc-200 mt-2 select-all truncate">
                    Processing: {activeDoc.filename}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Orchestrating stateful LangGraph nodes inside background worker.
                  </p>
                </div>

                {/* Steps List */}
                <div className="flex flex-col gap-3.5 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-900 shadow-xl">
                  
                  {/* Step 1: Uploading */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg border text-xs transition duration-200 ${getStepIndicatorStyle("PENDING", pollingStatus).container}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${getStepIndicatorStyle("PENDING", pollingStatus).dot}`}></span>
                    <span className={`flex-1 ${getStepIndicatorStyle("PENDING", pollingStatus).text}`}>1. Ingestion Upload Completed</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>

                  {/* Step 2: Converting */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg border text-xs transition duration-200 ${getStepIndicatorStyle("CONVERTING", pollingStatus).container}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${getStepIndicatorStyle("CONVERTING", pollingStatus).dot}`}></span>
                    <span className={`flex-1 ${getStepIndicatorStyle("CONVERTING", pollingStatus).text}`}>2. PDF Page Conversion / Rasterizing</span>
                    {pollingStatus !== "PENDING" && pollingStatus !== "VALIDATING" && <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in fade-in" />}
                  </div>

                  {/* Step 3: Preprocessing */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg border text-xs transition duration-200 ${getStepIndicatorStyle("PREPROCESSING", pollingStatus).container}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${getStepIndicatorStyle("PREPROCESSING", pollingStatus).dot}`}></span>
                    <span className={`flex-1 ${getStepIndicatorStyle("PREPROCESSING", pollingStatus).text}`}>3. OpenCV Grays & Skew Orientation Filters</span>
                    {(pollingStatus === "RUNNING_OCR" || pollingStatus === "AI_EXTRACTION" || pollingStatus === "COMPLETED") && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>

                  {/* Step 4: Running OCR */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg border text-xs transition duration-200 ${getStepIndicatorStyle("RUNNING_OCR", pollingStatus).container}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${getStepIndicatorStyle("RUNNING_OCR", pollingStatus).dot}`}></span>
                    <span className={`flex-1 ${getStepIndicatorStyle("RUNNING_OCR", pollingStatus).text}`}>4. Layout Bounding Box & EasyOCR Scanning</span>
                    {(pollingStatus === "AI_EXTRACTION" || pollingStatus === "COMPLETED") && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>

                  {/* Step 5: AI Extraction */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg border text-xs transition duration-200 ${getStepIndicatorStyle("AI_EXTRACTION", pollingStatus).container}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${getStepIndicatorStyle("AI_EXTRACTION", pollingStatus).dot}`}></span>
                    <span className={`flex-1 ${getStepIndicatorStyle("AI_EXTRACTION", pollingStatus).text}`}>5. Structured JSON Mapping (Google Gemini)</span>
                    {pollingStatus === "COMPLETED" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* C. FAILED STATE: Display diagnostic error */}
          {selectedDocId && activeDoc && pollingStatus === "FAILED" && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8">
              <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-5 text-center">
                <div className="w-16 h-16 rounded-2xl bg-rose-950 border border-rose-800/30 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-md font-bold text-zinc-100">Document Processing Failed</h3>
                  <p className="text-xs text-rose-400 font-semibold truncate max-w-xs">{activeDoc.filename}</p>
                </div>
                <div className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-850 text-xs font-mono text-zinc-400 text-left select-all leading-normal whitespace-pre-wrap">
                  {activeDoc.error_message || "An unknown execution error occurred in the state machine."}
                </div>
                <Button 
                  onClick={() => handleSelectDoc(activeDoc)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold"
                >
                  Retry Execution
                </Button>
              </div>
            </div>
          )}

          {/* D. COMPLETED STATE: Split-pane side-by-side Review */}
          {selectedDocId && activeDoc && pollingStatus === "COMPLETED" && (
            <div className="w-full h-full flex p-6 gap-6 overflow-hidden">
              
              {/* Left Pane: Visual Scan Reviewer with highlight overlays */}
              <div className="flex-1 h-full overflow-hidden">
                <DocPreviewOverlay 
                  fileUrl={getStaticFileUrl(activeDoc.file_path)}
                  fileType={getFileExtension(activeDoc.filename)}
                  layoutData={activeDoc.layout_data || []}
                  activeFieldText={activeHoverField}
                />
              </div>

              {/* Right Pane: Structured JSON Category cards & confidence bars */}
              <div className="flex-1 h-full overflow-y-auto pr-1">
                <ResultsViewer 
                  extractedData={activeDoc.extracted_data || {}}
                  onHoverField={setActiveHoverField}
                />
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
