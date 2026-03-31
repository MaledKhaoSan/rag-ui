"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import {
    useParams,
    useRouter,
    useSearchParams,
} from "next/navigation";
import { DocumentDetail } from "@/components/documents/document-detail";
import { KbDetailTopNav } from "@/components/documents/kb-detail-top-nav";
import type { DocumentInfo } from "@/components/documents/document-list";
import { toast } from "sonner";
import {
    getKnowledgeBaseFile,
    listKnowledgeBaseNames,
} from "@/lib/rag-api";
import { mapApiFileRowToDocumentInfo } from "@/lib/map-api-file-to-document";

function DocumentFilePageInner() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const fileId = typeof params.fileId === "string" ? params.fileId : "";
    const kb = searchParams.get("kb") ?? "";

    const [document, setDocument] = useState<DocumentInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchDoc = useCallback(async () => {
        if (!fileId) {
            setDocument(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let found: DocumentInfo | null = null;
            if (kb) {
                const raw = await getKnowledgeBaseFile(kb, fileId);
                if (raw) {
                    found = mapApiFileRowToDocumentInfo(raw, kb);
                }
            } else {
                const names = await listKnowledgeBaseNames();
                for (const name of names) {
                    const raw = await getKnowledgeBaseFile(name, fileId);
                    if (raw) {
                        found = mapApiFileRowToDocumentInfo(raw, name);
                        break;
                    }
                }
            }
            setDocument(found);
        } catch (e) {
            console.error(e);
            toast.error("โหลดรายละเอียดไฟล์ไม่สำเร็จ");
            setDocument(null);
        } finally {
            setLoading(false);
        }
    }, [fileId, kb]);

    useEffect(() => {
        fetchDoc();
    }, [fetchDoc]);

    const backToList = () => {
        const q = kb
            ? `?view=documents&kb=${encodeURIComponent(kb)}`
            : "?view=documents";
        router.push(`/chat${q}`);
    };

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
                กำลังโหลด…
            </div>
        );
    }

    if (!document) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
                <p className="text-muted-foreground">ไม่พบไฟล์</p>
                <button
                    type="button"
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    onClick={backToList}
                >
                    กลับไปรายการ
                </button>
            </div>
        );
    }

    const topKb = document.knowledge_base || kb || "local";

    return (
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
            <KbDetailTopNav kbName={topKb} onBack={backToList} />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t border-border bg-muted/15">
                <DocumentDetail document={document} onBack={backToList} />
            </div>
        </div>
    );
}

export default function DocumentFilePage() {
    return (
        <Suspense
            fallback={
                <div className="flex flex-1 items-center justify-center text-muted-foreground">
                    กำลังโหลด…
                </div>
            }
        >
            <DocumentFilePageInner />
        </Suspense>
    );
}



