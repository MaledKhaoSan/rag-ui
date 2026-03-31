import type { ReactNode } from "react";
import { KBProvider } from "@/components/kb-context";
import { ChatShellProvider } from "@/components/layout/chat-shell-context";
import { ChatAppLayout } from "@/components/layout/chat-app-layout";

export default function ChatLayout({ children }: { children: ReactNode }) {
    return (
        <KBProvider>
            <ChatShellProvider>
                <ChatAppLayout>{children}</ChatAppLayout>
            </ChatShellProvider>
        </KBProvider>
    );
}
