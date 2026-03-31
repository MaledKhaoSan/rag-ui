"use client";

import {
    createContext,
    useCallback,
    useContext,
    useState,
    type ReactNode,
} from "react";
import type { ChatShellView } from "./chat-sidebar";

type ChatShellContextValue = {
    view: ChatShellView;
    setView: (v: ChatShellView) => void;
    chatTitle: string;
    setChatTitle: (t: string) => void;
    chatSessionKey: number;
    newChat: () => void;
};

const ChatShellContext = createContext<ChatShellContextValue | null>(null);

export function ChatShellProvider({ children }: { children: ReactNode }) {
    const [view, setView] = useState<ChatShellView>("chat");
    const [chatTitle, setChatTitle] = useState("New chat");
    const [chatSessionKey, setChatSessionKey] = useState(0);

    const newChat = useCallback(() => {
        setChatSessionKey((k) => k + 1);
        setChatTitle("New chat");
        setView("chat");
    }, []);

    return (
        <ChatShellContext.Provider
            value={{
                view,
                setView,
                chatTitle,
                setChatTitle,
                chatSessionKey,
                newChat,
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
