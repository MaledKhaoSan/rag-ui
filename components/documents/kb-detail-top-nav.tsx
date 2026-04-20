"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
    ArrowLeft,
    FileStack,
    FolderOpen,
    HardDrive,
    LayoutGrid,
    Loader2,
    RefreshCw,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useKB } from "@/components/kb-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatKbTitle(name: string) {
    return name
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

function chunkTotal(kb: {
    parent_points_count?: number;
    child_points_count?: number;
    chunks?: number;
}) {
    if (typeof kb.chunks === "number") return kb.chunks;
    return (kb.parent_points_count ?? 0) + (kb.child_points_count ?? 0);
}

function estimateSizeGb(chunks: number) {
    if (chunks <= 0) return 0;
    return (chunks * 2.2) / (1024 * 1024);
}

function vectorCollectionsCount(kb: {
    parent_collection?: string;
    child_collection?: string;
}) {
    let n = 0;
    if (kb.parent_collection?.trim()) n += 1;
    if (kb.child_collection?.trim()) n += 1;
    return n;
}

function KbMetricCard({
    label,
    value,
    icon: Icon,
    iconBoxClass,
    accentClass,
}: {
    label: string;
    value: string;
    icon: LucideIcon;
    iconBoxClass: string;
    accentClass: string;
}) {
    return (
        <div
            className={cn(
                "flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-sm sm:px-4",
                accentClass
            )}
        >
            <div
                className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12",
                    iconBoxClass
                )}
            >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                    {label}
                </p>
                <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-foreground sm:text-xl">
                    {value}
                </p>
            </div>
        </div>
    );
}

export function KbDetailTopNav({
    kbName,
    onBack,
    className,
}: {
    kbName: string;
    onBack: () => void;
    className?: string;
}) {
    const { knowledgeBases, deleteKB, refreshKBs, isLoading } = useKB();
    const kb = knowledgeBases.find((k) => k.name === kbName);
    const [deleting, setDeleting] = useState(false);

    const chunks = kb ? chunkTotal(kb) : 0;
    const filesEst = kb
        ? typeof kb.files === "number"
            ? kb.files
            : Math.max(0, Math.round(chunks * 0.08 + 2))
        : 0;
    const sizeGb =
        kb && typeof kb.storage === "number"
            ? kb.storage
            : estimateSizeGb(chunks);
    const collectionsN = kb ? vectorCollectionsCount(kb) : 0;

    const storageDisplay =
        sizeGb === 0 && chunks === 0
            ? "—"
            : sizeGb < 0.01
                ? "<0.01 GB"
                : `${sizeGb.toFixed(1)} GB`;

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const ok = await deleteKB(kbName);
            if (ok) {
                toast.success(`ลบ "${kbName}" แล้ว`);
                onBack();
            } else {
                toast.error("ลบคอลเลกชันไม่สำเร็จ");
            }
        } finally {
            setDeleting(false);
        }
    };

    return (
        <header
            className={cn(
                "shrink-0 border-b border-border bg-card/90 px-4! py-4 backdrop-blur-sm dark:bg-card/60 sm:px-6 sm:py-5",
                className
            )}
            aria-label="รายละเอียดฐานความรู้"
        >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="-ml-2 h-9 w-fit shrink-0 gap-1 text-muted-foreground hover:text-foreground sm:-ml-1"
                    onClick={onBack}
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="max-w-[200px] truncate sm:max-w-none">
                        ฐานความรู้ทั้งหมด
                    </span>
                </Button>

                {kb && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5"
                            onClick={() =>
                                void refreshKBs().then(() =>
                                    toast.success("รีเฟรชข้อมูลแล้ว")
                                )
                            }
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">รีเฟรช</span>
                        </Button>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                                    disabled={deleting}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">
                                        ลบคอลเลกชัน
                                    </span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        ลบ &quot;{kbName}&quot;?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        จะลบเวกเตอร์และข้อมูลที่เก็บของฐานความรู้นี้
                                        ไม่สามารถยกเลิกได้
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-destructive hover:bg-destructive/90"
                                        onClick={() => void handleDelete()}
                                    >
                                        ลบ
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </div>

            <div className="mt-4">
                {isLoading && !kb ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-6 w-6 shrink-0 animate-spin" />
                        <span className="text-sm">กำลังโหลดฐานความรู้…</span>
                    </div>
                ) : !kb ? (
                    <p className="text-sm text-muted-foreground">
                        ไม่พบคอลเลกชันนี้
                    </p>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-2 gap-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                ฐานความรู้
                            </p>
                            <Badge
                                variant="secondary"
                                className="shrink-0 rounded-full text-[10px] font-normal sm:text-xs"
                            >
                                {chunks > 0 ? "ใช้งาน" : "ว่าง"}
                            </Badge>
                        </div>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            {formatKbTitle(kb.name)}
                        </h1>

                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
                            <KbMetricCard
                                label="พื้นที่โดยประมาณ"
                                value={storageDisplay}
                                icon={HardDrive}
                                iconBoxClass="bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"
                                accentClass="border-t-[3px] border-t-sky-500/35 dark:border-t-sky-500/45"
                            />
                            <KbMetricCard
                                label="คอลเลกชันเวกเตอร์"
                                value={
                                    collectionsN > 0
                                        ? collectionsN.toLocaleString()
                                        : "—"
                                }
                                icon={FolderOpen}
                                iconBoxClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                                accentClass="border-t-[3px] border-t-emerald-500/35 dark:border-t-emerald-500/45"
                            />
                            <KbMetricCard
                                label="ไฟล์โดยประมาณ"
                                value={
                                    chunks === 0
                                        ? "—"
                                        : `~${filesEst.toLocaleString()}`
                                }
                                icon={FileStack}
                                iconBoxClass="bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                                accentClass="border-t-[3px] border-t-rose-500/30 dark:border-t-rose-500/45"
                            />
                            <KbMetricCard
                                label="ชิ้นข้อมูล (chunks)"
                                value={
                                    chunks === 0
                                        ? "0"
                                        : chunks.toLocaleString()
                                }
                                icon={LayoutGrid}
                                iconBoxClass="bg-amber-100 text-amber-700 dark:bg-amber-950/45 dark:text-amber-400"
                                accentClass="border-t-[3px] border-t-amber-500/35 dark:border-t-amber-500/45"
                            />
                        </div>
                    </>
                )}
            </div>
        </header>
    );
}
