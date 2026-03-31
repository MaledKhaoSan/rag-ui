"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Database,
    FileStack,
    FileText,
    FolderOpen,
    Globe,
    HardDrive,
    LayoutGrid,
    Layers,
    List,
    Loader2,
    MoreVertical,
    Pencil,
    Plus,
    Search,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { KnowledgeBase } from "@/components/kb-context";
import { useKB } from "@/components/kb-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


function hashIndex(s: string, mod: number) {
    let h = 0;
    for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h) % mod;
}

const PAGE_SIZE = 6;

type CategoryFilter = "all" | "docs" | "general";
type StatusFilter = "all" | "active" | "empty" | "processing" | "error";
type SortKey = "newest" | "name-asc" | "name-desc" | "chunks-desc";

function chunkTotal(kb: KnowledgeBase) {
    if (typeof kb.chunks === "number") return kb.chunks;
    return (kb.parent_points_count ?? 0) + (kb.child_points_count ?? 0);
}

function kbFilesCount(kb: KnowledgeBase) {
    if (typeof kb.files === "number") return kb.files;
    const c = chunkTotal(kb);
    return Math.max(0, Math.round(c * 0.08 + 2));
}

function kbStorageGb(kb: KnowledgeBase) {
    if (typeof kb.storage === "number") return kb.storage;
    return estimateSizeGb(chunkTotal(kb));
}

function estimateSizeGb(chunks: number) {
    if (chunks <= 0) return 0;
    return (chunks * 2.2) / (1024 * 1024);
}

function sourcesLabel(name: string) {
    const h = hashIndex(name, 3);
    const opts = ["PDF, DOC, Link", "PDF, Link", "DOC, PDF, Web"];
    return opts[h];
}

function categoryLabel(name: string) {
    const h = hashIndex(name, 4);
    const cats = ["Human Resources", "Engineering", "Finance", "General"];
    return cats[h];
}

function lastSynced(name: string) {
    const h = hashIndex(name, 5);
    const t = [
        "1 day ago",
        "2 hours ago",
        "Just now",
        "Yesterday",
        "3 days ago",
    ];
    return t[h];
}

function cardStatus(
    kb: KnowledgeBase
): "active" | "empty" | "processing" | "error" {
    const n = chunkTotal(kb);
    if (n === 0) {
        const h = hashIndex(kb.name, 10);
        if (h === 0) return "processing";
        if (h === 1) return "error";
        return "empty";
    }
    return "active";
}

export interface KnowledgeBasesPanelProps {
    className?: string;
    /** Full-height scroll (browse landing). Default: compact max-height. */
    variant?: "compact" | "full";
    /** Row/card opens this collection (document drill-in). */
    onOpenCollection?: (name: string) => void;
    /** After a collection is deleted from this panel. */
    onCollectionDeleted?: (name: string) => void;
}

