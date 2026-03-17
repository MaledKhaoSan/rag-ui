"use client";

import { useState, useEffect } from "react";
import {
    StepForward,
    CheckCircle2,
    AlertCircle,
    Search,
    Database,
    BrainCircuit,
    Settings2,
    Code,
    ArrowDown,
    CornerDownRight,
    FileOutput,
    FileText,
    MessageSquare,
    ChevronDown,
    ChevronRight,
    Clock,
    Zap,
    Cpu,
    GitBranch,
    TerminalSquare,
    Layers
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Types ---

export interface StepDetail {
    // Identity
    name?: string; // New structure: "decompose", "search", etc.
    step?: string; // Fallback
    type?: string;

    // Data containers
    input?: any;
    output?: any;

    // Metadata
    timestamp?: number;
    duration?: number;
    runtime?: string;
    status?: string;

    // Flattened (Legacy support or mapped props)
    original_query?: string;
    sub_queries?: string[];
    retrieved_documents?: any[];
    final_answer?: string;
}

export interface DebugInfo {
    steps: StepDetail[] | string[];
    result?: Record<string, any>;
    token_usage?: any;
}

export interface DebugStepsProps {
    debugInfo: DebugInfo;
    answer?: string;
    query?: string;
}

// --- Helpers ---

const getStepName = (step: StepDetail) => step.name || step.step || "Unknown Step";

const getStepIcon = (stepName: string) => {
    const normalizedStep = stepName.toLowerCase();
    if (normalizedStep.includes("decompose")) return <GitBranch className="w-4 h-4 text-purple-500" />;
    if (normalizedStep.includes("search") || normalizedStep.includes("retrieve")) return <Search className="w-4 h-4 text-blue-500" />;
    if (normalizedStep.includes("rerank")) return <Settings2 className="w-4 h-4 text-amber-500" />;
    if (normalizedStep.includes("evaluate")) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (normalizedStep.includes("generate")) return <Code className="w-4 h-4 text-rose-500" />;
    return <Database className="w-4 h-4 text-slate-500" />;
};

const getStepColor = (stepName: string) => {
    const normalizedStep = stepName.toLowerCase();
    if (normalizedStep.includes("decompose")) return "border-purple-500/20 bg-purple-500/5";
    if (normalizedStep.includes("search") || normalizedStep.includes("retrieve")) return "border-blue-500/20 bg-blue-500/5";
    if (normalizedStep.includes("rerank")) return "border-amber-500/20 bg-amber-500/5";
    if (normalizedStep.includes("evaluate")) return "border-emerald-500/20 bg-emerald-500/5";
    if (normalizedStep.includes("generate")) return "border-rose-500/20 bg-rose-500/5";
    return "border-slate-500/20 bg-slate-500/5";
};

// --- Components ---

const JsonView = ({ data, label }: { data: any, label?: string }) => {
    if (!data) return null;
    return (
        <div className="mt-2">
            {label && <p className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">{label}</p>}
            <div className="bg-[#041516] rounded-md p-3 shadow-inner border border-slate-800">
                <pre className="text-[10px] leading-relaxed font-mono text-slate-300 whitespace-pre-wrap break-all">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </div>
    );
};

const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-border/40">
        <Icon className="w-4 h-4 text-primary/80" />
        <span className="text-sm font-bold text-foreground tracking-wide">{title}</span>
    </div>
);

const ObservationSection = ({ step }: { step: StepDetail }) => {
    const observations = [];
    const stepName = getStepName(step).toLowerCase();

    // Extract data from new structure (input/output) or legacy flat structure
    const subQueries = step.output?.sub_queries || step.sub_queries;
    const retrievedDocs = step.output?.documents || step.output?.retrieved_documents || step.retrieved_documents;
    const docCount = step.output?.count || step.output?.doc_count || (retrievedDocs ? retrievedDocs.length : undefined);

    if (subQueries && Array.isArray(subQueries)) {
        observations.push({ label: "Sub-queries Generated", value: `${subQueries.length} queries` });
    }

    if (docCount !== undefined) {
        if (stepName.includes("search") || stepName.includes("retrieve")) {
            observations.push({ label: "Documents Found", value: `${docCount}` });
        } else if (stepName.includes("rerank")) {
            observations.push({ label: "After Reranking", value: `${docCount} documents` });
        }
    }

    if (step.output?.relevant_count !== undefined) {
        observations.push({ label: "Relevant Documents", value: `${step.output.relevant_count}` });
    }

    if (step.output?.needs_refinement !== undefined) {
        observations.push({ label: "Refinement Needed", value: step.output.needs_refinement ? "Yes" : "No" });
    }

    if (step.output?.iteration !== undefined) {
        observations.push({ label: "Iteration", value: `#${step.output.iteration}` });
    }

    if (step.output?.answer_preview) {
        observations.push({ label: "Status", value: "Answer Generated" });
    }

    if (step.output?.note) {
        observations.push({ label: "Note", value: step.output.note });
    }

    // Generate: show relevant_doc_count from input
    if (stepName.includes("generate") && step.input?.relevant_doc_count !== undefined) {
        observations.push({ label: "Relevant Docs Used", value: `${step.input.relevant_doc_count}` });
    }

    if (observations.length === 0) return null;

    return (
        <div className="mb-6">
            <SectionHeader icon={Layers} title="Observation" />
            <div className="grid grid-cols-2 gap-3">
                {observations.map((obs, i) => (
                    <div key={i} className="flex flex-col justify-center p-3 rounded-md bg-[#041516] border border-border/20 shadow-sm transition-all hover:bg-[#062022] hover:border-primary/20">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 opacity-70">{obs.label}</span>
                        <span className="text-sm font-semibold text-slate-100 tracking-tight">{obs.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GroupedDocumentsView = ({ title, documents }: { title: string, documents: Record<string, any[]> }) => {
    const fileNames = Object.keys(documents || {});
    let totalChunks = 0;
    fileNames.forEach(fn => { totalChunks += documents[fn].length; });

    if (fileNames.length === 0) return null;

    return (
        <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold ml-1">{title}</p>
                <Badge variant="outline" className="text-[10px] h-5 font-mono bg-[#041516] border-border/30 text-slate-400">
                    {totalChunks} items in {fileNames.length} files
                </Badge>
            </div>
            <div className="space-y-4 pr-1">
                {fileNames.map((fileName, i) => (
                    <div key={i} className="flex flex-col gap-2 p-3 bg-[#041516] border border-border/30 rounded-lg text-xs hover:border-primary/30 transition-colors shadow-sm group">
                        <div className="flex justify-between items-start gap-2 border-b border-border/10 pb-2 mb-1">
                            <span className="font-semibold text-slate-200 truncate flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                {fileName}
                            </span>
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-slate-800/50 text-slate-400 border-slate-700">
                                {documents[fileName].length} chunks
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            {documents[fileName].map((chunk, j) => (
                                <div key={j} className="p-2 rounded border border-white/5 bg-black/20 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <span className="font-medium text-[11px] text-slate-300">{chunk.doc_name || "Untitled Chunk"}</span>
                                        {chunk.is_relevant !== undefined && (
                                            <Badge variant={chunk.is_relevant ? "default" : "destructive"} className={cn("text-[9px] px-1.5 py-0 h-4 font-mono", chunk.is_relevant ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30")}>
                                                {chunk.is_relevant ? "RELEVANT" : "IRRELEVANT"}
                                            </Badge>
                                        )}
                                    </div>
                                    {chunk.ai_comment && (
                                        <div className="flex gap-1.5 items-start mt-1 bg-emerald-500/5 p-1.5 rounded border border-emerald-500/10">
                                            <MessageSquare className="w-3 h-3 text-emerald-500/70 mt-0.5 shrink-0" />
                                            <p className="text-[10px] text-emerald-400/90 italic leading-relaxed">{chunk.ai_comment}</p>
                                        </div>
                                    )}
                                    {(chunk.content_preview || chunk.content) && (
                                        <p className="font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-slate-500 line-clamp-3 mt-1 group-hover:text-slate-400 transition-colors">
                                            {chunk.content_preview || chunk.content}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const InputSection = ({ step }: { step: StepDetail }) => {
    const stepName = getStepName(step).toLowerCase();
    // 1. Decompose Input: Query
    const query = step.input?.query || step.original_query;
    // 2. Search/Other Inputs: Sub-queries
    const subQueries = step.input?.sub_queries || step.sub_queries;
    // 3. Search input: filters & intent
    const filters = step.input?.filters;
    const intent = step.input?.intent;
    // 4. Rerank/Evaluate input: doc_count
    const inputDocCount = step.input?.doc_count;
    // 5. Generate input: relevant_doc_count
    const relevantDocCount = step.input?.relevant_doc_count;

    const hasKnownFields = query || subQueries || filters || intent || inputDocCount !== undefined || relevantDocCount !== undefined || step.input?.context_chunks || step.input?.documents;

    if (!hasKnownFields && !step.input) return null;

    return (
        <div className="mb-6">
            <SectionHeader icon={TerminalSquare} title="Input" />

            {/* Query */}
            {query && (
                <div className="mb-4">
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium ml-1">Query</p>
                    <div className="p-3 bg-[#041516] border border-border/20 rounded-md text-sm font-medium text-slate-200 shadow-sm leading-relaxed">"{query}"</div>
                </div>
            )}

            {/* Filters (search step) */}
            {filters && typeof filters === 'object' && (
                <div className="mb-4">
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium ml-1">Filters</p>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(filters).map(([key, val]: [string, any]) => (
                            <div key={key} className="flex items-center gap-1.5 bg-[#041516] border border-border/20 px-2.5 py-1.5 rounded-md text-xs shadow-sm">
                                <span className="text-blue-400 font-mono font-semibold">{key}:</span>
                                <span className="text-slate-300 truncate max-w-[200px]">{String(val)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Intent (search step) */}
            {intent && (
                <div className="mb-4">
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium ml-1">Intent</p>
                    <div className="p-2.5 bg-[#041516] border border-border/20 rounded-md text-xs text-slate-300 shadow-sm italic">{intent}</div>
                </div>
            )}

            {/* Doc count (rerank/evaluate input) */}
            {inputDocCount !== undefined && (
                <div className="mb-4">
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium ml-1">Documents to Process</p>
                    <div className="p-2.5 bg-[#041516] border border-border/20 rounded-md text-sm font-semibold text-slate-200 shadow-sm">{inputDocCount} documents</div>
                </div>
            )}

            {/* Sub-queries (can be strings or objects) */}
            {subQueries && Array.isArray(subQueries) && (
                <div className="mb-4">
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium ml-1">Input Sub-queries</p>
                    <div className="space-y-1.5">
                        {subQueries.map((q: any, i: number) => (
                            <div key={i} className="flex gap-3 items-center bg-[#041516] border border-border/20 p-2.5 rounded-md text-xs shadow-sm">
                                <span className="text-purple-400 font-mono font-bold bg-purple-500/10 px-1.5 py-0.5 rounded">Q{i + 1}</span>
                                <span className="text-slate-300">{typeof q === 'string' ? q : q?.query || JSON.stringify(q)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Generation Input: Context Chunks */}
            {step.input?.context_chunks && Array.isArray(step.input.context_chunks) && step.input.context_chunks.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-muted-foreground font-medium ml-1">Context Chunks</p>
                        <Badge variant="outline" className="text-[10px] h-5 font-mono bg-[#041516] border-border/30 text-slate-400">
                            {step.input.context_chunks.length} chunks
                        </Badge>
                    </div>
                    <div className="space-y-3 pr-1">
                        {step.input.context_chunks.map((chunk: any, i: number) => (
                            <div key={i} className="flex flex-col gap-2 p-3 bg-[#041516] border border-border/30 rounded-lg text-xs hover:border-primary/30 transition-colors shadow-sm group">
                                <div className="flex justify-between items-start gap-2 border-b border-border/10 pb-2 mb-1">
                                    <span className="font-semibold text-slate-200 truncate">{chunk.doc_name || "Untitled"}</span>
                                    {chunk.score !== undefined && (
                                        <span className="font-mono text-[10px] text-slate-500 bg-black/20 px-1.5 py-0.5 rounded border border-white/5">
                                            {typeof chunk.score === 'number' ? chunk.score.toFixed(3) : chunk.score}
                                        </span>
                                    )}
                                </div>
                                <div className="p-2 rounded border border-white/5 bg-black/20">
                                    <p className="font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-slate-400 line-clamp-3 group-hover:text-slate-300 transition-colors">
                                        {chunk.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty context message for generate */}
            {stepName.includes("generate") && step.input?.context_chunks && Array.isArray(step.input.context_chunks) && step.input.context_chunks.length === 0 && (
                <div className="mb-4">
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium ml-1">Context Chunks</p>
                    <div className="p-3 bg-[#041516] border border-amber-500/20 rounded-md text-xs text-amber-400/80 shadow-sm flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        No relevant context chunks available — answer generated without supporting documents
                    </div>
                </div>
            )}

            {/* Input Documents (Grouped by evaluate step) */}
            {step.input?.documents && !Array.isArray(step.input.documents) && typeof step.input.documents === 'object' && (
                <GroupedDocumentsView title="Input Documents" documents={step.input.documents} />
            )}

            {/* Fallback: generic JSON for truly unknown input shapes */}
            {step.input && !hasKnownFields && <JsonView data={step.input} label="Raw Input" />}
        </div>
    );
};

const ActionSection = ({ step }: { step: StepDetail }) => {
    const stepName = getStepName(step).toLowerCase();

    // Decompose Output: Sub-queries (now objects with query/filters/intent)
    const outSubQueries = step.output?.sub_queries;

    // Search Output: Documents
    const outDocs = step.output?.documents;

    if (!outSubQueries && !outDocs) return null;

    return (
        <div className="mb-6">
            <SectionHeader icon={Zap} title="Output" />

            {/* Generated Sub-queries (can be strings or objects) */}
            {outSubQueries && Array.isArray(outSubQueries) && (
                <div className="space-y-2 mb-4">
                    <p className="text-[10px] text-muted-foreground mb-1 ml-1 font-medium">Generated Sub-queries</p>
                    {outSubQueries.map((q: any, i: number) => {
                        const isObj = typeof q === 'object' && q !== null;
                        const queryText = isObj ? (q.query || JSON.stringify(q)) : String(q);
                        const qFilters = isObj ? q.filters : null;
                        const qIntent = isObj ? q.intent : null;

                        return (
                            <div key={i} className="bg-[#041516] border border-border/20 p-3 rounded-md text-xs shadow-sm space-y-2">
                                <div className="flex gap-3 items-start">
                                    <span className="text-purple-400 font-mono font-bold bg-purple-500/10 px-1.5 py-0.5 rounded shrink-0">Q{i + 1}</span>
                                    <span className="text-slate-200 font-medium">{queryText}</span>
                                </div>
                                {(qFilters || qIntent) && (
                                    <div className="flex flex-wrap gap-1.5 ml-8">
                                        {qIntent && (
                                            <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15">
                                                {qIntent}
                                            </span>
                                        )}
                                        {qFilters && Object.entries(qFilters).map(([key, val]: [string, any]) => (
                                            <span key={key} className="text-[10px] text-blue-400/80 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/15 font-mono">
                                                {key}: {String(val)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Found Documents */}
            {outDocs && Array.isArray(outDocs) && (
                <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold ml-1">Retrieved Content</p>
                        <Badge variant="outline" className="text-[10px] h-5 font-mono bg-[#041516] border-border/30 text-slate-400">
                            {outDocs.length} items
                        </Badge>
                    </div>
                    <div className="space-y-3 h-auto pr-1">
                        {outDocs.map((doc: any, i: number) => (
                            <div key={i} className="flex flex-col gap-2 p-3 bg-[#041516] border border-border/30 rounded-lg text-xs hover:border-primary/30 transition-colors shadow-sm group">
                                <div className="flex justify-between items-start gap-2 border-b border-border/10 pb-2 mb-1">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-200 truncate">{doc.doc_name || "Untitled"}</span>
                                            {doc.collection && (
                                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                    {doc.collection}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    {doc.score !== undefined && (
                                        <span className="font-mono text-[10px] text-slate-500 bg-black/20 px-1.5 py-0.5 rounded border border-white/5">
                                            {typeof doc.score === 'number' ? doc.score.toFixed(3) : doc.score}
                                        </span>
                                    )}
                                </div>
                                {doc.content && (
                                    <div className="p-2 rounded border border-white/5 bg-black/20">
                                        <p className="font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-slate-400 line-clamp-4 group-hover:text-slate-300 transition-colors">
                                            {doc.content}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Evaluated Documents Object */}
            {outDocs && !Array.isArray(outDocs) && typeof outDocs === 'object' && (
                <GroupedDocumentsView title="Evaluated Documents" documents={outDocs} />
            )}
        </div>
    );
};


const OutputSection = ({ step }: { step: StepDetail }) => {
    const answerPreview = step.output?.answer_preview || step.final_answer;

    if (!answerPreview && !step.output) return null;

    return (
        <div className="mb-6">
            <SectionHeader icon={FileOutput} title="Final Response" />

            {answerPreview && (
                <div className="mb-3">
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium ml-1">Generated Answer Preview</p>
                    <div className="p-4 bg-[#041516] border border-emerald-500/20 rounded-md text-sm text-slate-200 whitespace-pre-wrap shadow-inner leading-relaxed">
                        {answerPreview}
                    </div>
                </div>
            )}

            {/* If output is small/simple, show JSON, otherwise we might skip it if we already showed docs/subqueries */}
            {!answerPreview && !step.output?.sub_queries && !step.output?.documents && (
                <JsonView data={step.output} label="Raw Output" />
            )}
        </div>
    );
};

// New Component: StepListItem
const StepListItem = ({
    step,
    index,
    isSelected,
    onClick
}: {
    step: StepDetail,
    index: number,
    isSelected: boolean,
    onClick: () => void
}) => {
    const stepName = getStepName(step);

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left px-3 py-3 border-b flex items-start gap-3 transition-colors hover:bg-muted/50",
                isSelected ? "bg-muted/60 border-l-2 border-l-primary" : "border-border/40 border-l-2 border-l-transparent"
            )}
        >
            <div className={cn(
                "mt-0.5 p-1.5 rounded-md border shadow-xs transition-colors",
                isSelected ? "bg-background border-primary/20" : "bg-muted/30 border-transparent"
            )}>
                {getStepIcon(stepName)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className={cn(
                        "font-medium text-xs capitalize truncate",
                        isSelected ? "text-foreground" : "text-muted-foreground"
                    )}>
                        {stepName}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/50">
                        #{index + 1}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {step.type && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-muted-foreground/20 font-normal">
                            {step.type}
                        </Badge>
                    )}
                    {step.runtime ? (
                        <span className="text-[9px] text-muted-foreground/60 font-mono">
                            {step.runtime}
                        </span>
                    ) : step.duration ? (
                        <span className="text-[9px] text-muted-foreground/60 font-mono">
                            {step.duration}ms
                        </span>
                    ) : null}
                </div>
            </div>
        </button>
    );
};

export const DebugSteps = ({ debugInfo, answer, query }: DebugStepsProps) => {
    // If no steps, return empty or loading
    const rawSteps = debugInfo?.steps || [];
    const steps: StepDetail[] = rawSteps.map((s: any) => typeof s === 'string' ? { step: s } : s);

    const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);

    // Auto-select first step on load or if steps change drastically (optional)
    useEffect(() => {
        if (steps.length > 0 && selectedStepIndex >= steps.length) {
            setSelectedStepIndex(0);
        }
    }, [steps.length]);

    if (!steps || steps.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground text-sm">
                No process steps available.
            </div>
        );
    }

    const selectedStep = steps[selectedStepIndex];

    return (
        <div className="flex h-full border rounded-lg overflow-hidden bg-background shadow-sm">
            {/* Left Sidebar: Step List */}
            <div className="w-1/3 min-w-[200px] max-w-[300px] border-r border-border bg-slate-50/50 dark:bg-slate-900/20 flex flex-col">
                <div className="p-3 border-b border-border/40 bg-background/50 backdrop-blur-sm">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Execution Flow</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {steps.map((step, i) => (
                        <StepListItem
                            key={i}
                            index={i}
                            step={step}
                            isSelected={i === selectedStepIndex}
                            onClick={() => setSelectedStepIndex(i)}
                        />
                    ))}
                </div>
                <div className="p-3 border-t border-border/40 bg-background/50 text-xs text-muted-foreground text-center">
                    {steps.length} Steps Total
                </div>
            </div>

            {/* Right Main Area: Step Details */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
                {selectedStep ? (
                    <div className="flex-1 overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-secondary/50">
                                    {getStepIcon(getStepName(selectedStep))}
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold capitalize tracking-tight flex items-center gap-2">
                                        {getStepName(selectedStep)}
                                        {selectedStep.status === 'error' && <Badge variant="destructive" className="ml-2">Error</Badge>}
                                    </h2>
                                    <p className="text-xs text-muted-foreground font-mono">
                                        Step ID: {String(selectedStepIndex + 1).padStart(2, '0')} • {selectedStep.type || "Process Node"}
                                    </p>
                                </div>
                            </div>

                            {/* Top Level Metrics for Step */}
                            {(selectedStep.runtime || selectedStep.duration) && (
                                <div className="px-3 py-1.5 rounded-md bg-secondary/30 border border-border/50 flex flex-col items-end">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Duration</span>
                                    <span className="text-sm font-mono">
                                        {selectedStep.runtime ? selectedStep.runtime : `${selectedStep.duration}ms`}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Content Body */}
                        <div className="p-6 space-y-8 max-w-4xl mx-auto">
                            <ObservationSection step={selectedStep} />
                            <InputSection step={selectedStep} />
                            <ActionSection step={selectedStep} />
                            <OutputSection step={selectedStep} />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        Select a step to view details
                    </div>
                )}
            </div>
        </div>
    );
};
