"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import type { ChatShellView } from "./chat-sidebar";

type ChatShellContextValue = {
    view: ChatShellView;
    setView: (v: ChatShellView) => void;
    chatTitle: string;
    setChatTitle: (t: string) => void;
    chatSessionId: string;
    sessions: { id: string; title: string; updatedAt: number }[];
    newChat: () => void;
    loadChat: (id: string) => void;
    deleteChat: (id: string) => void;
    updateSessionTitle: (id: string, title: string) => void;
};

const ChatShellContext = createContext<ChatShellContextValue | null>(null);

export function ChatShellProvider({ children }: { children: ReactNode }) {
    const [view, setView] = useState<ChatShellView>("chat");
    const [chatTitle, setChatTitle] = useState("New chat");
    const [sessions, setSessions] = useState<{ id: string; title: string; updatedAt: number }[]>([]);
    const [chatSessionId, setChatSessionId] = useState<string>("");

    const newChat = useCallback(() => {
        const id = Date.now().toString();
        const newSession = { id, title: "New chat", updatedAt: Date.now() };
        setSessions((prev) => [newSession, ...prev]);
        setChatSessionId(id);
        setChatTitle("New chat");
        setView("chat");
    }, []);

    // Initialize sessions from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem("mot_chat_sessions");
        let parsed: any[] = [];
        if (stored) {
            try {
                parsed = JSON.parse(stored);
                if (!Array.isArray(parsed)) {
                    parsed = [];
                }
            } catch (e) {
                console.error("Failed to parse chat sessions", e);
            }
        }

        // Clean up empty sessions
        parsed = parsed.filter(session => {
            const history = localStorage.getItem(`mot_chat_history_${session.id}`);
            if (!history) return false;
            try {
                const parsedHistory = JSON.parse(history);
                return Array.isArray(parsedHistory) && parsedHistory.length > 0;
            } catch {
                return false;
            }
        });

        if (parsed.length > 0) {
            setSessions(parsed);
        }
        
        // Always start with a new chat on refresh
        newChat();
    }, [newChat]);

    // Persist sessions to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("mot_chat_sessions", JSON.stringify(sessions));
    }, [sessions]);


    const loadChat = useCallback((id: string) => {
        const session = sessions.find((s) => s.id === id);
        if (session) {
            setChatSessionId(id);
            setChatTitle(session.title);
            setView("chat");
        }
    }, [sessions]);

    const deleteChat = useCallback((id: string) => {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        localStorage.removeItem("mot_chat_history_" + id);
        if (id === chatSessionId) {
            if (sessions.length > 1) {
                const next = sessions.find((s) => s.id !== id);
                if (next) loadChat(next.id);
            } else {
                newChat();
            }
        }
    }, [chatSessionId, sessions, loadChat, newChat]);

    const updateSessionTitle = useCallback((id: string, title: string) => {
        setSessions((prev) =>
            prev.map((s) =>
                s.id === id ? { ...s, title, updatedAt: Date.now() } : s
            )
        );
        if (id === chatSessionId) setChatTitle(title);
    }, [chatSessionId]);

    return (
        <ChatShellContext.Provider
            value={{
                view,
                setView,
                chatTitle,
                setChatTitle,
                chatSessionId,
                sessions,
                newChat,
                loadChat,
                deleteChat,
                updateSessionTitle,
            }}
        >
            {children}
        </ChatShellContext.Provider>
    );
}

export function useChatShell() {
    const ctx = useContext(ChatShellContext);
    if (!ctx) {
        throw new Error("useChatShell must be used within ChatShellProvider");
    }
    return ctx;
}
