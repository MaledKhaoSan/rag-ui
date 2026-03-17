"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface KnowledgeBase {
    name: string;
    parent_collection: string;
    child_collection: string;
    parent_points_count: number;
    child_points_count: number;
}

interface KBContextType {
    knowledgeBases: KnowledgeBase[];
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
    const [selectedKBs, setSelectedKBs] = useState<string[]>([]); // Empty means ALL
    const [isLoading, setIsLoading] = useState(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const refreshKBs = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/v1/rag/knowledge-bases`);
            const data = await res.json();
            if (data.success) {
                setKnowledgeBases(data.knowledge_bases || []);
            }
        } catch (e) {
            console.error("Failed to fetch knowledge bases:", e);
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl]);

    const createKB = useCallback(async (name: string): Promise<boolean> => {
        try {
            const res = await fetch(`${apiUrl}/api/v1/rag/knowledge-bases`, {
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
    }, [apiUrl, refreshKBs]);

    const deleteKB = useCallback(async (name: string): Promise<boolean> => {
        try {
            const res = await fetch(`${apiUrl}/api/v1/rag/knowledge-bases/${name}`, {
                method: "DELETE",
            });
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
    }, [apiUrl, refreshKBs]);

    useEffect(() => {
        refreshKBs();
    }, [refreshKBs]);

    return (
        <KBContext.Provider value={{ knowledgeBases, selectedKBs, setSelectedKBs, refreshKBs, isLoading, createKB, deleteKB }}>
            {children}
        </KBContext.Provider>
    );
}
