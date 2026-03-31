"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, FileText, CheckCircle2, Loader2, AlertCircle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useKB } from "@/components/kb-context";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface UploadDialogProps {
    onUploadComplete: () => void;
    children?: React.ReactNode;
    knowledgeBase?: string;
}

interface UploadStep {
    id: "minio" | "ocr" | "chunking" | "embedding";
    label: string;
    status: "pending" | "processing" | "success" | "error";
    detail?: string;
}

interface FileUploadStatus {
    file: File;
    status: "pending" | "processing" | "success" | "error";
    error?: string;
}

export function UploadDialog({ onUploadComplete, children, knowledgeBase }: UploadDialogProps) {
    const [open, setOpen] = useState(false);
    const [files, setFiles] = useState<FileUploadStatus[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [targetKB, setTargetKB] = useState(knowledgeBase || "local");
    const { knowledgeBases } = useKB();

    useEffect(() => {
        setTargetKB(knowledgeBase || "local");
    }, [knowledgeBase]);
    const [steps, setSteps] = useState<UploadStep[]>([
        { id: "minio", label: "Upload to Storage", status: "pending" },
        { id: "ocr", label: "OCR Processing", status: "pending" },
        { id: "chunking", label: "Content Chunking", status: "pending" },
        { id: "embedding", label: "Vector Embedding", status: "pending" },
    ]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).map(file => ({
                file,
                status: "pending" as const
            }));
            setFiles(prev => [...prev, ...newFiles]);
            resetSteps();
        }
    };

    const removeFile = (index: number) => {
        if (isUploading) return;
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const resetSteps = () => {
        setSteps([
            { id: "minio", label: "Upload to Storage", status: "pending" },
            { id: "ocr", label: "OCR Processing", status: "pending" },
            { id: "chunking", label: "Content Chunking", status: "pending" },
            { id: "embedding", label: "Vector Embedding", status: "pending" },
        ]);
    };

    const updateStepStatus = (id: string, status: "processing" | "success" | "error", detail?: string) => {
        setSteps(prev => prev.map(step =>
            step.id === id ? { ...step, status, detail } : step
        ));
    };

    const updateFileStatus = (index: number, status: "pending" | "processing" | "success" | "error", error?: string) => {
        setFiles(prev => prev.map((f, i) =>
            i === index ? { ...f, status, error } : f
        ));
    };

    const processFile = async (fileStatus: FileUploadStatus, index: number) => {
        updateFileStatus(index, "processing");
        resetSteps();

        // Optimistic UI updates to show progress
        updateStepStatus("minio", "processing");

        const formData = new FormData();
        formData.append("file", fileStatus.file);
        formData.append("metadata", JSON.stringify({ source: "web_upload" }));
        if (targetKB) {
            formData.append("knowledge_base", targetKB);
        }

        try {
            // Use Next.js API route proxy to avoid CORS issues
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                const errorMsg = result?.error || response.statusText || `Upload failed (${response.status})`;
                throw new Error(errorMsg);
            }

            if (result?.success) {
                updateStepStatus("minio", "success");
                updateStepStatus("ocr", "success", result.steps?.ocr);
                updateStepStatus("chunking", "success",
                    result.steps?.chunking ? `${result.steps.chunking.parent_chunks}P / ${result.steps.chunking.child_chunks}C` : undefined
                );
                updateStepStatus("embedding", "success");

                updateFileStatus(index, "success");
                return true;
            } else {
                throw new Error(result?.error || "Upload processing failed");
            }

        } catch (error: any) {
            console.error(`Error uploading ${fileStatus.file.name}:`, error);
            updateStepStatus("minio", "error");
            updateFileStatus(index, "error", error.message || "Failed");
            return false;
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            if (files[i].status === 'success') continue; // Skip already uploaded files

            setCurrentFileIndex(i);
            const success = await processFile(files[i], i);
            if (success) successCount++;
        }

        setIsUploading(false);
        setCurrentFileIndex(0);

        if (successCount > 0) {
            toast.success(`Successfully processed ${successCount} files`);
            onUploadComplete();

            // If all files successful (i.e. number of newly succeeded files equals number of files that were not success at start),
            // close dialog after delay.
            const initialNonSuccessCount = files.filter(f => f.status !== 'success').length;

            if (successCount === initialNonSuccessCount) {
                setTimeout(() => {
                    setOpen(false);
                    setFiles([]);
                    resetSteps();
                }, 1500);
            }
        } else {
            toast.error("Failed to process files");
        }
    };

    const handleClearFiles = () => {
        setFiles([]);
        resetSteps();
    }

    return (
        <Dialog open={open} onOpenChange={(open) => {
            if (!isUploading) {
                setOpen(open);
                if (!open) {
                    // Optional: clear files on close? 
                    // setFiles([]); 
                }
            }
        }}>
            <DialogTrigger asChild>
                {children || (
                    <Button className="gap-2">
                        <Upload className="w-4 h-4" />
                        Upload File
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Upload Documents</DialogTitle>
                    <DialogDescription>
                        Upload files (PDF, Image) to process them for the RAG system.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
                    {/* KB Selector */}
                    <div className="space-y-2 shrink-0">
                        <Label className="text-xs font-medium">Target Knowledge Base</Label>
                        <Select value={targetKB} onValueChange={setTargetKB} disabled={isUploading}>
                            <SelectTrigger className="h-9 text-xs">
                                <div className="flex items-center gap-2">
                                    <Database className="w-3.5 h-3.5 text-muted-foreground" />
                                    <SelectValue placeholder="Default (local)" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="local" className="text-xs">local</SelectItem>
                                {knowledgeBases.filter(kb => kb.name !== "local").map((kb) => (
                                    <SelectItem key={kb.name} value={kb.name} className="text-xs">
                                        {kb.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Dropzone */}
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors relative shrink-0",
                            isUploading ? "pointer-events-none opacity-50 border-muted" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                        )}
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept=".pdf,.png,.jpg,.jpeg,.docx,.txt,.md,.xlsx,.csv"
                            multiple
                            onChange={handleFileSelect}
                        />
                        <div className="text-center space-y-2">
                            <div className="bg-muted p-3 rounded-full inline-block">
                                <Upload className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Click to select files</p>
                                <p className="text-xs text-muted-foreground">PDF or Xlsx (Max 10MB)</p>
                            </div>
                        </div>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground">{files.length} files selected</span>
                                {!isUploading && (
                                    <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive hover:bg-destructive/10" onClick={handleClearFiles}>
                                        Clear all
                                    </Button>
                                )}
                            </div>
                            <ScrollArea className="flex-1 pr-3 -mr-3">
                                <div className="space-y-2">
                                    {files.map((fileStatus, index) => (
                                        <div key={index} className={cn(
                                            "flex items-center gap-3 p-2 rounded-md border text-sm",
                                            fileStatus.status === "processing" ? "border-primary bg-primary/5" :
                                                fileStatus.status === "success" ? "border-primary/25 bg-primary/5" :
                                                    fileStatus.status === "error" ? "border-destructive/20 bg-destructive/5" :
                                                        "border-border bg-card"
                                        )}>
                                            <div className="shrink-0">
                                                {fileStatus.status === "processing" ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> :
                                                    fileStatus.status === "success" ? <CheckCircle2 className="w-4 h-4 text-primary" /> :
                                                        fileStatus.status === "error" ? <AlertCircle className="w-4 h-4 text-destructive" /> :
                                                            <FileText className="w-4 h-4 text-muted-foreground" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between">
                                                    <p className="font-medium truncate">{fileStatus.file.name}</p>
                                                    <span className="text-xs text-muted-foreground ml-2 shrink-0">{(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                </div>
                                                {fileStatus.error && <p className="text-xs text-destructive mt-0.5">{fileStatus.error}</p>}
                                            </div>
                                            {!isUploading && (
                                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeFile(index)}>
                                                    <X className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>Cancel</Button>
                    <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
                        {isUploading ? "Processing..." : `Upload ${files.length > 0 ? `(${files.length})` : ""}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
