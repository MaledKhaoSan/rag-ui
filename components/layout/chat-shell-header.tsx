"use client";

import * as React from "react";
import { Bell, ChevronDown, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeaderLeft =
    | { type: "label"; text: string }
    | { type: "menu"; onClick: () => void; ariaLabel?: string };

type HeaderCenter =
    | {
        type: "title";
        title: string;
        subtitle?: string;
        dropdown?: boolean;
    }
    | { type: "custom"; node: React.ReactNode };

export interface ChatShellHeaderProps {
    left: HeaderLeft;
    center?: HeaderCenter;
    notificationCount?: number;
    /** Insert controls before theme / notifications (e.g. mobile KB strip) */
    rightExtras?: React.ReactNode;
    className?: string;
}

export function ChatShellHeader({
    left,
    center,
    notificationCount = 0,
    rightExtras,
    className,
}: ChatShellHeaderProps) {
    const [dark, setDark] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        setDark(document.documentElement.classList.contains("dark"));
    }, []);

    const toggleTheme = () => {
        document.documentElement.classList.toggle("dark");
        setDark((d) => !d);
    };

    return (
        <header
            className={cn("border-b border-border bg-background", className)}
            role="banner"
        >
            <div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
                <div className="flex min-w-0 shrink-0 items-center gap-3 sm:gap-4">
                    {left.type === "menu" && (
                        <>
                            <button
                                type="button"
                                onClick={left.onClick}
                                className="min-h-10 min-w-10 rounded-md p-2 hover:bg-accent md:hidden"
                                aria-label={left.ariaLabel ?? "Open menu"}
                            >
                                <Menu className="h-5 w-5 text-muted-foreground" />
                            </button>

                        </>
                    )}

                    {left.type === "label" && (
                        <div className="text-lg font-semibold text-foreground">
                            {left.text}
                        </div>
                    )}
                </div>

                <div className="flex min-w-0 flex-1 items-center justify-center px-2">
                    {center?.type === "title" && (
                        <button
                            type="button"
                            className="flex max-w-full items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-accent"
                        >
                            <span className="truncate text-base font-semibold text-foreground">
                                {center.title}
                            </span>
                        </button>
                    )}
                    {center?.type === "custom" && center.node}
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
                    {rightExtras}
                    {mounted && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-lg border border-border text-foreground hover:bg-accent"
                            onClick={toggleTheme}
                            aria-label={
                                dark
                                    ? "Switch to light mode"
                                    : "Switch to dark mode"
                            }
                        >
                            {dark ? (
                                <Sun className="h-5 w-5" />
                            ) : (
                                <Moon className="h-5 w-5" />
                            )}
                        </Button>
                    )}

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 rounded-lg border border-border text-foreground hover:bg-accent"
                        aria-label={
                            notificationCount
                                ? `Notifications (${notificationCount})`
                                : "Notifications"
                        }
                    >
                        <Bell className="h-5 w-5" />
                        {notificationCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground ring-2 ring-background">
                                {notificationCount > 99
                                    ? "99+"
                                    : notificationCount}
                            </span>
                        )}
                    </Button>
                </div>
            </div>
        </header>
    );
}
