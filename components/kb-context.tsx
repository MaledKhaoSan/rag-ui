"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ragUrl } from "@/lib/rag-api";

/** Dashboard totals from GET /knowledge-bases `summary` (when present). */
export interface KBSummary {
    total_storage: number;
    total_knowledge_bases: number;
    total_files: number;
    total_chunks: number;
}

export interface KnowledgeBase {
    name: string;
    parent_collection: string;
    child_collection: string;
    /** Legacy: Qdrant point counts */
    parent_points_count?: number;
    child_points_count?: number;
    /** New API: per-KB metrics (storage in GB, file/chunk counts) */
    storage?: number;
    files?: number;
    chunks?: number;
}

function parseKBSummary(raw: unknown): KBSummary | null {
    if (!raw || typeof raw !== "object") return null;
    const s = raw as Record<string, unknown>;
    return {
        total_storage: Number(s.total_storage ?? 0),
        total_knowledge_bases: Number(s.total_knowledge_bases ?? 0),
        total_files: Number(s.total_files ?? 0),
        total_chunks: Number(s.total_chunks ?? 0),
    };
}

function mapApiKnowledgeBaseRow(row: unknown): KnowledgeBase | null {
    if (!row || typeof row !== "object") return null;
    const r = row as Record<string, unknown>;
    const name = String(r.name ?? "").trim();
    if (!name) return null;
    return {
        name,
        parent_collection: String(r.parent_collection ?? ""),
        child_collection: String(r.child_collection ?? ""),
        parent_points_count:
            typeof r.parent_points_count === "number"
                ? r.parent_points_count
                : undefined,
        child_points_count:
            typeof r.child_points_count === "number"
                ? r.child_points_count
                : undefined,
        storage: typeof r.storage === "number" ? r.storage : undefined,
        files: typeof r.files === "number" ? r.files : undefined,
        chunks: typeof r.chunks === "number" ? r.chunks : undefined,
    };
}

function mapApiKnowledgeBaseList(rows: unknown): KnowledgeBase[] {
    if (!Array.isArray(rows)) return [];
    const out: KnowledgeBase[] = [];
    for (const row of rows) {
        const kb = mapApiKnowledgeBaseRow(row);
        if (kb) out.push(kb);
    }
    return out;
}

interface KBContextType {
    knowledgeBases: KnowledgeBase[];
    /** Server summary; null if API omitted `summary` or request failed */
    kbSummary: KBSummary | null;
    selectedKBs: string[];
    setSelectedKBs: (kbs: string[]) => void;
    refreshKBs: () => Promise<void>;
    isLoading: boolean;
    createKB: (name: string) => Promise<boolean>;
    deleteKB: (name: string) => Promise<boolean>;
}

const KBContext = createContext<KBContextType | null>(null);

export function useKB() {
    const ctx = useContext(KBContext);
    if (!ctx) throw new Error("useKB must be used within KBProvider");
    return ctx;
}

export function KBProvider({ children }: { children: ReactNode }) {
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
    const [kbSummary, setKbSummary] = useState<KBSummary | null>(null);
    const [selectedKBs, setSelectedKBs] = useState<string[]>([]); // Empty means ALL
    const [isLoading, setIsLoading] = useState(true);

    const refreshKBs = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(ragUrl("/knowledge-bases"));
            const data = await res.json();
            if (data.success) {
                setKnowledgeBases(mapApiKnowledgeBaseList(data.knowledge_bases));
                setKbSummary(
                    data.summary != null ? parseKBSummary(data.summary) : null
                );
            } else {
                setKbSummary(null);
            }
        } catch (e) {
            console.error("Failed to fetch knowledge bases:", e);
            setKbSummary(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createKB = useCallback(async (name: string): Promise<boolean> => {
        try {
            const res = await fetch(ragUrl("/knowledge-bases"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            const data = await res.json();
            if (data.success) {
                await refreshKBs();
                setSelectedKBs([name]);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Failed to create KB:", e);
            return false;
        }
    }, [refreshKBs]);

    const deleteKB = useCallback(async (name: string): Promise<boolean> => {
        try {
            const res = await fetch(
                ragUrl(`/knowledge-bases/${encodeURIComponent(name)}`),
                { method: "DELETE" }
            );
            const data = await res.json();
            if (data.success) {
                await refreshKBs();
                // If deleted KB was selected, remove it
                setSelectedKBs(prev => prev.filter(kb => kb !== name));
                return true;
            }
            return false;
        } catch (e) {
            console.error("Failed to delete KB:", e);
            return false;
        }
    }, [refreshKBs]);

    useEffect(() => {
        refreshKBs();
    }, [refreshKBs]);

    return (
        <KBContext.Provider
            value={{
                knowledgeBases,
                kbSummary,
                selectedKBs,
                setSelectedKBs,
                refreshKBs,
                isLoading,
                createKB,
                deleteKB,
            }}
        >
            {children}
        </KBContext.Provider>
    );
}
