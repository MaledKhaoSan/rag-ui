"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatView } from "@/components/chat/chat-view";
import { DocumentView } from "@/components/documents/document-view";
import { useChatShell } from "@/components/layout/chat-shell-context";

function ChatPageContent() {
    const { view, setView, setChatTitle, chatSessionKey } = useChatShell();
    const searchParams = useSearchParams();
    const viewParam = searchParams.get("view");

    useEffect(() => {
        if (viewParam === "documents") {
            setView("documents");
        }
    }, [viewParam, setView]);

    return (
        <>
            {view === "chat" && (
                <ChatView
                    key={chatSessionKey}
                    onChatTitleChange={setChatTitle}
                />
            )}
            {view === "documents" && <DocumentView />}
        </>
    );
}

export default function Page() {
    return (
        <Suspense fallback={null}>
            <ChatPageContent />
        </Suspense>
    );
}
