"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
    Send,
    ChevronRight,
    FileText,
    Loader2,
    BrainCircuit,
    MessageSquare,
    Copy,
    Plus,
    Mic,
    Settings2,
    Upload,
    Search as SearchIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ragUrl } from "@/lib/rag-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { DebugSteps, DebugInfo } from "@/components/chat/debug-steps";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useKB } from "@/components/kb-context";
import { Toaster, toast } from "sonner";
import mermaid from "mermaid";

mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
});

const Mermaid = ({ chart }: { chart: string }) => {
    const defaultRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>("");

    useEffect(() => {
        const renderChart = async () => {
            if (chart && defaultRef.current) {
                try {
                    mermaid.mermaidAPI.reset();
                    const id = `mermaid-${Math.random().toString(36).substring(2)}`;
                    const { svg } = await mermaid.render(id, chart);
                    setSvg(svg);
                } catch (error) {
                    console.error("Mermaid parsing error", error);
                    setSvg(
                        `<div class="text-red-500 font-mono text-xs p-4 bg-red-50 dark:bg-red-950/20 rounded">Invalid mermaid chart</div>`
                    );
                }
            }
        };
        renderChart();
    }, [chart]);

    return (
        <div
            ref={defaultRef}
            dangerouslySetInnerHTML={{ __html: svg }}
            className="my-4 flex w-full justify-center overflow-x-auto rounded-xl border border-border bg-white p-4 dark:border-border dark:bg-muted"
        />
    );
};

interface ChunkContent {
    chunk_id: string;
    chunk_index: number;
    page_number: number | null;
    score: number;
    content: string;
}

interface Section {
    section_id: string;
    section_title: string;
    section_path: string;
    contents: ChunkContent[];
    merged_content: string;
}

interface Document {
    file_id: string;
    file_name: string;
    score: number;
    metadata: Record<string, unknown>;
    sections: Section[];
}

interface Message {
    role: "user" | "assistant";
    content: string;
    intent?: string;
    documents?: Document[];
    debug_info?: DebugInfo;
    isError?: boolean;
    query?: string;
}

export interface ChatViewProps {
    onChatTitleChange?: (title: string) => void;
}

const SUGGESTIONS = [
    "สรุปประเด็นจากการประชุมล่าสุด",
    "มีอัปเดตโครงการล่าสุดอะไรบ้าง",
    "ค้นหาเอกสารเกี่ยวกับงบประมาณไตรมาส",
    "เปรียบเทียบรายงานฉบับล่าสุดสองฉบับ",
];

