import type { DocumentInfo } from "@/components/documents/document-list";

/**
 * Map backend file list / detail rows to {@link DocumentInfo}.
 * Supports `file_name` + `file_size` (your API) and legacy `filename` fields.
 */
export function mapApiFileRowToDocumentInfo(
    raw: Record<string, unknown>,
    knowledgeBase: string
): DocumentInfo {
    const file_id = String(raw.file_id ?? raw.fileId ?? "");
    const filename = String(
        raw.filename ?? raw.file_name ?? raw.fileName ?? ""
    );
    const file_size =
        typeof raw.file_size === "number"
            ? raw.file_size
            : typeof raw.fileSize === "number"
              ? raw.fileSize
              : undefined;
    const upload_date =
        typeof raw.upload_date === "string"
            ? raw.upload_date
            : typeof raw.uploadDate === "string"
              ? raw.uploadDate
              : typeof raw.created_at === "string"
                ? raw.created_at
                : "";
    const s = raw.status;
    const status: DocumentInfo["status"] =
        s === "pending" || s === "failed" || s === "indexed" ? s : "indexed";
    const kb = String(
        raw.knowledge_base ?? raw.knowledgeBase ?? knowledgeBase
    );

    return {
        ...raw,
        file_id,
        filename,
        file_size,
        upload_date,
        status,
        knowledge_base: kb,
    };
}

export function mapApiFileListToDocuments(
    items: unknown[],
    knowledgeBase: string
): DocumentInfo[] {
    return items.map((item) => {
        if (item && typeof item === "object") {
            return mapApiFileRowToDocumentInfo(
                item as Record<string, unknown>,
                knowledgeBase
            );
        }
        return {
            file_id: "",
            filename: "",
            upload_date: "",
            status: "indexed" as const,
            knowledge_base: knowledgeBase,
        };
    });
}