export function KnowledgeBasesPanel({
    className,
    variant = "compact",
    onOpenCollection,
    onCollectionDeleted,
}: KnowledgeBasesPanelProps) {
    const [createOpen, setCreateOpen] = useState(false);
    const [newKBName, setNewKBName] = useState("");
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<CategoryFilter>("all");
    const [status, setStatus] = useState<StatusFilter>("all");
    const [sort, setSort] = useState<SortKey>("newest");
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const {
        knowledgeBases,
        kbSummary,
        selectedKBs,
        setSelectedKBs,
        createKB,
        deleteKB,
        isLoading,
    } = useKB();

    const totals = useMemo(() => {
        if (kbSummary) {
            return {
                collections: kbSummary.total_knowledge_bases,
                chunks: kbSummary.total_chunks,
                storageGb: kbSummary.total_storage,
                filesEstimate: kbSummary.total_files,
            };
        }
        let chunks = 0;
        for (const kb of knowledgeBases) chunks += chunkTotal(kb);
        const gb = estimateSizeGb(chunks);
        return {
            collections: knowledgeBases.length,
            chunks,
            storageGb: gb,
            filesEstimate: Math.max(
                0,
                Math.round(chunks * 0.08 + knowledgeBases.length * 3)
            ),
        };
    }, [kbSummary, knowledgeBases]);

    const filtered = useMemo(() => {
        let rows = [...knowledgeBases];
        const q = search.trim().toLowerCase();
        if (q) {
            rows = rows.filter((kb) => {
                return (
                    kb.name.toLowerCase().includes(q) ||
                    kb.parent_collection?.toLowerCase().includes(q)
                );
            });
        }
        if (category !== "all") {
            rows = rows.filter((kb) => {
                const h = hashIndex(kb.name, 3);
                if (category === "docs") return h === 0 || kb.name.includes("doc");
                return h !== 0;
            });
        }
        if (status !== "all") {
            rows = rows.filter((kb) => cardStatus(kb) === status);
        }
        switch (sort) {
            case "name-asc":
                rows.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "name-desc":
                rows.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case "chunks-desc":
                rows.sort((a, b) => chunkTotal(b) - chunkTotal(a));
                break;
            default:
                break;
        }
        return rows;
    }, [knowledgeBases, search, category, status, sort]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);

    useEffect(() => {
        setPage((p) => Math.min(p, pageCount));
    }, [pageCount]);

    const pageItems = useMemo(() => {
        const start = (safePage - 1) * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE);
    }, [filtered, safePage]);

    const startIdx = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
    const endIdx = Math.min(safePage * PAGE_SIZE, filtered.length);

    const handleCreateKB = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKBName.trim()) return;
        const sanitized = newKBName.trim().toLowerCase().replace(/\s+/g, "_");
        const success = await createKB(sanitized);
        if (success) {
            toast.success(`Collection "${sanitized}" created`);
            setNewKBName("");
            setCreateOpen(false);
            setPage(1);
        } else {
            toast.error("Failed to create collection");
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const removed = deleteTarget;
        const ok = await deleteKB(removed);
        if (ok) {
            toast.success(`Deleted "${removed}"`);
            setDeleteTarget(null);
            setPage(1);
            onCollectionDeleted?.(removed);
        } else {
            toast.error("Failed to delete");
        }
    };

    const toggleSelectKb = (name: string) => {
        if (onOpenCollection) return;
        setSelectedKBs(
            selectedKBs.includes(name)
                ? selectedKBs.filter((k) => k !== name)
                : [...selectedKBs, name]
        );
    };

    const handleOpenKb = (name: string) => {
        if (onOpenCollection) {
            setSelectedKBs([name]);
            onOpenCollection(name);
        } else {
            toggleSelectKb(name);
        }
    };

    const storageLabel =
        totals.storageGb < 0.01 && totals.chunks === 0
            ? "—"
            : `${totals.storageGb.toFixed(totals.storageGb < 1 ? 2 : 1)} GB`;

    return (
        <div
            className={cn(
                "bg-background",
                variant === "full"
                    ? "h-full min-h-0 flex-1 overflow-y-auto"
                    : "max-h-[min(72vh,900px)] overflow-y-auto",
                className
            )}
        >
            <div className="space-y-6 px-4 py-5 sm:px-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        Knowledge Base
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
                        Configure sources and RAG parameters for your AI Agents.
                    </p>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard
                        icon={<HardDrive className="h-7 w-5 text-primary" />}
                        iconBg="bg-primary/10 dark:bg-primary/20"
                        label="Total Storage"
                        value={storageLabel}
                    />
                    <StatCard
                        icon={<Layers className="h-7 w-5 text-primary" />}
                        iconBg="bg-primary/10 dark:bg-primary/20"
                        label="Total Collections"
                        value={isLoading ? "…" : String(totals.collections)}
                    />
                    <StatCard
                        icon={<FileStack className="h-7 w-5 text-rose-500" />}
                        iconBg="bg-rose-100 dark:bg-rose-950/50"
                        label="Total Files"
                        value={
                            isLoading
                                ? "…"
                                : totals.filesEstimate.toLocaleString()
                        }
                    />
                    <StatCard
                        icon={<Database className="h-7 w-5 text-amber-600" />}
                        iconBg="bg-amber-100 dark:bg-amber-950/50"
                        label="Total Chunks"
                        value={
                            isLoading
                                ? "…"
                                : totals.chunks.toLocaleString()
                        }
                    />
                </div>

                {/* Toolbar */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative min-w-0 flex-1 lg:max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search files..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="h-10 border-border bg-white pl-9 dark:border-border dark:bg-card"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select
                            value={category}
                            onValueChange={(v) => {
                                setCategory(v as CategoryFilter);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 w-[140px] border-border bg-white dark:border-border dark:bg-card">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Category</SelectItem>
                                <SelectItem value="docs">Documentation</SelectItem>
                                <SelectItem value="general">General</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={status}
                            onValueChange={(v) => {
                                setStatus(v as StatusFilter);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 w-[130px] border-border bg-white dark:border-border dark:bg-card">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="empty">Empty</SelectItem>
                                <SelectItem value="processing">
                                    Processing
                                </SelectItem>
                                <SelectItem value="error">Error</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex rounded-lg border border-border bg-white p-0.5 dark:border-border dark:bg-card">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-8 w-8 rounded-md",
                                    viewMode === "grid" &&
                                    "bg-muted shadow-sm dark:bg-muted"
                                )}
                                onClick={() => setViewMode("grid")}
                                aria-label="Grid view"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-8 w-8 rounded-md",
                                    viewMode === "list" &&
                                    "bg-muted shadow-sm dark:bg-muted"
                                )}
                                onClick={() => setViewMode("list")}
                                aria-label="List view"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    className="h-9 gap-1.5 rounded-lg bg-primary px-4 text-primary-foreground hover:bg-primary/90"
                                >
                                    <Plus className="h-4 w-4" />
                                    New Collection
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-sm">
                                <form onSubmit={handleCreateKB}>
                                    <DialogHeader>
                                        <DialogTitle>New collection</DialogTitle>
                                        <DialogDescription>
                                            Name is slugified (lowercase,
                                            underscores) for API paths.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-3 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="documents-kb-name">
                                                Name
                                            </Label>
                                            <Input
                                                id="documents-kb-name"
                                                placeholder="e.g. hr_documentation"
                                                value={newKBName}
                                                onChange={(e) =>
                                                    setNewKBName(e.target.value)
                                                }
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline" type="button">
                                                Cancel
                                            </Button>
                                        </DialogClose>
                                        <Button
                                            type="submit"
                                            disabled={!newKBName.trim()}
                                        >
                                            Create
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                        <span className="whitespace-nowrap">Sort by:</span>
                        <Select
                            value={sort}
                            onValueChange={(v) => {
                                setSort(v as SortKey);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 w-[160px] border-border bg-white dark:border-border dark:bg-card">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest First</SelectItem>
                                <SelectItem value="name-asc">Name A–Z</SelectItem>
                                <SelectItem value="name-desc">Name Z–A</SelectItem>
                                <SelectItem value="chunks-desc">
                                    Most chunks
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                            {filtered.length === 0
                                ? "0"
                                : `${startIdx} - ${endIdx}`}{" "}
                            of {filtered.length}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={safePage <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={safePage >= pageCount}
                            onClick={() =>
                                setPage((p) => Math.min(pageCount, p + 1))
                            }
                            aria-label="Next page"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-16 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center dark:border-border">
                        <FolderOpen className="mb-3 h-12 w-12 text-primary/25" />
                        <p className="font-medium text-foreground">
                            {knowledgeBases.length === 0
                                ? "No collections yet"
                                : "No matching collections"}
                        </p>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                            {knowledgeBases.length === 0
                                ? "Create a knowledge base collection to index documents and power RAG."
                                : "Try adjusting search or filters."}
                        </p>
                        {knowledgeBases.length === 0 ? (
                            <Button
                                className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => setCreateOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                New Collection
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => {
                                    setSearch("");
                                    setCategory("all");
                                    setStatus("all");
                                    setPage(1);
                                }}
                            >
                                Clear filters
                            </Button>
                        )}
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {pageItems.map((kb) => (
                            <CollectionCard
                                key={kb.name}
                                kb={kb}
                                selected={
                                    !onOpenCollection &&
                                    selectedKBs.includes(kb.name)
                                }
                                onPrimaryClick={() => handleOpenKb(kb.name)}
                                onDelete={() => setDeleteTarget(kb.name)}
                            />
                        ))}
                    </div>
                ) : (
                    <CollectionTable
                        rows={pageItems}
                        selectedNames={selectedKBs}
                        hideSelectionHighlight={!!onOpenCollection}
                        onRowOpen={(name) => handleOpenKb(name)}
                        onDelete={(name) => setDeleteTarget(name)}
                    />
                )}
            </div>

            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete &quot;{deleteTarget}&quot;?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This permanently removes vectors and stored files for
                            this collection.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => void confirmDelete()}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function StatCard({
    icon,
    iconBg,
    label,
    value,
}: {
    icon: ReactNode;
    iconBg: string;
    label: string;
    value: string;
}) {
    return (
        <Card className="border-border py-4 h-32 shadow-sm dark:border-border">
            <CardContent className="flex items-start gap-3 px-4 py-0">
                <div
                    className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        iconBg
                    )}
                >
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="truncate text-lg font-semibold text-foreground">
                        {value}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function SourceIcons({ name }: { name: string }) {
    const set = hashIndex(name, 4);
    const count = 1 + (set % 3);
    const IconSet = [
        FileText,
        FileText,
        Globe,
    ] as const;
    return (
        <div className="flex items-center gap-1.5">
            {IconSet.slice(0, count).map((Icon, i) => (
                <span
                    key={`${name}-src-${i}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white dark:border-border dark:bg-muted"
                >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </span>
            ))}
        </div>
    );
}

function StatusBadge({ kb }: { kb: KnowledgeBase }) {
    const s = cardStatus(kb);
    if (s === "active") {
        return (
            <Badge className="gap-1 rounded-full border-0 bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/15 dark:bg-primary/25 dark:text-primary">
                <CheckCircle2 className="h-3 w-3" />
                Active
            </Badge>
        );
    }
    if (s === "processing") {
        const pct = 35 + hashIndex(kb.name, 55);
        return (
            <Badge className="gap-1 rounded-full border-0 bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-200">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing {pct}%
            </Badge>
        );
    }
    if (s === "error") {
        return (
            <Badge className="gap-1 rounded-full border-0 bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 hover:bg-red-100 dark:bg-red-950 dark:text-red-200">
                <AlertCircle className="h-3 w-3" />
                Error
            </Badge>
        );
    }
    return (
        <Badge
            variant="secondary"
            className="rounded-full px-2.5 py-0.5 text-xs font-normal"
        >
            Empty
        </Badge>
    );
}

function CollectionCard({
    kb,
    selected,
    onPrimaryClick,
    onDelete,
}: {
    kb: KnowledgeBase;
    selected: boolean;
    onPrimaryClick: () => void;
    onDelete: () => void;
}) {
    const chunks = chunkTotal(kb);
    const sizeGb = kbStorageGb(kb);
    const filesEst = kbFilesCount(kb);
    const tone = hashIndex(kb.name, 2) === 0 ? "emerald" : "slate";
    const ago =
        hashIndex(kb.name, 48) === 1
            ? "2 hours ago"
            : hashIndex(kb.name, 48) === 2
                ? "Yesterday"
                : "Just now";

    return (
        <button
            type="button"
            onClick={onPrimaryClick}
            className={cn(
                "w-full rounded-xl border bg-white text-left shadow-sm transition-all dark:bg-card",
                "hover:border-primary/30 hover:shadow-md dark:hover:border-primary/25",
                selected &&
                "border-primary ring-2 ring-primary/25 dark:border-primary",
                !selected && "border-border dark:border-border"
            )}
        >
            <div className="p-4">
                <div className="flex gap-3">
                    <div
                        className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                            tone === "emerald"
                                ? "bg-primary/10 text-primary dark:bg-primary/20"
                                : "bg-muted text-muted-foreground dark:bg-muted"
                        )}
                    >
                        <FolderOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h3 className="font-semibold text-foreground">
                                    {kb.name}
                                </h3>
                                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                    RAG · {kb.parent_collection || kb.name} /{" "}
                                    {kb.child_collection || "chunks"}
                                </p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <span
                                        role="presentation"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex"
                                    >
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </span>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete();
                                        }}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="mt-2">
                            <SourceIcons name={kb.name} />
                        </div>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 px-2 py-3 text-center dark:bg-muted/60">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Files
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                            {filesEst.toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Chunks
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                            {chunks.toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Size
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                            {sizeGb === 0 && chunks === 0
                                ? "—"
                                : `${sizeGb < 0.01 ? "<0.01" : sizeGb.toFixed(2)} GB`}
                        </p>
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <StatusBadge kb={kb} />
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {ago}
                    </span>
                </div>
            </div>
        </button>
    );
}

function CollectionTable({
    rows,
    selectedNames,
    hideSelectionHighlight,
    onRowOpen,
    onDelete,
}: {
    rows: KnowledgeBase[];
    selectedNames: string[];
    hideSelectionHighlight: boolean;
    onRowOpen: (name: string) => void;
    onDelete: (name: string) => void;
}) {
    return (
        <div className="overflow-x-auto rounded-xl border border-border dark:border-border">
            <table className="w-full min-w-[900px] text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50 dark:border-border dark:bg-muted/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Collection Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Sources
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Category
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Files
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Chunks
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Size
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Last synced
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((kb) => {
                        const chunks = chunkTotal(kb);
                        const sizeGb = kbStorageGb(kb);
                        const filesEst = kbFilesCount(kb);
                        const selected =
                            !hideSelectionHighlight &&
                            selectedNames.includes(kb.name);
                        return (
                            <tr
                                key={kb.name}
                                role="button"
                                tabIndex={0}
                                onClick={() => onRowOpen(kb.name)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        onRowOpen(kb.name);
                                    }
                                }}
                                className={cn(
                                    "cursor-pointer border-b border-border transition-colors last:border-0 dark:border-border",
                                    "hover:bg-muted/50 dark:hover:bg-muted/60",
                                    selected &&
                                    "bg-primary/8 dark:bg-primary/15"
                                )}
                            >
                                <td className="max-w-[220px] px-4 py-3 align-top">
                                    <p className="font-semibold text-foreground">
                                        {kb.name}
                                    </p>
                                    {/* <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                        RAG · {kb.parent_collection} /{" "}
                                        {kb.child_collection}
                                    </p> */}
                                </td>
                                <td className="px-4 py-3 align-middle">
                                    <StatusBadge kb={kb} />
                                </td>
                                <td className="px-4 py-3 align-middle text-muted-foreground">
                                    {sourcesLabel(kb.name)}
                                </td>
                                <td className="px-4 py-3 align-middle text-muted-foreground">
                                    {categoryLabel(kb.name)}
                                </td>
                                <td className="px-4 py-3 text-right align-middle tabular-nums text-foreground">
                                    {filesEst.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right align-middle tabular-nums text-foreground">
                                    {chunks.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right align-middle tabular-nums text-foreground">
                                    {sizeGb === 0 && chunks === 0
                                        ? "—"
                                        : `${sizeGb < 0.01 ? "<0.01" : sizeGb.toFixed(2)} GB`}
                                </td>
                                <td className="px-4 py-3 align-middle text-xs text-muted-foreground">
                                    {lastSynced(kb.name)}
                                </td>
                                <td className="px-4 py-3 align-middle text-right">
                                    <div className="flex items-center justify-end gap-0.5">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            title="View details"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRowOpen(kb.name);
                                            }}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                                            title="Delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(kb.name);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
