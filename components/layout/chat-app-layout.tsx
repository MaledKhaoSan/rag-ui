"use client";

import { useCallback, useState, Suspense, type ReactNode } from "react";
import {
    usePathname,
    useRouter,
    useSearchParams,
} from "next/navigation";
import { Database } from "lucide-react";
import {
    ChatShellHeader,
    ChatSidebar,
    type ChatShellView,
} from "@/components/layout";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MultiSelect } from "@/components/ui/multi-select";
import { useKB } from "@/components/kb-context";
import { useChatShell } from "./chat-shell-context";

function ChatAppLayoutContent({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isDocumentDetail = pathname.startsWith("/chat/documents/");
    const kbOnDetail = searchParams.get("kb") ?? "";

    const { view, setView, chatTitle, chatSessionId, newChat } =
        useChatShell();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const { knowledgeBases, selectedKBs, setSelectedKBs } = useKB();

    const handleNewChat = useCallback(() => {
        newChat();
        setMobileSidebarOpen(false);
    }, [newChat]);

    const kbOptions = knowledgeBases.map((kb) => ({
        label: kb.name,
        value: kb.name,
    }));

    const sidebarView: ChatShellView = isDocumentDetail ? "documents" : view;

    const headerCenterTitle = isDocumentDetail
        ? "รายละเอียดไฟล์"
        : view === "documents"
            ? "Admin Panel"
            : chatTitle;

    const navigateFromDetail = useCallback(
        (next: ChatShellView) => {
            if (next === "documents") {
                const q = kbOnDetail
                    ? `?view=documents&kb=${encodeURIComponent(kbOnDetail)}`
                    : "?view=documents";
                router.push(`/chat${q}`);
                setView("documents");
            } else {
                router.push("/chat");
                setView("chat");
            }
        },
        [kbOnDetail, router, setView]
    );

    const onViewChange = useCallback(
        (next: ChatShellView) => {
            if (isDocumentDetail) {
                navigateFromDetail(next);
            } else {
                setView(next);
            }
            setMobileSidebarOpen(false);
        },
        [isDocumentDetail, navigateFromDetail, setView]
    );

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            <div className="hidden h-full md:flex">
                <ChatSidebar
                    isCollapsed={sidebarCollapsed}
                    onToggleCollapse={() =>
                        setSidebarCollapsed((c) => !c)
                    }
                    onNewChat={handleNewChat}
                    view={sidebarView}
                    onViewChange={onViewChange}
                />
            </div>

            <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                <SheetContent
                    side="left"
                    className="w-[280px] max-w-[85vw] border-r border-sidebar-border p-0 sm:max-w-[280px]"
                >
                    <ChatSidebar
                        isCollapsed={false}
                        onToggleCollapse={() => { }}
                        onNewChat={handleNewChat}
                        view={sidebarView}
                        onViewChange={onViewChange}
                        onClose={() => setMobileSidebarOpen(false)}
                    />
                </SheetContent>
            </Sheet>

            <div className="flex min-w-0 flex-1 flex-col">
                <ChatShellHeader
                    left={{
                        type: "menu",
                        onClick: () => setMobileSidebarOpen(true),
                        ariaLabel: "Open sidebar",
                    }}
                    center={{
                        type: "title",
                        title: headerCenterTitle,
                        dropdown: true,
                    }}
                    notificationCount={3}
                    rightExtras={
                        !isDocumentDetail && view === "chat" ? (
                            <div className="mr-1 flex max-w-[140px] items-center gap-1 rounded-lg border border-border bg-background px-1.5 py-0.5 sm:max-w-[260px] md:max-w-[320px]">
                                <Database className="h-3.5 w-3.5 shrink-0 text-primary" />
                                <MultiSelect
                                    options={kbOptions}
                                    selected={selectedKBs}
                                    onChange={setSelectedKBs}
                                    placeholder="Knowledge bases"
                                    className="h-8 min-h-0 flex-1 border-0 bg-transparent py-1 text-xs shadow-none hover:bg-transparent"
                                />
                            </div>
                        ) : null
                    }
                />

                <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
                    {children}
                </main>

                <div className="shrink-0 border-t border-border px-4 pb-1 pt-1 text-center">
                    <p className="text-xs text-muted-foreground">
                        AI can make mistakes. Consider checking important
                        information.
                    </p>
                </div>
            </div>
        </div>
    );
}

export function ChatAppLayout({ children }: { children: ReactNode }) {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center text-muted-foreground">
                    กำลังโหลด…
                </div>
            }
        >
            <ChatAppLayoutContent>{children}</ChatAppLayoutContent>
        </Suspense>
    );
}
