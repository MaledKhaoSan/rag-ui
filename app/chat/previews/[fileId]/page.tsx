"use client";

import { Suspense, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ragUrl } from "@/lib/rag-api";
import { PreviesCsv } from "../previe_csv";
import { cn } from "@/lib/utils";

function extOf(name: string) {
    const m = (name || "").match(/\.([^.]+)$/);
    return (m?.[1] || "").toLowerCase();
}

function PreviewInner() {
    const params = useParams();
    const sp = useSearchParams();
    const fileId = typeof params.fileId === "string" ? params.fileId : "";
    const kb = sp.get("kb") ?? "local";
    const fileName = sp.get("name") ?? fileId;
    const directUrl = sp.get("url") ?? "";

    const fileUrl = useMemo(() => {
        if (directUrl) return directUrl;
        // Best-guess backend download endpoint. If your API uses a different path,
        // adjust here in one place.
        return ragUrl(
            `/knowledge-bases/${encodeURIComponent(kb)}/files/${encodeURIComponent(fileId)}/download`
        );
    }, [directUrl, kb, fileId]);

    const ext = extOf(fileName);

    if (!fileId) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Missing file id
            </div>
        );
    }

    if (ext === "pdf") {
        return (
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
                <div className="shrink-0 border-b border-border bg-background px-4 py-3">
                    <p className="truncate text-sm font-medium text-foreground">
                        {fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        PDF preview
                    </p>
                </div>
                <div className="min-h-0 flex-1 bg-muted/10 p-3">
                    <iframe
                        title={fileName}
                        src={fileUrl}
                        className={cn(
                            "h-full w-full rounded-lg border border-border bg-background"
                        )}
                    />
                </div>
            </div>
        );
    }

    if (ext === "csv" || ext === "txt" || ["xls", "xlsx", "xlsm"].includes(ext)) {
        return (
            <div className="h-full min-h-0 w-full overflow-hidden bg-background">
                <PreviesCsv fileUrl={fileUrl} fileName={fileName} />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-medium text-foreground">
                Preview not supported
            </p>
            <p className="text-xs text-muted-foreground">
                {fileName}
            </p>
            <a
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
            >
                Download
            </a>
        </div>
    );
}

export default function PreviewPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Loading…
                </div>
            }
        >
            <PreviewInner />
        </Suspense>
    );
}

