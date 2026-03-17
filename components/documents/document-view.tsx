"use client";

import { useState, useEffect, useCallback } from "react";
import { DocumentList, DocumentInfo } from "./document-list";
import { DocumentDetail } from "./document-detail";
import { toast } from "sonner";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useKB } from "@/components/kb-context";

export function DocumentView() {
    const [documents, setDocuments] = useState<DocumentInfo[]>([]);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { selectedKBs } = useKB();

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            // If exactly one KB is selected, filter by it. Otherwise fetch all.
            const kbParam = selectedKBs.length === 1 ? `?knowledge_base=${selectedKBs[0]}` : "";
            const res = await fetch(`${apiUrl}/api/v1/rag/files${kbParam}`);

            if (!res.ok) throw new Error("Failed to fetch files");

            const data = await res.json();
            if (data.success) {
                setDocuments(data.data);
            } else {
                toast.error("Failed to load documents");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load documents");
        } finally {
            setIsLoading(false);
        }
    }, [selectedKBs]);

    useEffect(() => {
        fetchDocuments();
        setSelectedFileName(null);
    }, [fetchDocuments]); // fetchDocuments depends on selectedKBs, so this triggers on change

    const selectedDocument = documents.find(d => d.file_id === selectedFileName) || null;

    return (
        <div className="h-full bg-background w-full">
            <ResizablePanelGroup orientation="horizontal">
                <ResizablePanel minSize={30}>
                    <DocumentList
                        documents={documents}
                        selectedFile={selectedFileName}
                        onSelectFile={setSelectedFileName}
                        onUploadComplete={fetchDocuments}
                        isLoading={isLoading}
                    />
                </ResizablePanel>

                <ResizableHandle />

                <ResizablePanel minSize={40}>
                    {selectedDocument ? (
                        <DocumentDetail
                            document={selectedDocument}
                            onBack={() => setSelectedFileName(null)}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/5">
                            <div className="text-center">
                                <h3 className="font-medium mb-1">Select a document</h3>
                                <p className="text-sm">View details, chunks, and content</p>
                            </div>
                        </div>
                    )}
                </ResizablePanel>
            </ResizablePanelGroup>
        </div >
    );
}
