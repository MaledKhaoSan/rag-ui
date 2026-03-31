"use client";

import { useMemo, useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
    FileText,
    Trash2,
    Upload,
    Search,
    Plus,
    File,
    ImageIcon,
    LayoutGrid,
    List,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { UploadDialog } from "./upload-dialog";
import { useKB } from "@/components/kb-context";
import { toast } from "sonner";
import { deleteKnowledgeBaseFile } from "@/lib/rag-api";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export interface DocumentInfo {
    file_id: string;
    filename: string;
    upload_date: string;
    status: "indexed" | "pending" | "failed";
    knowledge_base: string;
    chunk_count?: number;
    file_size?: number;
    mime_type?: string;
    file_info?: any;
    chunks?: any;
    [key: string]: any;
}

interface DocumentListProps {
    documents: DocumentInfo[];
    selectedFile: string | null;
    onSelectFile: (fileId: string | null) => void;
    onUploadComplete: () => Promise<void>;
    isLoading?: boolean;
}

const PAGE_SIZE = 12;

/** Stable React keys even when `file_id` is missing or duplicated from the API. */
function documentRowKey(
    doc: DocumentInfo,
    indexInPage: number,
    pageIndex: number
) {
    return [
        doc.knowledge_base ?? "",
        doc.file_id?.toString().trim() ?? "",
        doc.filename ?? "",
        String(pageIndex),
        String(indexInPage),
    ].join("|");
}

function extOf(name: string) {
    const m = (name || "").match(/\.([^.]+)$/);
    return (m?.[1] || "").toLowerCase();
}

function formatBytes(bytes?: number) {
    if (bytes == null || Number.isNaN(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileBytes(doc: DocumentInfo) {
    const n = doc.file_size ?? doc.file_info?.size;
    return typeof n === "number" ? n : undefined;
}

function displayDate(doc: DocumentInfo) {
    const raw = doc.upload_date || doc.file_info?.last_modified;
    if (!raw) return "—";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "—";
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round(
        (startToday.getTime() - startD.getTime()) / 86400000
    );
    if (diffDays === 0) return "วันนี้";
    if (diffDays === 1) return "เมื่อวาน";
    return d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

type FileFilter = "all" | "pdf" | "image" | "text" | "other";
type SortKey = "newest" | "oldest" | "name" | "size";
type ViewMode = "grid" | "list";

function passesFilter(doc: DocumentInfo, filter: FileFilter) {
    const ext = extOf(doc.filename);
    if (filter === "all") return true;
    if (filter === "pdf") return ext === "pdf";
    if (filter === "image")
        return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
    if (filter === "text")
        return ["txt", "md", "csv", "json", "xml"].includes(ext);
    if (filter === "other") {
        if (!ext) return true;
        if (ext === "pdf") return false;
        if (["xls", "xlsx", "xlsm"].includes(ext)) return false;
        if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
            return false;
        if (["txt", "md", "csv", "json", "xml"].includes(ext)) return false;
        return true;
    }
    return true;
}

function sortDocs(docs: DocumentInfo[], sort: SortKey) {
    const copy = [...docs];
    copy.sort((a, b) => {
        const da = new Date(a.upload_date || 0).getTime();
        const db = new Date(b.upload_date || 0).getTime();
        const sa = fileBytes(a) ?? 0;
        const sb = fileBytes(b) ?? 0;
        const na = (a.filename || "").toLowerCase();
        const nb = (b.filename || "").toLowerCase();
        switch (sort) {
            case "newest":
                return db - da;
            case "oldest":
                return da - db;
            case "name":
                return na.localeCompare(nb, "th");
            case "size":
                return sb - sa;
            default:
                return 0;
        }
    });
    return copy;
}

type FileTypeDisplay = {
    bar: string;
    icon: LucideIcon;
    iconClass: string;
    /** Raster icon from /public */
    imageSrc?: string;
};

function typeStyle(filename: string): FileTypeDisplay {
    const ext = extOf(filename);
    if (ext === "pdf")
        return {
            bar: "bg-red-600",
            icon: FileText,
            iconClass: "text-white",
            imageSrc: "/PDF.png",
        };
    if (["xls", "xlsx", "xlsm"].includes(ext))
        return {
            bar: "bg-emerald-700",
            icon: File,
            iconClass: "text-white",
            imageSrc: "/Excel.png",
        };
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
        return {
            bar: ext === "png" ? "bg-emerald-600" : "bg-amber-500",
            icon: ImageIcon,
            iconClass: "text-white",
        };
    if (["txt", "md", "csv"].includes(ext))
        return {
            bar: "bg-teal-600",
            icon: FileText,
            iconClass: "text-white",
        };
    return {
        bar: "bg-primary/80",
        icon: File,
        iconClass: "text-primary-foreground",
    };
}

function FileTypeThumbnail({
    style,
    className,
}: {
    style: FileTypeDisplay;
    className?: string;
}) {
    const Icon = style.icon;
    if (style.imageSrc) {
        return (
            <img
                src={style.imageSrc}
                alt=""
                className={cn("object-contain", className)}
                decoding="async"
                draggable={false}
            />
        );
    }
    return <Icon className={cn(className, style.iconClass)} />;
}

export function DocumentList({
    documents = [],
    selectedFile,
    onSelectFile,
    onUploadComplete,
    isLoading = false,
}: DocumentListProps) {
    const { selectedKBs } = useKB();
    const activeKB = selectedKBs.length === 1 ? selectedKBs[0] : "";

    const [searchQuery, setSearchQuery] = useState("");
    const [fileFilter, setFileFilter] = useState<FileFilter>("all");
    const [sortKey, setSortKey] = useState<SortKey>("newest");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [page, setPage] = useState(0);

    const filteredDocuments = useMemo(() => {
        let list = documents.filter((doc) =>
            (doc.filename || "")
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
        );
        list = list.filter((d) => passesFilter(d, fileFilter));
        list = sortDocs(list, sortKey);
        return list;
    }, [documents, searchQuery, fileFilter, sortKey]);

    const pageCount = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE));

    useEffect(() => {
        const maxP = Math.max(0, pageCount - 1);
        setPage((p) => Math.min(p, maxP));
    }, [pageCount, filteredDocuments.length]);

    const safePage = Math.min(page, pageCount - 1);
    const paged = useMemo(() => {
        const start = safePage * PAGE_SIZE;
        return filteredDocuments.slice(start, start + PAGE_SIZE);
    }, [filteredDocuments, safePage]);

    const rangeFrom = filteredDocuments.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
    const rangeTo = Math.min(
        (safePage + 1) * PAGE_SIZE,
        filteredDocuments.length
    );

    const handleDeleteFile = async (e: React.MouseEvent, doc: DocumentInfo) => {
        e.stopPropagation();
        if (
            !window.confirm(`ลบไฟล์ "${doc.filename}" หรือไม่?`)
        ) {
            return;
        }

        try {
            const kb = doc.knowledge_base || activeKB || "local";
            const ok = await deleteKnowledgeBaseFile(kb, doc.file_id);

            if (ok) {
                toast.success(`ลบ ${doc.filename} แล้ว`);
                onUploadComplete();
                if (selectedFile === doc.file_id) {
                    onSelectFile(null);
                }
            } else {
                toast.error("ลบไฟล์ไม่สำเร็จ");
            }
        } catch (e) {
            console.error(e);
            toast.error("เกิดข้อผิดพลาดขณะลบ");
        }
    };

    return (
        <div className="flex h-full w-full min-h-0 flex-col overflow-hidden border-r border-border bg-background">
            {/* Toolbar */}
            <div className="shrink-0 space-y-3 border-b border-border bg-card/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex flex-wrap items-center w-full justify-between">
                        <div className="w-7/12">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="ค้นหาไฟล์..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(0);
                                }}
                                className="h-10 bg-background pl-9"
                            />
                        </div>

                        {/* <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 text-destructive hover:bg-destructive/10"
                                    disabled={selectedKBs.length > 1}
                                    title="รีเซ็ตฐานความรู้"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        รีเซ็ต{" "}
                                        {activeKB ? `"${activeKB}"` : "ทั้งระบบ"}?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        จะลบเอกสารและเวกเตอร์
                                        {activeKB
                                            ? " ในฐานความรู้นี้"
                                            : " ทุกฐานความรู้"}{" "}
                                        ไม่สามารถยกเลิกได้
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleResetSystem}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        รีเซ็ต
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog> */}

                        <div className="flex flex-row items-center gap-2 w-1/3">
                            <Select
                                value={fileFilter}
                                onValueChange={(v) => {
                                    setFileFilter(v as FileFilter);
                                    setPage(0);
                                }}
                            >
                                <SelectTrigger className="h-9 w-[140px] bg-background">
                                    <SelectValue placeholder="ประเภทไฟล์" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทุกประเภท</SelectItem>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="image">รูปภาพ</SelectItem>
                                    <SelectItem value="text">ข้อความ</SelectItem>
                                    <SelectItem value="other">อื่นๆ</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={sortKey}
                                onValueChange={(v) => {
                                    setSortKey(v as SortKey);
                                    setPage(0);
                                }}
                            >
                                <SelectTrigger className="h-9 w-[160px] bg-background">
                                    <SelectValue placeholder="เรียงตาม" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">ใหม่สุดก่อน</SelectItem>
                                    <SelectItem value="oldest">เก่าสุดก่อน</SelectItem>
                                    <SelectItem value="name">ชื่อ (A–Z)</SelectItem>
                                    <SelectItem value="size">ขนาด (ใหญ่สุดก่อน)</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">

                                <Button
                                    type="button"
                                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setViewMode("grid")}
                                    aria-label="มุมมองตาราง"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant={viewMode === "list" ? "secondary" : "ghost"}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setViewMode("list")}
                                    aria-label="มุมมองรายการ"
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>

                            <UploadDialog
                                onUploadComplete={onUploadComplete}
                                knowledgeBase={activeKB || "local"}
                            >
                                <Button
                                    size="sm"
                                    className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    <Upload className="h-4 w-4" />
                                    อัปโหลด
                                </Button>
                            </UploadDialog>
                            <UploadDialog
                                onUploadComplete={onUploadComplete}
                                knowledgeBase={activeKB || "local"}
                            >
                                <Button size="icon" variant="outline" className="h-9 w-9 md:hidden">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </UploadDialog>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">

                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                        เรียง:{" "}
                        <span className="font-medium text-foreground">
                            {sortKey === "newest" && "ใหม่สุดก่อน"}
                            {sortKey === "oldest" && "เก่าสุดก่อน"}
                            {sortKey === "name" && "ชื่อ"}
                            {sortKey === "size" && "ขนาด"}
                        </span>
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="tabular-nums">
                            {rangeFrom} – {rangeTo} จาก {filteredDocuments.length}
                        </span>
                        <div className="flex items-center gap-0.5">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={safePage <= 0}
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                aria-label="หน้าก่อน"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={safePage >= pageCount - 1}
                                onClick={() =>
                                    setPage((p) => Math.min(pageCount - 1, p + 1))
                                }
                                aria-label="หน้าถัดไป"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* List / grid */}
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
                <div className="p-4">
                    {isLoading ? (
                        <div className="py-16 text-center text-muted-foreground">
                            กำลังโหลดเอกสาร…
                        </div>
                    ) : filteredDocuments.length === 0 ? (
                        <div className="py-16 text-center text-sm text-muted-foreground">
                            {documents.length === 0
                                ? "ยังไม่มีไฟล์ในคลัง"
                                : "ไม่พบไฟล์ที่ตรงกับการค้นหา"}
                        </div>
                    ) : viewMode === "grid" ? (
                        <div className="grid grid-cols-6 gap-7">
                            {paged.map((doc, i) => {
                                const style = typeStyle(doc.filename);
                                const selected = selectedFile === doc.file_id;
                                return (
                                    <Card
                                        key={documentRowKey(doc, i, safePage)}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => onSelectFile(doc.file_id)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                onSelectFile(doc.file_id);
                                            }
                                        }}
                                        className={cn(
                                            "group relative cursor-pointer gap-0 overflow-hidden p-0 py-0 text-left transition-all hover:shadow-md",
                                            selected
                                                ? "border-primary ring-2 ring-primary/25"
                                                : "hover:border-primary/30"
                                        )}
                                    >
                                        <div
                                            className="flex h-auto py-3 items-center justify-center px-2"
                                        >
                                            <FileTypeThumbnail
                                                style={style}
                                                className="size-20 my-5"
                                            />
                                        </div>
                                        <CardContent className="space-y-2 p-3">
                                            <CardTitle
                                                className="truncate text-sm leading-tight text-foreground"
                                                title={doc.filename}
                                            >
                                                {doc.filename}
                                            </CardTitle>
                                            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                                <span>{formatBytes(fileBytes(doc))}</span>
                                                {/* <span className="shrink-0">
                                                    {displayDate(doc)}
                                                </span> */}
                                            </div>
                                            {doc.knowledge_base && (
                                                <span className="inline-block max-w-full truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                    {doc.knowledge_base}
                                                </span>
                                            )}
                                        </CardContent>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive"
                                            onClick={(e) => handleDeleteFile(e, doc)}
                                            title="ลบไฟล์"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {paged.map((doc, i) => {
                                const style = typeStyle(doc.filename);
                                const selected = selectedFile === doc.file_id;
                                return (
                                    <Card
                                        key={documentRowKey(doc, i, safePage)}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => onSelectFile(doc.file_id)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                onSelectFile(doc.file_id);
                                            }
                                        }}
                                        className={cn(
                                            "flex cursor-pointer flex-row items-center gap-3 p-3 shadow-sm transition-colors",
                                            selected
                                                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                                : "hover:bg-muted/40"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg p-1",
                                                style.bar
                                            )}
                                        >
                                            <FileTypeThumbnail
                                                style={style}
                                                className="h-8 w-8"
                                            />
                                        </div>
                                        <CardContent className="min-w-0 flex-1 space-y-1 p-0">
                                            <CardTitle className="truncate text-base font-medium leading-tight text-foreground">
                                                {doc.filename}
                                            </CardTitle>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-muted-foreground">
                                                <span>{formatBytes(fileBytes(doc))}</span>
                                                <span>{displayDate(doc)}</span>
                                                <span className="capitalize">
                                                    {doc.status || "indexed"}
                                                </span>
                                            </div>
                                        </CardContent>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => handleDeleteFile(e, doc)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
