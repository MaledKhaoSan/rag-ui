"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    Home,
    LayoutDashboard,
    LineChart,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
    Plus,
    Search as SearchIcon,
    X,
    MessageSquare,
} from "lucide-react";
import { clearMockAuthSession } from "@/lib/mock-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarNavItem } from "./sidebar-nav-item";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ChatShellView = "chat" | "documents";

export interface ChatSidebarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onNewChat: () => void;
    view: ChatShellView;
    onViewChange: (v: ChatShellView) => void;
    /** Close mobile sheet */
    onClose?: () => void;
}

export function ChatSidebar({
    isCollapsed,
    onToggleCollapse,
    onNewChat,
    view,
    onViewChange,
    onClose,
}: ChatSidebarProps) {
    const router = useRouter();

    const widthClass = isCollapsed ? "w-[72px]" : "w-[280px]";

    const afterNav = () => onClose?.();

    return (
        <aside
            className={cn(
                "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar",
                widthClass
            )}
            aria-label="Sidebar"
        >
            <div
                className={cn(
                    "flex items-center py-3",
                    isCollapsed ? "justify-center px-2" : "justify-between px-4"
                )}
            >
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-200 bg-card shadow-sm ring-2 ring-primary/10">
                            <Image
                                src="/md-logo.png"
                                alt="ตรากรมเจ้าท่า"
                                width={36}
                                height={36}
                                className="h-full w-full object-contain p-0.5"
                            />
                        </div>
                        <span className="text-lg font-semibold text-primary">
                            กรมเจ้าท่า
                        </span>
                    </div>
                )}
                <div className="flex items-center gap-1">
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            aria-label="Close sidebar"
                            className="h-10 w-10 hover:bg-sidebar-accent md:hidden"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleCollapse}
                        aria-label={
                            isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                        }
                        className="hidden h-10 w-10 hover:bg-sidebar-accent hover:text-sidebar-foreground md:inline-flex"
                    >
                        {isCollapsed ? (
                            <PanelLeftOpen className="h-5 w-5" />
                        ) : (
                            <PanelLeftClose className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>

            <div className={cn("pt-3", isCollapsed ? "px-2" : "px-4")}>
                {isCollapsed ? (
                    <div className="flex flex-col items-center gap-2">
                        <Button
                            className="h-10 w-10 p-0"
                            aria-label="New chat"
                            onClick={() => {
                                onNewChat();
                                afterNav();
                            }}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            className="h-10 w-10 border border-primary/20 bg-sidebar p-0 text-muted-foreground hover:bg-sidebar-accent"
                            aria-label="Search"
                            onClick={() =>
                                toast.message("Search", {
                                    description: "Use the main chat search soon.",
                                })
                            }
                        >
                            <SearchIcon
                                className="h-5 w-5"
                                strokeWidth={1.5}
                            />
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-nowrap items-center gap-2">
                        <Button
                            className="h-10 flex-1 justify-center"
                            aria-label="New chat"
                            onClick={() => {
                                onNewChat();
                                afterNav();
                            }}
                        >
                            <Plus className="h-4 w-4" />
                            <span className="ml-2 whitespace-nowrap">
                                New chat
                            </span>
                        </Button>
                        <Button
                            variant="ghost"
                            className="h-10 w-10 shrink-0 rounded-lg border border-primary/20 bg-sidebar p-0 text-muted-foreground hover:bg-sidebar-accent focus-visible:ring-0"
                            aria-label="Search"
                            onClick={() =>
                                toast.message("Search", {
                                    description: "Keyboard focus moves to chat shortly.",
                                })
                            }
                        >
                            <SearchIcon
                                className="h-5 w-5"
                                strokeWidth={1.5}
                            />
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className={cn("py-3", isCollapsed ? "px-2" : "px-4")}>
                    {!isCollapsed && (
                        <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Recent
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    onViewChange("chat");
                                    afterNav();
                                }}
                                className={cn(
                                    "w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                                    view === "chat"
                                        ? "bg-accent text-accent-foreground"
                                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 shrink-0" />
                                    Current conversation
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative mt-auto overflow-hidden border-t border-sidebar-border">
                <div
                    className="pointer-events-none absolute inset-0 bg-[url('/corner.png')] bg-cover bg-right bg-no-repeat opacity-90 dark:opacity-80"
                    aria-hidden
                />
                <div className={cn("relative z-10 p-3", isCollapsed && "p-2")}>
                    <div className="space-y-1">
                        <SidebarNavItem
                            icon={MessageSquare}
                            label="Chat"
                            isCollapsed={isCollapsed}
                            isActive={view === "chat"}
                            onClick={() => {
                                onViewChange("chat");
                                afterNav();
                            }}
                        />
                        <SidebarNavItem
                            icon={LayoutDashboard}
                            label="Admin Panel"
                            isCollapsed={isCollapsed}
                            isActive={view === "documents"}
                            onClick={() => {
                                onViewChange("documents");
                                afterNav();
                            }}
                        />
                        <SidebarNavItem
                            icon={Home}
                            label="Home"
                            isCollapsed={isCollapsed}
                            onClick={() => {
                                router.push("/");
                                afterNav();
                            }}
                        />
                        <SidebarNavItem
                            icon={LineChart}
                            label="Finance"
                            isCollapsed={isCollapsed}
                            onClick={() => {
                                router.push("/finance");
                                afterNav();
                            }}
                        />
                        <SidebarNavItem
                            icon={LogOut}
                            label="Sign out"
                            isCollapsed={isCollapsed}
                            onClick={() => {
                                clearMockAuthSession();
                                afterNav();
                                router.push("/login");
                                router.refresh();
                            }}
                        />

                        <div className={cn(isCollapsed ? "px-2" : "px-2", "mt-3")}>
                            <div
                                className={cn(
                                    "rounded-lg border border-sidebar-border bg-card px-3 py-2 shadow-sm",
                                    isCollapsed && "px-2 py-2"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-9 w-9 shrink-0">
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            G
                                        </AvatarFallback>
                                    </Avatar>
                                    {!isCollapsed && (
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-foreground">
                                                Guest
                                            </div>
                                            <div className="truncate text-xs font-medium text-muted-foreground">
                                                Tester
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