const markdownComponents: Components = {
    ul: ({ ...props }) => (
        <ul className="list-disc space-y-1 pl-4" {...props} />
    ),
    ol: ({ ...props }) => (
        <ol className="list-decimal space-y-1 pl-4" {...props} />
    ),
    li: ({ ...props }) => <li className="pl-1" {...props} />,
    img: ({ src, alt, ...props }) => {
        const fileName =
            src && typeof src === "string" && !src.endsWith(".png")
                ? `${src}.png`
                : src;
        const fullSrc =
            typeof src === "string" && !src.startsWith("http")
                ? `http://localhost:9001/api/v1/buckets/local-document-bucket/objects/download?preview=true&prefix=user_manual_kb%2Fassets%2F${fileName}&version_id=null`
                : (src as string);
        return (
            <img
                src={fullSrc}
                alt={alt}
                className="my-4 h-auto max-w-full rounded-lg border border-border shadow-sm dark:border-border"
                {...props}
            />
        );
    },
    strong: ({ ...props }) => (
        <span className="font-semibold text-foreground" {...props} />
    ),
    table: ({ ...props }) => (
        <div className="my-4 w-full overflow-x-auto">
            <table
                className="w-full border-collapse border border-border text-sm dark:border-border"
                {...props}
            />
        </div>
    ),
    thead: ({ ...props }) => (
        <thead className="bg-muted dark:bg-muted" {...props} />
    ),
    tbody: ({ ...props }) => (
        <tbody
            className="divide-y divide-border dark:divide-border"
            {...props}
        />
    ),
    tr: ({ ...props }) => (
        <tr
            className="transition-colors hover:bg-muted/40 dark:hover:bg-muted/50"
            {...props}
        />
    ),
    th: ({ ...props }) => (
        <th
            className="border border-border px-4 py-2 text-left font-semibold text-foreground dark:border-border dark:text-foreground"
            {...props}
        />
    ),
    td: ({ ...props }) => (
        <td
            className="border border-border px-4 py-2 text-muted-foreground dark:border-border dark:text-muted-foreground"
            {...props}
        />
    ),
    a: ({ href, children, ...props }) => {
        if (href?.startsWith("#file:")) {
            const match = href.match(/#file:([A-Za-z0-9-]+)(?:\?page=(\d+))?/);
            if (match) {
                const fileId = match[1];
                const page = match[2];
                const nameGuess =
                    typeof children === "string"
                        ? children
                        : Array.isArray(children)
                          ? children.filter((c) => typeof c === "string").join("")
                          : fileId;
                return (
                    <button
                        type="button"
                        onClick={() => {
                            const hash = page ? `#page=${encodeURIComponent(page)}` : "";
                            window.open(
                                `/chat/previews/${encodeURIComponent(fileId)}?kb=local&name=${encodeURIComponent(
                                    `${nameGuess}`
                                )}${hash}`,
                                "_blank"
                            );
                        }}
                        className="inline-flex cursor-pointer items-center gap-1 text-sm bg-white border-primary/20 px-2 border rounded-full py-0.5 font-medium text-black decoration-primary/30 underline-offset-4 transition-colors hover:text-primary/80 hover:decoration-primary"
                    >
                        <img
                            src="https://cdn-icons-png.flaticon.com/256/337/337946.png"
                            alt="PDF"
                            className="size-3 my-0!"
                            decoding="async"
                        />
                        {children}
                    </button>
                );
            }
        }
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 hover:underline"
                {...props}
            >
                {children}
            </a>
        );
    },
    code: ((props) => {
        type MarkdownCodeProps =
            NonNullable<Components["code"]> extends React.ComponentType<infer P>
                ? P
                : never;
        const p = props as unknown as MarkdownCodeProps;
        const inline = Boolean((p as unknown as { inline?: boolean }).inline);
        const className = (p as unknown as { className?: string }).className;
        const children = (p as unknown as { children?: React.ReactNode }).children;
        const match = /language-(\w+)/.exec(className || "");
        if (!inline && match?.[1] === "mermaid") {
            return (
                <Mermaid chart={String(children).replace(/\n$/, "")} />
            );
        }
        if (!inline) {
            return (
                <div className="my-4 overflow-hidden rounded-md border border-border dark:border-border">
                    <div className="flex items-center bg-muted px-3 py-1 font-mono text-xs text-muted-foreground dark:bg-muted">
                        {match ? match[1] : "code"}
                    </div>
                    <SyntaxHighlighter
                        style={vscDarkPlus as Record<string, React.CSSProperties>}
                        language={match ? match[1] : "text"}
                        PreTag="div"
                        className="!m-0 !bg-neutral-950 text-sm"
                    >
                        {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                </div>
            );
        }
        return (
            <code
                className={cn(
                    "rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-primary dark:bg-muted",
                    className
                )}
            >
                {children}
            </code>
        );
    }) as Components["code"],
};

export function ChatView({ onChatTitleChange }: ChatViewProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isComposing, setIsComposing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { selectedKBs, knowledgeBases } = useKB();

    const scrollToBottom = useCallback(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, scrollToBottom]);

    useEffect(() => {
        const firstUser = messages.find((m) => m.role === "user");
        const title = firstUser
            ? firstUser.content.trim().slice(0, 40) +
            (firstUser.content.length > 40 ? "…" : "")
            : "";
        onChatTitleChange?.(title);
    }, [messages, onChatTitleChange]);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        if (textAreaRef.current) {
            textAreaRef.current.style.height = "auto";
        }

        try {
            const response = await fetch(ragUrl("/search"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query: userMessage.content,
                    knowledge_bases:
                        selectedKBs.length > 0
                            ? selectedKBs
                            : knowledgeBases.map((kb) => kb.name),
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch response");
            }

            const data = await response.json();

            if (data.success) {
                const assistantMessage: Message = {
                    role: "assistant",
                    content: data.answer,
                    intent: data.intent,
                    documents: data.documents,
                    debug_info: {
                        steps: data.steps,
                        result: data.debug_info?.result,
                    },
                    query: userMessage.content,
                };
                setMessages((prev) => [...prev, assistantMessage]);
            } else {
                throw new Error("API returned success: false");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Failed to get response. Please try again.");
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        "Sorry, I encountered an error while processing your request.",
                    isError: true,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && !isComposing) {
            e.preventDefault();
            void handleSendMessage();
        }
    };

    const syncTextareaSize = () => {
        const el = textAreaRef.current;
        if (!el) return;
        el.style.height = "0px";
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    };

    const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        requestAnimationFrame(syncTextareaSize);
    };

    useEffect(() => {
        syncTextareaSize();
    }, [input]);

    const hasContent = input.trim().length > 0;

    const handleComposerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void handleSendMessage();
    };

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background font-sans text-foreground">
            <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5"
            >
                <div className="mx-auto w-full max-w-[768px] space-y-2 px-4 pb-6 pt-6 md:pt-10">
                    {messages.length === 0 && (
                        <div className="flex min-h-[min(520px,calc(100vh-280px))] flex-col items-center justify-center px-2 pb-10 text-center">
                            <div className="mb-4 flex h-[62px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white shadow-sm ring-4 ring-primary/15">
                                <Image
                                    src="/md-logo.png"
                                    alt="ตรากรมเจ้าท่า"
                                    width={62}
                                    height={62}
                                    className="h-full w-full object-contain p-1.5"
                                    priority
                                />
                            </div>
                            <div className="mb-6 space-y-1.5">
                                <h1 className="text-2xl font-normal tracking-tight text-foreground">
                                    สวัสดีครับ{" "}
                                    <span className="font-extrabold">ADMIN</span>
                                </h1>
                                <p className="text-lg font-semibold leading-7 text-foreground">
                                    วันนี้ต้องการให้ช่วยเรื่องใดครับ?
                                </p>
                                <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                                    สอบถามเกี่ยวกับเอกสารและฐานความรู้ได้ —
                                    ระบบจะค้นหาข้อมูลจากคอลเลกชันที่เลือกไว้ด้วย
                                    RAG
                                </p>
                            </div>
                            <div className="flex max-w-4xl flex-nowrap justify-center gap-1.5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {SUGGESTIONS.map((label) => (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => setInput(label)}
                                        className="flex h-8 min-w-[134px] w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-white px-3 py-2 transition-all hover:bg-muted/50"
                                    >
                                        <ChevronRight className="h-4 w-4 shrink-0 text-[#525252]" />
                                        <span className="text-center text-xs font-normal leading-[133%] text-foreground">
                                            {label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, index) =>
                        msg.role === "user" ? (
                            <div
                                key={index}
                                className="mb-6 flex w-full animate-in fade-in slide-in-from-bottom-2 justify-end duration-300"
                            >
                                <div className="flex max-w-[85%] items-start gap-2">
                                    <button
                                        type="button"
                                        className="mt-2 rounded-md p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-muted-foreground"
                                        aria-label="Copy message"
                                        onClick={() =>
                                            void navigator.clipboard.writeText(
                                                msg.content
                                            )
                                        }
                                    >
                                        <Copy className="h-4 w-4 stroke-2" />
                                    </button>
                                    <div
                                        className={cn(
                                            "rounded-3xl rounded-tr-sm border border-border/40 bg-muted px-4 py-3 shadow-sm transition-colors dark:border-border/50"
                                        )}
                                    >
                                        <p className="whitespace-pre-wrap text-base leading-normal text-foreground dark:text-foreground">
                                            {msg.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                key={index}
                                className="mb-8 flex w-full animate-in fade-in slide-in-from-bottom-2 items-start gap-5 md:gap-6"
                            >
                                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white shadow-sm ring-2 ring-primary/15 md:h-10 md:w-10">
                                    <Image
                                        src="/md-logo.png"
                                        alt="ตรากรมเจ้าท่า"
                                        width={40}
                                        height={40}
                                        className="h-full w-full object-contain p-0.5"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        {msg.intent && (
                                            <Badge
                                                variant="secondary"
                                                className="h-5 px-1.5 text-[10px] font-normal text-muted-foreground"
                                            >
                                                {msg.intent}
                                            </Badge>
                                        )}
                                        {msg.debug_info && (
                                            <Sheet>
                                                <SheetTrigger asChild>
                                                    {/* <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-primary"
                                                    >
                                                        <BrainCircuit className="h-3 w-3" />
                                                        Process
                                                    </Button> */}
                                                </SheetTrigger>
                                                <SheetContent
                                                    side="left"
                                                    className="flex w-[90vw] max-w-[80vw] flex-col gap-0 p-0 sm:max-w-[80vw]"
                                                >
                                                    <SheetHeader className="border-b border-border bg-muted/30 px-4 py-3">
                                                        <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                                                            <BrainCircuit className="h-4 w-4" />
                                                            Execution trace
                                                        </SheetTitle>
                                                        <SheetDescription className="sr-only">
                                                            RAG pipeline steps
                                                        </SheetDescription>
                                                    </SheetHeader>
                                                    {/* <div className="min-h-0 flex-1 overflow-y-auto">
                                                        <DebugSteps
                                                            debugInfo={
                                                                msg.debug_info
                                                            }
                                                            answer={msg.content}
                                                            query={msg.query}
                                                        />
                                                    </div> */}
                                                </SheetContent>
                                            </Sheet>
                                        )}
                                    </div>
                                    <div
                                        className={cn(
                                            "prose prose-sm max-w-none font-medium leading-relaxed text-foreground dark:prose-invert",
                                            msg.isError && "text-red-600"
                                        )}
                                    >
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={markdownComponents}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                    <div className="mt-3 flex items-center gap-1">
                                        <button
                                            type="button"
                                            className="rounded-md p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-muted-foreground"
                                            onClick={() => {
                                                void navigator.clipboard.writeText(
                                                    msg.content
                                                );
                                            }}
                                        >
                                            <Copy className="h-4 w-4 stroke-2" />
                                        </button>
                                    </div>

                                    {msg.documents && msg.documents.length > 0 && (
                                        <div className="mt-4 space-y-3">
                                            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                <FileText size={12} />
                                                Sources
                                            </p>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {msg.documents.map(
                                                    (doc, docIndex) => (
                                                        <Card
                                                            key={docIndex}
                                                            onClick={() => {
                                                                const kb =
                                                                    typeof doc.metadata?.knowledge_base ===
                                                                    "string"
                                                                        ? String(doc.metadata.knowledge_base)
                                                                        : selectedKBs.length === 1
                                                                          ? selectedKBs[0]
                                                                          : "local";
                                                                const name =
                                                                    doc.file_name ||
                                                                    `${doc.file_id}.pdf`;
                                                                const directUrl =
                                                                    typeof doc.metadata?.file_url ===
                                                                        "string" &&
                                                                    doc.metadata.file_url.trim()
                                                                        ? doc.metadata.file_url.trim()
                                                                        : typeof doc.metadata?.minio_url ===
                                                                              "string" &&
                                                                            doc.metadata.minio_url.trim()
                                                                          ? doc.metadata.minio_url.trim()
                                                                          : "";
                                                                window.open(
                                                                    `/chat/previews/${encodeURIComponent(
                                                                        doc.file_id
                                                                    )}?kb=${encodeURIComponent(
                                                                        kb
                                                                    )}&name=${encodeURIComponent(
                                                                        name
                                                                    )}${directUrl ? `&url=${encodeURIComponent(directUrl)}` : ""}`,
                                                                    "_blank"
                                                                );
                                                            }}
                                                            className="cursor-pointer border-border/60 bg-muted/40 transition-all hover:border-primary/20 hover:bg-muted group dark:border-border dark:bg-muted/50 dark:hover:bg-muted"
                                                        >
                                                            <CardContent className="p-3">
                                                                <div className="flex items-start gap-2.5">
                                                                    <div className="rounded-md border border-border bg-white p-2 shadow-sm transition-colors group-hover:border-primary/20 group-hover:text-primary dark:border-border dark:bg-card">
                                                                        <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1 space-y-1">
                                                                        <h4 className="truncate pr-2 text-sm font-medium leading-tight text-foreground transition-colors group-hover:text-primary dark:text-foreground">
                                                                            {doc.file_name ||
                                                                                "Unknown File"}
                                                                        </h4>
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                                <span className="max-w-[100px] truncate">
                                                                                    {
                                                                                        doc.file_id
                                                                                    }
                                                                                </span>
                                                                                {doc
                                                                                    .sections &&
                                                                                    doc
                                                                                        .sections
                                                                                        .length >
                                                                                    0 && (
                                                                                        <>
                                                                                            <span className="h-1 w-1 rounded-full bg-muted dark:bg-muted" />
                                                                                            <span>
                                                                                                {
                                                                                                    doc
                                                                                                        .sections
                                                                                                        .length
                                                                                                }{" "}
                                                                                                matches
                                                                                            </span>
                                                                                        </>
                                                                                    )}
                                                                            </div>
                                                                            {doc
                                                                                .sections &&
                                                                                doc
                                                                                    .sections
                                                                                    .length >
                                                                                0 && (
                                                                                    <div className="space-y-1 border-t border-border pt-1.5 mt-0.5 dark:border-border">
                                                                                        {doc.sections
                                                                                            .slice(
                                                                                                0,
                                                                                                2
                                                                                            )
                                                                                            .map(
                                                                                                (
                                                                                                    section,
                                                                                                    idx
                                                                                                ) => (
                                                                                                    <div
                                                                                                        key={
                                                                                                            idx
                                                                                                        }
                                                                                                        className="flex flex-col gap-0.5"
                                                                                                    >
                                                                                                        <p className="line-clamp-1 text-[10px] font-medium text-muted-foreground dark:text-muted-foreground">
                                                                                                            {
                                                                                                                section.section_title
                                                                                                            }
                                                                                                        </p>
                                                                                                        <p className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                                                                                                            {
                                                                                                                section.merged_content
                                                                                                            }
                                                                                                        </p>
                                                                                                    </div>
                                                                                                )
                                                                                            )}
                                                                                        {doc
                                                                                            .sections
                                                                                            .length >
                                                                                            2 && (
                                                                                                <p className="text-[9px] italic text-muted-foreground">
                                                                                                    +
                                                                                                    {doc
                                                                                                        .sections
                                                                                                        .length -
                                                                                                        2}{" "}
                                                                                                    more…
                                                                                                </p>
                                                                                            )}
                                                                                    </div>
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    )}

                    {isLoading && (
                        <div className="flex animate-in fade-in items-start gap-3 duration-300">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <MessageSquare className="h-4 w-4 text-primary" />
                            </div>
                            <div className="max-w-[80%] flex-1 rounded-lg rounded-tl-none bg-muted p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <span
                                            className="h-2 w-2 animate-bounce rounded-full bg-primary"
                                            style={{
                                                animationDuration: "1s",
                                            }}
                                        />
                                        <span
                                            className="h-2 w-2 animate-bounce rounded-full bg-primary"
                                            style={{
                                                animationDelay: "200ms",
                                                animationDuration: "1s",
                                            }}
                                        />
                                        <span
                                            className="h-2 w-2 animate-bounce rounded-full bg-primary"
                                            style={{
                                                animationDelay: "400ms",
                                                animationDuration: "1s",
                                            }}
                                        />
                                    </div>
                                    {/* <span className="text-sm font-medium text-muted-foreground">
                                        Thinking…
                                    </span> */}
                                    {/* <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> */}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative z-20 shrink-0 border-t border-border bg-background px-3 pb-4 pt-3 dark:border-border">
                <form
                    onSubmit={handleComposerSubmit}
                    className="mx-auto flex w-full max-w-[780px] justify-center"
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        onChange={() =>
                            toast.message("Upload", {
                                description:
                                    "File attachments are not wired in this shell yet.",
                            })
                        }
                    />
                    <div className="relative w-full min-w-[240px] max-w-[750px] rounded-3xl border border-border bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all box-border focus-within:border-primary/35 focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.06)] min-h-[120px] dark:border-border dark:bg-card">
                        <div className="relative flex items-start justify-between gap-2">
                            <textarea
                                ref={textAreaRef}
                                disabled={isLoading}
                                value={input}
                                onChange={adjustTextareaHeight}
                                onKeyDown={handleKeyDown}
                                onCompositionStart={() => setIsComposing(true)}
                                onCompositionEnd={() => setIsComposing(false)}
                                placeholder="Type your message..."
                                aria-label="Message input"
                                rows={1}
                                className="relative z-10 max-h-[200px] min-h-[40px] flex-1 resize-none overflow-y-auto whitespace-pre-wrap break-words bg-transparent text-base leading-relaxed outline-none"
                            />
                            <div className="mt-1 shrink-0">
                                <Mic className="h-6 w-6 cursor-pointer text-foreground transition-colors hover:text-primary dark:text-foreground" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-full bg-muted text-foreground hover:bg-muted/80 hover:text-foreground dark:bg-muted dark:hover:bg-muted/80"
                                        >
                                            <Plus className="h-6 w-6" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="start"
                                        sideOffset={12}
                                        className="w-[184px] overflow-hidden rounded-xl border border-border bg-white p-2 shadow-lg dark:border-border dark:bg-card"
                                    >
                                        <DropdownMenuItem
                                            className="flex cursor-pointer items-center gap-4 rounded-xl px-3 py-2"
                                            onSelect={() =>
                                                toast.message("Library", {
                                                    description:
                                                        "Connect your file library in the main platform app.",
                                                })
                                            }
                                        >
                                            <SearchIcon className="h-5 w-5 text-foreground" />
                                            <span className="text-sm font-medium text-foreground">
                                                Search library
                                            </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="flex cursor-pointer items-center gap-4 rounded-xl px-3 py-2"
                                            onSelect={() =>
                                                fileInputRef.current?.click()
                                            }
                                        >
                                            <Upload className="h-5 w-5 text-foreground" />
                                            <span className="text-sm font-medium text-foreground">
                                                Upload file
                                            </span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-full text-foreground hover:bg-muted dark:text-foreground dark:hover:bg-muted"
                                >
                                    <Settings2 className="h-5 w-5" />
                                </Button>
                            </div>
                            <div className="flex items-center">
                                {hasContent && (
                                    <Button
                                        type="submit"
                                        size="icon"
                                        disabled={isLoading}
                                        className="ml-1 h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <Toaster />
        </div>
    );
}
