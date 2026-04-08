"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Grid = {
    headers: string[];
    rows: (string | number | boolean | null)[][];
};

function extOf(name: string) {
    const m = (name || "").match(/\.([^.]+)$/);
    return (m?.[1] || "").toLowerCase();
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function parseCsvText(text: string, maxRows: number, maxCols: number): Grid {
    // Very small, pragmatic CSV parser (handles quoted fields and commas/newlines inside quotes).
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;
    let i = 0;

    const pushField = () => {
        row.push(field);
        field = "";
    };
    const pushRow = () => {
        rows.push(row);
        row = [];
    };

    // Normalize line endings; keep \n as the only newline.
    const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    while (i < s.length) {
        const ch = s[i];
        if (inQuotes) {
            if (ch === '"') {
                const next = s[i + 1];
                if (next === '"') {
                    field += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i += 1;
                continue;
            }
            field += ch;
            i += 1;
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
            i += 1;
            continue;
        }
        if (ch === ",") {
            pushField();
            i += 1;
            continue;
        }
        if (ch === "\n") {
            pushField();
            pushRow();
            if (rows.length >= maxRows + 1) break; // +1 for header row
            i += 1;
            continue;
        }
        field += ch;
        i += 1;
    }
    // last field/row
    pushField();
    if (row.length > 1 || row[0] !== "" || rows.length === 0) pushRow();

    const header = rows[0] ?? [];
    const body = rows.slice(1);

    const limitedHeader = header.slice(0, maxCols).map((h, idx) => {
        const v = String(h ?? "").trim();
        return v || `Column ${idx + 1}`;
    });
    const limitedRows = body.slice(0, maxRows).map((r) =>
        r.slice(0, maxCols).map((v) => (v == null ? "" : String(v)))
    );

    return { headers: limitedHeader, rows: limitedRows };
}

function sheetToGrid(
    sheet: XLSX.WorkSheet,
    maxRows: number,
    maxCols: number
): Grid {
    const aoa = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        blankrows: false,
    }) as unknown[][];

    const headerRow = (aoa[0] ?? []) as unknown[];
    const headers = headerRow.slice(0, maxCols).map((h, idx) => {
        const v = h == null ? "" : String(h).trim();
        return v || `Column ${idx + 1}`;
    });

    const rows = aoa
        .slice(1, maxRows + 1)
        .map((r) =>
            (r as unknown[]).slice(0, maxCols).map((cell) => {
                if (cell === undefined || cell === null) return null;
                if (
                    typeof cell === "string" ||
                    typeof cell === "number" ||
                    typeof cell === "boolean"
                ) {
                    return cell;
                }
                try {
                    return JSON.stringify(cell);
                } catch {
                    return String(cell);
                }
            })
        );

    return { headers, rows };
}

export function PreviesCsv({
    fileUrl,
    fileName,
    className,
}: {
    fileUrl: string;
    fileName: string;
    className?: string;
}) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [sheets, setSheets] = useState<{ name: string; grid: Grid }[]>([]);
    const [activeSheet, setActiveSheet] = useState(0);

    const [page, setPage] = useState(0);
    const pageSize = 50;

    const maxRows = 2000; // hard cap to keep UI responsive
    const maxCols = 80;

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            setError(null);
            setSheets([]);
            setActiveSheet(0);
            setPage(0);

            try {
                const res = await fetch(fileUrl, { cache: "no-store" });
                if (!res.ok) {
                    throw new Error(`Download failed (${res.status})`);
                }
                const buf = await res.arrayBuffer();
                if (cancelled) return;

                const ext = extOf(fileName);
                if (ext === "csv" || ext === "txt") {
                    const text = new TextDecoder("utf-8").decode(buf);
                    const grid = parseCsvText(text, maxRows, maxCols);
                    setSheets([{ name: "CSV", grid }]);
                    return;
                }

                if (["xls", "xlsx", "xlsm"].includes(ext)) {
                    const wb = XLSX.read(buf, { type: "array" });
                    const next = wb.SheetNames.slice(0, 10).map((name) => ({
                        name,
                        grid: sheetToGrid(wb.Sheets[name], maxRows, maxCols),
                    }));
                    setSheets(next.length ? next : [{ name: "Sheet1", grid: { headers: [], rows: [] } }]);
                    return;
                }

                // fallback: try CSV parse anyway
                const text = new TextDecoder("utf-8").decode(buf);
                const grid = parseCsvText(text, maxRows, maxCols);
                setSheets([{ name: "Preview", grid }]);
            } catch (e) {
                console.error(e);
                setError(
                    e instanceof Error ? e.message : "Failed to preview file"
                );
            } finally {
                setLoading(false);
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [fileUrl, fileName]);

    const active = sheets[activeSheet]?.grid;
    const totalRows = active?.rows.length ?? 0;
    const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
    const safePage = clamp(page, 0, pageCount - 1);

    const pageRows = useMemo(() => {
        if (!active) return [];
        const start = safePage * pageSize;
        return active.rows.slice(start, start + pageSize);
    }, [active, safePage]);

    useEffect(() => {
        setPage(0);
    }, [activeSheet]);

    return (
        <div className={cn("flex h-full min-h-0 flex-col", className)}>
            <div className="shrink-0 bg-background px-4 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                            {fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Showing up to {maxRows.toLocaleString()} rows ×{" "}
                            {maxCols.toLocaleString()} columns
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(fileUrl, "_blank")}
                        >
                            Download
                        </Button>
                    </div>
                </div>

                {sheets.length > 1 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {sheets.map((s, idx) => (
                            <button
                                key={s.name}
                                type="button"
                                onClick={() => setActiveSheet(idx)}
                                className={cn(
                                    "rounded-xs border px-3 py-1 text-xs transition-colors",
                                    idx === activeSheet
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                                )}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-muted/10">
                {loading ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Loading preview…
                    </div>
                ) : error ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                        <p className="text-sm font-medium text-foreground">
                            Preview unavailable
                        </p>
                        <p className="text-xs text-muted-foreground">{error}</p>
                        <div className="mt-2 flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(fileUrl, "_blank")}
                            >
                                Try download
                            </Button>
                        </div>
                    </div>
                ) : !active || active.headers.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No data
                    </div>
                ) : (
                    <div className="min-w-max p-4">
                        <div className="overflow-hidden rounded-xs border border-border bg-background">
                            <table className="w-full border-collapse text-xs">
                                <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                                    <tr>
                                        {active.headers.map((h, idx) => (
                                            <th
                                                key={idx}
                                                className="border-b border-border px-3 py-2 text-left font-semibold text-foreground"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((r, ri) => (
                                        <tr
                                            key={ri}
                                            className="odd:bg-background even:bg-muted/10"
                                        >
                                            {active.headers.map((_, ci) => {
                                                const v = r[ci];
                                                const s =
                                                    v == null
                                                        ? ""
                                                        : typeof v === "string"
                                                            ? v
                                                            : String(v);
                                                return (
                                                    <td
                                                        key={ci}
                                                        className="max-w-[420px] truncate border-b border-border px-3 py-2 text-muted-foreground"
                                                        title={s}
                                                    >
                                                        {s}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="tabular-nums">
                                Rows{" "}
                                {totalRows === 0
                                    ? "0"
                                    : `${safePage * pageSize + 1}–${Math.min(
                                        (safePage + 1) * pageSize,
                                        totalRows
                                    )}`}{" "}
                                of {totalRows.toLocaleString()}
                            </span>
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={safePage <= 0}
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    Prev
                                </Button>
                                <span className="tabular-nums">
                                    {safePage + 1} / {pageCount}
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={safePage >= pageCount - 1}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

