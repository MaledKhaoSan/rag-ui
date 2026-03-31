"use client";

import React, { useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

interface SidebarNavItemProps {
    icon: LucideIcon;
    label: string;
    isCollapsed?: boolean;
    onClick?: () => void;
    isActive?: boolean;
    hasSubMenu?: boolean;
}

export function SidebarNavItem({
    icon: Icon,
    label,
    isCollapsed = false,
    onClick,
    isActive = false,
    hasSubMenu = false,
}: SidebarNavItemProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={onClick}
                onMouseEnter={() => isCollapsed && setShowTooltip(true)}
                onMouseLeave={() => isCollapsed && setShowTooltip(false)}
                className={[
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer",
                    isCollapsed ? "justify-center" : "",
                    isActive
                        ? "bg-white text-accent-foreground hover:bg-white/90 border border-blue-400/50 cursor-none"
                        : "text-foreground hover:bg-blue-200/40",
                ].join(" ")}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
            >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {!isCollapsed && <span className="truncate">{label}</span>}
                {hasSubMenu && !isCollapsed && (
                    <ChevronDown className="ml-auto h-4 w-4" aria-hidden="true" />
                )}
            </button>

            {isCollapsed && showTooltip && (
                <div
                    className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
                    role="tooltip"
                >
                    {label}
                </div>
            )}
        </div>
    );
}
