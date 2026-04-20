"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DocumentList, type DocumentInfo } from "./document-list";
import { KnowledgeBasesPanel } from "./knowledge-bases-panel";
import { KbDetailTopNav } from "./kb-detail-top-nav";
import { toast } from "sonner";
import { useKB } from "@/components/kb-context";
import { listAllKnowledgeBaseFiles } from "@/lib/rag-api";
import { mapApiFileListToDocuments } from "@/lib/map-api-file-to-document";

function DocumentViewInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const viewParam = searchParams.get("view");
    const kbParam = searchParams.get("kb");

    const [documents, setDocuments] = useState<DocumentInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [phase, setPhase] = useState<"browse" | "collection">("browse");
    const [openedKb, setOpenedKb] = useState<string | null>(null);

    const { selectedKBs, setSelectedKBs, knowledgeBases } = useKB();

    const fetchDocuments = useCallback(async () => {
        const kbName =
            phase === "collection" && openedKb
                ? openedKb
                : selectedKBs.length === 1
                    ? selectedKBs[0]
                    : null;

        if (!kbName) {
            setDocuments([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const rawList = await listAllKnowledgeBaseFiles(kbName);
            setDocuments(mapApiFileListToDocuments(rawList, kbName));
        } catch (error) {
            console.error(error);
            toast.error("Failed to load documents");
            setDocuments([]);
        } finally {
            setIsLoading(false);
        }
    }, [phase, openedKb, selectedKBs]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    useEffect(() => {
        if (viewParam === "documents" && kbParam) {
            setOpenedKb(kbParam);
            setSelectedKBs([kbParam]);
            setPhase("collection");
        }
    }, [viewParam, kbParam, setSelectedKBs]);

    const openCollection = useCallback(
        (name: string) => {
            setOpenedKb(name);
            setSelectedKBs([name]);
            setPhase("collection");
        },
        [setSelectedKBs]
    );

    const closeCollection = useCallback(() => {
        setOpenedKb(null);
        setSelectedKBs([]);
        setPhase("browse");
    }, [setSelectedKBs]);

    useEffect(() => {
        if (
            phase === "collection" &&
            openedKb &&
            !knowledgeBases.some((k) => k.name === openedKb)
        ) {
            closeCollection();
        }
    }, [knowledgeBases, openedKb, phase, closeCollection]);

    const openFileDetail = useCallback(
        (fileId: string) => {
            const doc = documents.find((d) => d.file_id === fileId);
            const kb =
                doc?.knowledge_base ||
                openedKb ||
                (selectedKBs.length === 1 ? selectedKBs[0] : "") ||
                "local";
            router.push(
                `/chat/documents/${encodeURIComponent(fileId)}?kb=${encodeURIComponent(kb)}`
            );
        },
        [documents, openedKb, router, selectedKBs]
    );

    if (phase === "browse") {
        return (
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
                <KnowledgeBasesPanel
                    className="min-h-0 flex-1 border-b border-border"
                    variant="full"
                    onOpenCollection={openCollection}
                    onCollectionDeleted={(name) => {
                        if (openedKb === name) closeCollection();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background px-8">
            <KbDetailTopNav kbName={openedKb!} onBack={closeCollection} />
            <DocumentList
                documents={documents}
                selectedFile={null}
                onSelectFile={(id) => {
                    if (id) openFileDetail(id);
                }}
                onUploadComplete={fetchDocuments}
                isLoading={isLoading}
            />

            {/* <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t border-border bg-muted/15">
                <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden md:px-12">
                    <DocumentList
                        documents={documents}
                        selectedFile={null}
                        onSelectFile={(id) => {
                            if (id) openFileDetail(id);
                        }}
                        onUploadComplete={fetchDocuments}
                        isLoading={isLoading}
                    />
                </div>
            </div> */}
        </div>
    );
}

export function DocumentView() {
    return (
        <Suspense fallback={null}>
            <DocumentViewInner />
        </Suspense>
    );
}
