/**
 * RAG HTTP API helpers (FastAPI router mounted at /api/v1/rag).
 */

export function getRagApiRoot(): string {
    const base = (
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
    ).replace(/\/$/, "");
    return `${base}/api/v1/rag`;
}

export function ragUrl(path: string): string {
    const root = getRagApiRoot();
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${root}${p}`;
}

/** Normalize list-files response bodies from the backend. */
export function normalizeFilesListPayload(json: unknown): unknown[] {
    if (!json || typeof json !== "object") return [];
    if (Array.isArray(json)) return json;
    const j = json as Record<string, unknown>;
    if (Array.isArray(j.data)) return j.data as unknown[];
    const data = j.data as Record<string, unknown> | undefined;
    if (data && typeof data === "object") {
        if (Array.isArray(data.files)) return data.files as unknown[];
        if (Array.isArray(data.items)) return data.items as unknown[];
    }
    if (Array.isArray(j.files)) return j.files as unknown[];
    if (Array.isArray(j.items)) return j.items as unknown[];
    return [];
}

export async function listKnowledgeBaseFilesPage(
    knowledgeBase: string,
    page: number,
    pageSize: number
): Promise<{
    ok: boolean;
    files: unknown[];
    hasMore: boolean;
    raw: Record<string, unknown>;
}> {
    const url = ragUrl(
        `/knowledge-bases/${encodeURIComponent(knowledgeBase)}/files?page=${page}&page_size=${pageSize}`
    );
    const res = await fetch(url);
    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        return { ok: false, files: [], hasMore: false, raw };
    }
    const files = normalizeFilesListPayload(raw);
    const success = raw.success !== false;
    const total = typeof raw.total === "number" ? raw.total : undefined;
    const hasMore =
        total != null
            ? files.length + (page - 1) * pageSize < total
            : files.length >= pageSize;
    return { ok: success, files, hasMore, raw };
}

/** Walk paginated list until a page returns fewer than pageSize rows. */
export async function listAllKnowledgeBaseFiles(
    knowledgeBase: string,
    pageSize = 100,
    maxPages = 50
): Promise<unknown[]> {
    const all: unknown[] = [];
    let page = 1;
    for (let i = 0; i < maxPages; i++) {
        const { ok, files, hasMore, raw } = await listKnowledgeBaseFilesPage(
            knowledgeBase,
            page,
            pageSize
        );
        if (!ok) break;
        all.push(...files);
        if (!hasMore) break;
        if (typeof raw.total === "number" && all.length >= raw.total) break;
        if (files.length < pageSize) break;
        page += 1;
    }
    return all;
}

export async function getKnowledgeBaseFile(
    knowledgeBase: string,
    fileId: string
): Promise<Record<string, unknown> | null> {
    const url = ragUrl(
        `/knowledge-bases/${encodeURIComponent(knowledgeBase)}/files/${encodeURIComponent(fileId)}`
    );
    const res = await fetch(url);
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return null;
    if (json.success === false) return null;
    const doc = json.data ?? json.file;
    if (doc && typeof doc === "object") return doc as Record<string, unknown>;
    return json;
}

export async function deleteKnowledgeBaseFile(
    knowledgeBase: string,
    fileId: string
): Promise<boolean> {
    const url = ragUrl(
        `/knowledge-bases/${encodeURIComponent(knowledgeBase)}/files/${encodeURIComponent(fileId)}`
    );
    const res = await fetch(url, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return res.ok && json.success !== false;
}

/** List KB names from GET /knowledge-bases (shape from your API). */
export async function listKnowledgeBaseNames(): Promise<string[]> {
    const res = await fetch(ragUrl("/knowledge-bases"));
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || data.success === false) return [];
    const list = data.knowledge_bases as unknown[] | undefined;
    if (!Array.isArray(list)) return [];
    return list
        .map((row) =>
            row && typeof row === "object" && "name" in row
                ? String((row as { name: unknown }).name)
                : ""
        )
        .filter(Boolean);
}
