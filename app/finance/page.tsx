"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, FileText, Calendar } from "lucide-react";
import mockAnalyses from "./mokc_data.json";

export default function FinancePage() {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selectedDoc = mockAnalyses.find(d => d.id === selectedId);

    if (selectedDoc) {
        return (
            <div className="max-w-6xl mx-auto p-6 space-y-6">
                <button
                    onClick={() => setSelectedId(null)}
                    className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    กลับไปหน้ารายการ (Back to Gallery)
                </button>

                <div className="bg-card text-card-foreground rounded-3xl border border-border/50 shadow-xl p-8 md:p-14 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Article Header */}
                    <div className="mb-10 pb-10 border-b border-border/40 space-y-4">
                        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            Research Report
                        </div>
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                            {selectedDoc.title}
                        </h1>
                        <div className="flex items-center text-sm text-muted-foreground gap-4 pt-4 font-medium">
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(selectedDoc.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> KSS Research</span>
                        </div>
                    </div>

                    <div className="custom-article max-w-none text-base md:text-lg text-muted-foreground">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h2: ({ node, ...props }) => (
                                    <div className="flex items-center gap-4 mt-16 mb-8 group">
                                        <div className="h-8 md:h-10 w-2 bg-primary rounded-full shadow-sm group-hover:scale-y-110 transition-transform"></div>
                                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground m-0" {...props} />
                                    </div>
                                ),
                                p: ({ node, ...props }) => <p className="leading-relaxed mb-6 last:mb-0" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-semibold text-foreground bg-primary/10 px-1.5 py-0.5 rounded-md" {...props} />,
                                ul: ({ node, ...props }) => <ul className="space-y-4 my-8 pl-2" {...props} />,
                                li: ({ node, ...props }) => (
                                    <li className="flex items-start gap-4" {...props}>
                                        <div className="w-2 h-2 rounded-full bg-primary mt-2.5 shrink-0 shadow-sm" />
                                        <div className="leading-relaxed flex-1">{props.children}</div>
                                    </li>
                                ),
                                hr: ({ node, ...props }) => <hr className="my-14 border-t-2 border-border/40 border-dashed" {...props} />,
                                table: ({ node, ...props }) => (
                                    <div className="w-full overflow-x-auto my-10 rounded-2xl border border-border/50 bg-card shadow-sm">
                                        <table className="w-full text-sm text-left border-collapse" {...props} />
                                    </div>
                                ),
                                th: ({ node, ...props }) => <th className="bg-muted/50 px-6 py-4 font-bold text-foreground border-b border-border/50 whitespace-nowrap" {...props} />,
                                td: ({ node, ...props }) => <td className="px-6 py-4 border-b border-border/20 text-muted-foreground last:border-0" {...props} />,
                                blockquote: ({ node, ...props }) => (
                                    <blockquote className="border-l-4 border-primary bg-primary/5 p-6 rounded-r-2xl my-8 text-foreground/90 italic shadow-sm" {...props} />
                                ),
                            }}
                        >
                            {selectedDoc.content}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Financial Analysis Gallery</h1>
                <p className="text-muted-foreground">รวมการวิเคราะห์ทางการเงินและข้อมูลเชิงลึก (Mock Data Preview)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockAnalyses.map((doc) => (
                    <div
                        key={doc.id}
                        onClick={() => setSelectedId(doc.id)}
                        className="group relative flex flex-col items-start gap-4 p-6 rounded-2xl border border-border/50 bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 cursor-pointer overflow-hidden isolate"
                    >
                        {/* Background glow effect on hover */}
                        <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

                        <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform duration-300">
                            <FileText className="w-6 h-6" />
                        </div>

                        <div className="space-y-3 flex-1">
                            <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors duration-300">
                                {doc.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                {doc.summary}
                            </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border/50 w-full flex items-center text-xs text-muted-foreground font-medium">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(doc.date).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
