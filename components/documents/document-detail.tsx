"use client";

import { FileText, Layers, Hash, Calendar, Box, Database, CornerDownRight, Loader2, Save, Trash2, RotateCw, Eye, Pencil, ArrowLeft } from "lucide-react";
import { useKB } from "@/components/kb-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentInfo } from "./document-list";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

interface DocumentDetailProps {
    document: DocumentInfo | null;
    onBack?: () => void;
}

export function DocumentDetail({ document, onBack }: DocumentDetailProps) {
    // Hooks must be called unconditionally
    const [content, setContent] = useState("");
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [isReprocessing, setIsReprocessing] = useState(false);
    const [activeTab, setActiveTab] = useState("all");
    const [contentMode, setContentMode] = useState<"preview" | "edit">("preview");
    const { selectedKBs } = useKB();

    // Update content when document changes
    useEffect(() => {
        if (document) {
            setContent(document.markdown || "");
        }
    }, [document]);

    const handleReprocess = async () => {
        if (!document) return;

        setIsReprocessing(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${apiUrl}/api/v1/rag/re-process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_id: document.file_id,
                    content,
                    ...(selectedKBs.length === 1 ? { knowledge_base: selectedKBs[0] } : {})
                })
            });
            const data = await res.json();
            if (data.success) {
                // Success message or reload
                window.location.reload();
            } else {
                alert("Reprocess failed: " + (data.message || "Unknown error"));
            }
        } catch (e) {
            console.error("Failed to reprocess", e);
            alert("Failed to reprocess");
        } finally {
            setIsReprocessing(false);
        }
    };

    if (!document) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/5">
                <FileText className="w-16 h-16 mb-4 opacity-20" />
                <p>Select a document to view details</p>
            </div>
        );
    }

    const { file_info, chunks, markdown, file_id, filename } = document;

    const displayFilename = chunks?.parent_collection?.[0]?.file_name || filename || file_info.file_name;

    return (
        <div className="h-full flex flex-col bg-background/50 overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-border bg-background sticky top-0 z-20">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                        {onBack && (
                            <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2 mt-0.5 shrink-0 text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        )}
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold tracking-tight break-all">{displayFilename}</h2>
                                <Badge variant="secondary" className="font-mono text-[10px] text-muted-foreground h-auto py-0.5 px-1.5 opacity-70 break-all whitespace-normal text-left">
                                    {file_id}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{new Date(file_info.last_modified).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Database className="w-3.5 h-3.5" />
                                    <span>{(file_info.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="h-6 gap-1.5 border-amber-500/20 text-amber-600 bg-amber-500/5">
                            <Box className="w-3.5 h-3.5" />
                            {chunks.parent_collection.length} Parent Chunks
                        </Badge>
                        <Badge variant="outline" className="h-6 gap-1.5 border-blue-500/20 text-blue-600 bg-blue-500/5">
                            <Layers className="w-3.5 h-3.5" />
                            {chunks.child_collection.length} Child Chunks
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Content */}
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="px-6 pt-4 border-b border-border sticky top-[89px] bg-background z-10">
                    <TabsList className="bg-muted/50 h-9">
                        <TabsTrigger value="all" className="text-xs h-7">All Chunks</TabsTrigger>
                        <TabsTrigger value="parent" className="text-xs h-7">Parent Structure</TabsTrigger>
                        <TabsTrigger value="child" className="text-xs h-7">Child Content</TabsTrigger>
                        <TabsTrigger value="content" className="text-xs h-7">Raw Content (Edit)</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 bg-muted/5 p-6 h-auto">
                    <TabsContent value="all" className="mt-0 border-none outline-none">
                        <div className="flex flex-col gap-4">
                            {chunks.parent_collection.map((parent: any, i: number) => {
                                const children = chunks.child_collection.filter((c: any) => c.chunk_parent_id === parent.chunk_id);
                                return (
                                    <div key={i} className="flex flex-col gap-2">
                                        {/* Parent Card */}
                                        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Box className="w-4 h-4 text-amber-600" />
                                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-500">Parent Chunk</span>
                                                    <Badge variant="outline" className="font-mono text-[10px] text-amber-700/70 border-amber-500/30">
                                                        {parent.chunk_level || 'Level 1'}
                                                    </Badge>
                                                </div>
                                                <span className="text-[10px] font-mono text-muted-foreground/60 break-all ml-2" title={parent.chunk_id || ''}>
                                                    {parent.chunk_id}
                                                </span>
                                            </div>
                                            <h4 className="font-medium text-sm mb-1 text-foreground/90">{parent.chunk_title || "Untitled Section"}</h4>

                                            {/* Display full content for parent if available, or summary */}
                                            <div className="text-xs text-foreground/80 bg-background/50 p-2 rounded mt-2 font-mono whitespace-pre-wrap">
                                                {parent.chunk_content || parent.chunk_summary || "No content available"}
                                            </div>
                                        </div>

                                        {/* Children Cards */}
                                        {children.length > 0 && (
                                            <div className="space-y-2">
                                                {children.map((child: any, j: number) => (
                                                    <div key={j} className="flex gap-2">
                                                        <div className="w-6 flex justify-center">
                                                            <div className="w-0.5 h-full bg-border/50 relative">
                                                                <div className="absolute top-4 left-[-4px] w-3 h-0.5 bg-border/50" />
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors relative group">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                                                                    <span className="text-xs font-medium text-blue-700 dark:text-blue-500">Child Chunk</span>
                                                                    <Badge variant="outline" className="font-mono text-[10px] text-blue-700/70 border-blue-500/30">
                                                                        Idx {child.chunk_index ?? j}
                                                                    </Badge>
                                                                    {child.file_page_number && (
                                                                        <Badge variant="secondary" className="text-[10px] h-5 bg-background/50 text-muted-foreground">
                                                                            Page {child.file_page_number}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {child.chunk_title && (
                                                                <h4 className="font-medium text-xs mb-2 text-muted-foreground ml-1">{child.chunk_title}</h4>
                                                            )}

                                                            <div className="text-xs text-foreground/80 bg-background/50 p-2.5 rounded border border-blue-500/10 font-mono leading-relaxed whitespace-pre-wrap">
                                                                {child.chunk_content || child.content || "No content available"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Orphan Children (if any) */}
                            {chunks.child_collection.filter((c: any) => !chunks.parent_collection.some((p: any) => p.chunk_id === c.chunk_parent_id)).length > 0 && (
                                <div className="mt-6 pt-6 border-t border-border">
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-4">Unmatched Child Chunks</h3>
                                    <div className="space-y-3">
                                        {chunks.child_collection.filter((c: any) => !chunks.parent_collection.some((p: any) => p.chunk_id === c.chunk_parent_id)).map((child: any, k: number) => (
                                            <div key={k} className="p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/20 transition-colors relative group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="text-xs font-medium text-muted-foreground">Orphan Child</span>
                                                        <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border/60">
                                                            Idx {child.chunk_index ?? k}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-[10px] font-mono text-muted-foreground/60 break-all ml-2" title={child.file_id || ''}>
                                                        {child.file_id}
                                                    </span>
                                                </div>

                                                <div className="text-xs text-foreground/80 bg-muted/20 p-2.5 rounded border border-border/30 font-mono leading-relaxed whitespace-pre-wrap">
                                                    {child.chunk_content || child.content || "No content available"}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="parent" className="mt-0 border-none outline-none">
                        <Card className="flex flex-col border-none shadow-none bg-background h-auto">
                            <CardHeader className="px-0 pt-0">
                                <CardTitle className="flex items-center gap-2">
                                    <Box className="w-5 h-5 text-amber-500" />
                                    Parent Structure Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-0">
                                <div className="space-y-4 pr-4">
                                    {chunks.parent_collection.map((chunk: any, i: number) => (
                                        <div key={i} className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
                                            <div className="flex flex-col items-center gap-1 min-w-12">
                                                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs ring-2 ring-background">
                                                    {i + 1}
                                                </div>
                                                <div className="w-0.5 flex-1 bg-border/50 my-1 last:hidden" />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-2">
                                                        <Badge variant="default" className="font-mono text-[10px] bg-amber-500 text-white">Chunk Title</Badge>
                                                        <h4 className="font-semibold text-sm">{chunk.chunk_title}</h4>
                                                    </div>
                                                    <Badge variant="secondary" className="font-mono text-[10px]">Level {chunk.chunk_level}</Badge>
                                                </div>



                                                {chunk.chunk_content && (
                                                    <div className="bg-muted p-3 rounded-md text-xs font-mono text-muted-foreground mt-2 justify-center">
                                                        <p className=" w-fit h-fit font-mono text-[10px] underline">Chunk Content</p>
                                                        <p className="">{chunk.chunk_content}</p>
                                                    </div>
                                                )}

                                                <ul className="flex flex-col gap-2 mt-2 list-disc pl-4 text-[10px] text-muted-foreground">
                                                    {Object.entries(chunk).filter(([k]) => !['chunk_title', 'chunk_content', 'content'].includes(k)).map(([key, value]) => (
                                                        <li key={key} className="">
                                                            <Badge className="bg-muted text-muted-foreground mr-2">{key}</Badge>
                                                            <span className="font-mono break-all">
                                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="child" className="mt-0 border-none outline-none">
                        <Card className="flex flex-col border-none shadow-none bg-background h-auto">
                            <CardHeader className="px-0 pt-0">
                                <CardTitle className="flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-blue-500" />
                                    Child Content Chunks
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-0">
                                <div className="space-y-4 pr-4">
                                    {chunks.child_collection.map((chunk: any, i: number) => (
                                        <div key={i} className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
                                            <div className="flex flex-col items-center gap-1 min-w-12">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs ring-2 ring-background">
                                                    {i + 1}
                                                </div>
                                                <div className="w-0.5 flex-1 bg-border/50 my-1 last:hidden" />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-2">
                                                        <Badge variant="default" className="font-mono text-[10px] bg-blue-500 text-white">Parent ID {chunk.chunk_parent_id}</Badge>
                                                        <Badge variant="default" className="font-mono text-[10px] bg-blue-500 text-white">Chunk Index {chunk.chunk_index}</Badge>
                                                        {chunk.file_page_number && <Badge variant="outline" className="text-[10px]">Page {chunk.file_page_number}</Badge>}
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className="font-mono text-[10px]">Chunk Header Path : {chunk.chunk_headers_path}</Badge>

                                                <div className="bg-muted p-3 rounded-md text-xs font-mono text-muted-foreground mt-2 justify-center">
                                                    <p className=" w-fit h-fit font-mono text-[10px] underline mb-1">Content</p>
                                                    <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{chunk.chunk_content || chunk.content}</p>
                                                </div>

                                                <ul className="flex flex-col gap-2 mt-2 list-disc pl-4 text-[10px] text-muted-foreground">
                                                    <li className="">
                                                        <Badge className="bg-muted text-muted-foreground mr-2">File ID</Badge>
                                                        <span className="font-mono break-all">{chunk.file_id}</span>
                                                    </li>
                                                    {Object.entries(chunk).filter(([k]) => !['chunk_index', 'chunk_content', 'content', 'chunk_parent_id', 'file_id', 'file_page_number'].includes(k)).map(([key, value]) => (
                                                        <li key={key} className="">
                                                            <Badge className="bg-muted text-muted-foreground mr-2">{key}</Badge>
                                                            <span className="font-mono break-all">
                                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="content" className="mt-0 border-none outline-none flex-1 flex flex-col h-full min-h-[500px]">
                        <Card className="flex flex-col border-none shadow-none bg-background h-full flex-1">
                            <CardHeader className="px-0 pt-0 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-slate-500" />
                                            Markdown Content
                                        </CardTitle>
                                        <div className="flex items-center rounded-lg border border-border/50 bg-muted/30 p-0.5">
                                            <Button
                                                size="sm"
                                                variant={contentMode === "preview" ? "default" : "ghost"}
                                                className={cn("h-7 px-3 text-xs gap-1.5", contentMode === "preview" && "shadow-sm")}
                                                onClick={() => setContentMode("preview")}
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Preview
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={contentMode === "edit" ? "default" : "ghost"}
                                                className={cn("h-7 px-3 text-xs gap-1.5", contentMode === "edit" && "shadow-sm")}
                                                onClick={() => setContentMode("edit")}
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                Edit
                                            </Button>
                                        </div>
                                    </div>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" className="h-8 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoadingContent || isReprocessing}>
                                                {isReprocessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                                                Reprocess & Save
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will delete all existing chunks and vectors for this file and re-process it with the edited content. This cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleReprocess} className="bg-emerald-600 hover:bg-emerald-700">
                                                    Yes, Reprocess
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 p-0 flex flex-col h-full">
                                {isLoadingContent ? (
                                    <div className="flex items-center justify-center flex-1 h-32 text-muted-foreground">
                                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                        Loading content...
                                    </div>
                                ) : contentMode === "preview" ? (
                                    <div className="flex-1 min-h-[500px] overflow-auto rounded-lg border bg-background p-6">
                                        <div className="prose prose-sm dark:prose-invert max-w-none
                                            prose-headings:font-semibold prose-headings:tracking-tight
                                            prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2 prose-h1:mb-4
                                            prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
                                            prose-h3:text-lg prose-h3:mt-4
                                            prose-p:leading-relaxed prose-p:text-foreground/80
                                            prose-table:text-sm
                                            prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium
                                            prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-border/50
                                            prose-figure:my-4 prose-figure:p-3 prose-figure:bg-muted/20 prose-figure:rounded-lg prose-figure:border prose-figure:border-border/30 prose-figure:text-xs prose-figure:text-muted-foreground prose-figure:italic
                                            prose-hr:border-border/50
                                            prose-code:text-xs prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                                            prose-li:text-foreground/80
                                        ">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {content || "*No content available*"}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ) : (
                                    <Textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="flex-1 min-h-[500px] font-mono text-xs leading-relaxed bg-muted/20 resize-none p-4"
                                        placeholder="Markdown content..."
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

function Folder(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        </svg>
    )
}
