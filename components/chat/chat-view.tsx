"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, RefreshCw, ChevronDown, ChevronUp, FileText, Database, X, Terminal, Maximize2, Minimize2, Paperclip, Loader2, Sparkles, BrainCircuit, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DebugSteps, DebugInfo } from "@/components/chat/debug-steps";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
    const [svg, setSvg] = useState<string>('');

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
                    setSvg(`<div class="text-red-500 font-mono text-xs p-4 bg-red-50 dark:bg-red-950/20 rounded">Invalid mermaid chart</div>`);
                }
            }
        };
        renderChart();
    }, [chart]);

    return <div ref={defaultRef} dangerouslySetInnerHTML={{ __html: svg }} className="my-4 flex justify-center bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-x-auto w-full" />;
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
    metadata: Record<string, any>;
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

export function ChatView() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const { selectedKBs, knowledgeBases } = useKB();

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            } else {
                scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
            }
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${apiUrl}/api/v1/rag/search`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query: userMessage.content,
                    knowledge_bases: selectedKBs.length > 0 ? selectedKBs : knowledgeBases.map(kb => kb.name),
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
                        result: data.debug_info?.result
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
                    content: "Sorry, I encountered an error while processing your request.",
                    isError: true,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight} px`;
    };

    return (
        <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-50 overflow-hidden">
            <ScrollArea className="flex-1 p-4 md:p-6 overflow-auto" ref={scrollAreaRef}>
                <div className="max-w-3xl mx-auto space-y-6 pb-20">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                            <div className="bg-primary/5 p-6 rounded-full ring-1 ring-primary/10">
                                <Sparkles className="w-12 h-12 text-primary" />
                            </div>
                            <h2 className="text-2xl font-semibold tracking-tight">How can I help you today?</h2>
                            <p className="text-muted-foreground max-w-md">
                                Ask me about recent meetings, documents, or summaries. I'll search through the knowledge base to find the best answer for you.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-8">
                                {["Summarize the Alpha Protocol meeting", "What are the latest updates on Project X?", "Find documents about Q3 budget", "Compare the last two reports"].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => {
                                            setInput(suggestion);
                                        }}
                                        className="text-sm p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left text-neutral-600 dark:text-neutral-300"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={cn(
                                "flex w-full gap-4 p-4 rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
                                msg.role === "user"
                                    ? "bg-white dark:bg-neutral-900 shadow-sm border border-neutral-100 dark:border-neutral-800 ml-auto max-w-[85%]"
                                    : "bg-transparent max-w-full"
                            )}
                        >
                            <div className={cn(
                                "shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1",
                                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            )}>
                                {msg.role === "user" ? <User size={16} /> : <Bot size={18} />}
                            </div>

                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                        {msg.role === "user" ? "You" : "Assistant"}
                                    </span>
                                    {msg.intent && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                                            {msg.intent}
                                        </Badge>
                                    )}
                                    {msg.debug_info && (
                                        <Sheet>
                                            <SheetTrigger asChild>
                                                <Button variant="ghost" size="xs" className="h-5 gap-1 text-[10px] text-muted-foreground hover:text-primary">
                                                    <BrainCircuit className="w-3 h-3" />
                                                    View Process
                                                </Button>
                                            </SheetTrigger>
                                            <SheetContent side="left" className="w-[90vw] sm:max-w-[80vw] p-0 flex flex-col gap-0">
                                                <SheetHeader className="px-4 py-3 border-b border-border bg-muted/30">
                                                    <SheetTitle className="text-sm font-semibold flex items-center gap-2">
                                                        <BrainCircuit className="w-4 h-4" />
                                                        Execution Trace
                                                    </SheetTitle>
                                                    <SheetDescription className="sr-only">
                                                        Detailed execution steps of the RAG pipeline.
                                                    </SheetDescription>
                                                </SheetHeader>
                                                <div className="flex-1 min-h-0 overflow-y-auto">
                                                    <DebugSteps debugInfo={msg.debug_info} answer={msg.content} query={msg.query} />
                                                </div>
                                            </SheetContent>
                                        </Sheet>
                                    )}
                                </div>

                                <div className={cn("text-sm leading-relaxed prose dark:prose-invert max-w-none", msg.isError && "text-red-500")}>
                                    {msg.role === "assistant" ? (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-4 space-y-1" {...props} />,
                                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                strong: ({ node, ...props }) => <span className="font-semibold text-foreground" {...props} />,
                                                table: ({ node, ...props }) => <div className="my-4 w-full overflow-x-auto"><table className="w-full border-collapse border border-neutral-200 dark:border-neutral-800 text-sm" {...props} /></div>,
                                                thead: ({ node, ...props }) => <thead className="bg-neutral-100 dark:bg-neutral-900" {...props} />,
                                                tbody: ({ node, ...props }) => <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800" {...props} />,
                                                tr: ({ node, ...props }) => <tr className="transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50" {...props} />,
                                                th: ({ node, ...props }) => <th className="border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-left font-semibold text-neutral-900 dark:text-neutral-100" {...props} />,
                                                td: ({ node, ...props }) => <td className="border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-neutral-700 dark:text-neutral-300" {...props} />,
                                                a: ({ node, href, children, ...props }) => {
                                                    if (href?.startsWith("#file:")) {
                                                        const match = href.match(/#file:([A-Za-z0-9-]+)(?:\?page=(\d+))?/);
                                                        if (match) {
                                                            const fileId = match[1];
                                                            const page = match[2];
                                                            return (
                                                                <button
                                                                    onClick={() => toast('Opening Document PDF', { description: `File ID: ${fileId}${page ? ` at Page: ${page}` : ''}` })}
                                                                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-colors cursor-pointer bg-primary/5 px-1 py-0.5 rounded text-xs font-medium translate-y-[-1px]"
                                                                >
                                                                    <FileText className="w-3 h-3" />
                                                                    {children}
                                                                </button>
                                                            );
                                                        }
                                                    }
                                                    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline hover:text-primary/80" {...props}>{children}</a>;
                                                },
                                                code({ node, inline, className, children, ...props }: any) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    if (!inline && match && match[1] === 'mermaid') {
                                                        return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                                                    } else if (!inline) {
                                                        return (
                                                            <div className="rounded-md overflow-hidden my-4 border border-neutral-200 dark:border-neutral-800">
                                                                <div className="bg-neutral-100 dark:bg-neutral-900 px-3 py-1 flex items-center text-xs text-muted-foreground font-mono">
                                                                    {match ? match[1] : 'code'}
                                                                </div>
                                                                <SyntaxHighlighter
                                                                    {...props}
                                                                    style={vscDarkPlus as any}
                                                                    language={match ? match[1] : 'text'}
                                                                    PreTag="div"
                                                                    className="!m-0 !bg-neutral-950 text-sm"
                                                                >
                                                                    {String(children).replace(/\n$/, '')}
                                                                </SyntaxHighlighter>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <code {...props} className={cn("bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-sm font-mono text-primary", className)}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    ) : (
                                        msg.content
                                    )}
                                </div>

                                {/* {msg.debug_info && msg.debug_info.steps && (
                                    <div className="mt-2">
                                        <Collapsible>
                                            <CollapsibleTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-6 gap-1.5 text-xs text-muted-foreground hover:text-primary p-0 hover:bg-transparent justify-start w-full">
                                                    <ChevronsUpDown className="w-3 h-3" />
                                                    <span className="font-medium">Show Execution Details</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
                                                        {msg.debug_info.steps.length} steps
                                                    </span>
                                                </Button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="mt-2 text-sm border-l-2 border-border pl-3 ml-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
                                                <DebugSteps debugInfo={msg.debug_info} query={msg.query} />
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </div>
                                )} */}

                                {msg.documents && msg.documents.length > 0 && (
                                    <div className="mt-4 space-y-3">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <FileText size={12} />
                                            Sources
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {msg.documents.map((doc, docIndex) => (
                                                <Card key={docIndex} className="bg-neutral-50/50 dark:bg-neutral-900/50 border-neutral-200/60 dark:border-neutral-800 hover:border-primary/20 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer group">
                                                    <CardContent className="p-3">
                                                        <div className="flex items-start gap-2.5">
                                                            <div className="bg-white dark:bg-neutral-950 p-2 rounded-md shadow-sm border border-neutral-100 dark:border-neutral-800 group-hover:border-primary/20 group-hover:text-primary transition-colors">
                                                                <FileText className="w-4 h-4 text-neutral-400 group-hover:text-primary" />
                                                            </div>
                                                            <div className="space-y-1 min-w-0 flex-1">
                                                                <h4 className="text-sm font-medium leading-tight truncate pr-2 text-neutral-900 dark:text-neutral-100 group-hover:text-primary transition-colors">
                                                                    {doc.file_name || "Unknown File"}
                                                                </h4>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                        <span className="truncate max-w-[100px]">{doc.file_id}</span>
                                                                        {doc.sections && doc.sections.length > 0 && (
                                                                            <>
                                                                                <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                                                                                <span>{doc.sections.length} matches</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    {doc.sections && doc.sections.length > 0 && (
                                                                        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-1.5 mt-0.5 space-y-1">
                                                                            {doc.sections.slice(0, 2).map((section, idx) => (
                                                                                <div key={idx} className="flex flex-col gap-0.5">
                                                                                    <p className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300 line-clamp-1">
                                                                                        {section.section_title}
                                                                                    </p>
                                                                                    <p className="text-[10px] text-neutral-500 line-clamp-2 leading-relaxed">
                                                                                        {section.merged_content}
                                                                                    </p>
                                                                                </div>
                                                                            ))}
                                                                            {doc.sections.length > 2 && (
                                                                                <p className="text-[9px] text-muted-foreground italic">
                                                                                    +{doc.sections.length - 2} more sections...
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex w-full gap-4 p-4 max-w-3xl mx-auto">
                            <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <Bot size={18} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Assistant</span>
                                    <div className="h-4 w-4">
                                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                                <div className="flex gap-1 items-center h-6">
                                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 relative z-20">
                <div className="max-w-3xl mx-auto relative">
                    <div className="relative flex items-end gap-2 p-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                        <Textarea
                            ref={textAreaRef}
                            value={input}
                            onChange={adjustTextareaHeight}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything..."
                            className="resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent min-h-[44px] max-h-[200px] py-3 px-3 text-base"
                            rows={1}
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={isLoading || !input.trim()}
                            size="icon"
                            className={cn(
                                "mb-1 mr-1 rounded-xl transition-all duration-200",
                                input.trim() ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600 cursor-not-allowed"
                            )}
                        >
                            <Send size={18} className={cn(isLoading && "hidden")} />
                            {isLoading && <Loader2 size={18} className="animate-spin" />}
                        </Button>
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground mt-2">
                        AI can make mistakes. Please verify important information.
                    </p>
                </div>
            </div>
            <Toaster />
        </div>
    );
}
