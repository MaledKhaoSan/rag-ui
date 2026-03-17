"use client";


import { useState, useRef, useEffect } from "react";
import {
    FileText,
    Trash2,
    Upload,
    MoreVertical,
    RefreshCw,
    Search,
    Plus,
    File
} from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { UploadDialog } from './upload-dialog';
import { useKB } from "@/components/kb-context";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DocumentInfo {
    file_id: string;
    filename: string;
    upload_date: string;
    status: 'indexed' | 'pending' | 'failed';
    knowledge_base: string;
    chunk_count?: number;
    file_size?: number;
    mime_type?: string;
    // Extended properties for details
    file_info?: any;
    chunks?: any;
    [key: string]: any;
}

interface DocumentListProps {
    documents: DocumentInfo[];
    selectedFile: string | null;
    onSelectFile: (fileId: string | null) => void;
    onUploadComplete: () => Promise<void>;
    isLoading?: boolean;
}

export function DocumentList({
    documents = [],
    selectedFile,
    onSelectFile,
    onUploadComplete,
    isLoading = false
}: DocumentListProps) {
    const { selectedKBs } = useKB();
    const activeKB = selectedKBs.length === 1 ? selectedKBs[0] : "";

    // Local search state
    const [searchQuery, setSearchQuery] = useState("");

    const filteredDocuments = documents.filter(doc =>
        (doc.filename || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleResetSystem = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            // If activeKB is set, reset only that KB. Otherwise reset all (no param).
            const kbParam = activeKB ? `?knowledge_base=${activeKB}` : "";

            const res = await fetch(`${apiUrl}/api/v1/rag/reset${kbParam}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success(activeKB ? `Knowledge Base "${activeKB}" reset successfully` : "System reset successfully");
                onUploadComplete(); // Refresh list
            } else {
                toast.error("Failed to reset system");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error resetting system");
        }
    };

    const handleDeleteFile = async (e: React.MouseEvent, doc: DocumentInfo) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete "${doc.filename}"?`)) {
            return;
        }

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const kb = doc.knowledge_base || "local";

            const res = await fetch(`${apiUrl}/api/v1/rag/knowledge-bases/${kb}/${doc.file_id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success(`Deleted ${doc.filename} successfully`);
                onUploadComplete(); // Refresh list
                if (selectedFile === doc.file_id) {
                    onSelectFile(null);
                }
            } else {
                toast.error("Failed to delete file");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error deleting file");
        }
    };

    return (
        <div className="w-full border-r bg-muted/10 flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Documents
                    </h2>
                    <div className="flex items-center gap-1">
                        <UploadDialog onUploadComplete={onUploadComplete} knowledgeBase={activeKB || "local"}>
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-muted/50">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </UploadDialog>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" disabled={selectedKBs.length > 1}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Reset {activeKB ? `"${activeKB}"` : "System"}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will delete {activeKB ? "all documents and vectors in this Knowledge Base" : "ALL documents and vectors across all Knowledge Bases"}. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleResetSystem} className="bg-destructive hover:bg-destructive/90">
                                        Reset
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 bg-background"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-3 space-y-2">
                    {isLoading ? (
                        <div className="text-center py-10 text-muted-foreground">
                            Loading documents...
                        </div>
                    ) : filteredDocuments.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground text-sm">
                            {documents.length === 0 ? "No documents found" : "No matching files"}
                        </div>
                    ) : (
                        filteredDocuments.map((doc) => (
                            <div
                                key={doc.file_id}
                                onClick={() => onSelectFile(doc.file_id)}
                                className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border hover:bg-accent hover:text-accent-foreground group",
                                    selectedFile === doc.file_id ? "bg-accent border-primary/50" : "bg-card border-transparent"
                                )}
                            >
                                <div className="mt-1 bg-primary/10 p-2 rounded-md shrink-0">
                                    <File className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate pr-2" title={doc.filename}>
                                        {doc.filename}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                        <span>{(doc.file_size || doc.file_info?.size) ? `${((doc.file_size || doc.file_info?.size) / 1024).toFixed(1)} KB` : 'Unknown size'}</span>
                                        <span>•</span>
                                        <span className="capitalize">{doc.status || "indexed"}</span>
                                    </div>
                                    {doc.knowledge_base && (
                                        <div className="mt-1">
                                            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">
                                                {doc.knowledge_base}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                    onClick={(e) => handleDeleteFile(e, doc)}
                                    title="Delete file"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
