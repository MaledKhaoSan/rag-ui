"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, FileText, Calendar, TrendingUp, TrendingDown, Minus, Badge } from "lucide-react";
import { BarChart } from "@mui/x-charts/BarChart";
import mockAnalyses from "./mokc_data.json";

export default function FinancePage() {
    const selectedDoc = mockAnalyses[0];
    const [activeTab, setActiveTab] = useState<string | null>(null);

    useEffect(() => {
        if (selectedDoc && selectedDoc.tabs && selectedDoc.tabs.length > 0) {
            setActiveTab(selectedDoc.tabs[0].id);
        } else {
            setActiveTab(null);
        }
    }, [selectedDoc]);

    const toneConfig = {
        positive: { bg: 'bg-[#0F6E56]/10', text: 'text-[#0F6E56]', border: 'border-[#0F6E56]', icon: TrendingUp, label: 'เชิงบวก' },
        negative: { bg: 'bg-[#E9706D]/10', text: 'text-[#E9706D]', border: 'border-[#E9706D]', icon: TrendingDown, label: 'เชิงลบ' },
        neutral: { bg: 'bg-[#BA7517]/10', text: 'text-[#BA7517]', border: 'border-[#BA7517]', icon: Minus, label: 'เป็นกลาง' }
    };

    const toneProps = selectedDoc.tone ? toneConfig[selectedDoc.tone as keyof typeof toneConfig] : null;
    const ToneIcon = toneProps?.icon || Minus;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white text-card-foreground">
                {/* Article Header */}
                <div className="mb-10 pb-10 border-b border-border/40 space-y-4">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                        {selectedDoc.title}
                    </h1>
                </div>

                {/* Interactive Tab Content */}
                {selectedDoc.tabs && selectedDoc.tabs.length > 0 && (
                    <div className="mt-8 mb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Trend Verdict Banner */}
                        {(selectedDoc as any).trendSummary && (
                            <div className={`flex items-start gap-4 px-5 py-8 md:px-6 md:py-10 mb-8 border-l-4 ${toneProps ? toneProps.border : 'border-muted'} bg-muted/50 shadow-sm`}>
                                <div className="flex-1 space-y-2">
                                    <div className={`flex flex-row justify-start items-center gap-3 text-sm font-semibold tracking-wide uppercase ${toneProps ? toneProps.text : 'text-muted-foreground'}`}>
                                        <h1 className="text-2xl">บทสรุปการวิเคราะห์</h1>
                                        {toneProps && (
                                            <div className={`inline-flex items-center h-fit gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${toneProps.bg} ${toneProps.text} ${toneProps.border}/30`}>
                                                ความเห็น: {toneProps.label}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-foreground text-base md:text-lg leading-relaxed font-medium">
                                        {(selectedDoc as any).trendSummary}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Key Figures Section */}
                        {(selectedDoc as any).keyFigures && (
                            <div className="mb-10">
                                <h4 className="text-[13px] font-bold tracking-wide text-foreground mb-6">
                                    ตัวเลขสำคัญ ปี {(selectedDoc as any).keyFiguresYear || "ล่าสุด"}
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4 md:gap-x-6">
                                    {(selectedDoc as any).keyFigures.map((fig: any, i: number) => {
                                        const valColor = fig.tone === 'positive'
                                            ? 'text-[#0F6E56]'
                                            : fig.tone === 'negative'
                                                ? 'text-[#E9706D]'
                                                : 'text-foreground';

                                        return (
                                            <div key={i} className="flex flex-col justify-evenly space-y-1.5 border rounded-xl py-6 px-4 shadow-sm bg-muted/50">
                                                <span className="text-sm font-medium text-muted-foreground">{fig.label}</span>
                                                <span className={`text-2xl tracking-tight font-semibold py-0.5 ${valColor}`}>
                                                    {fig.value}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Tabs Definition */}
                        <div className="flex items-center gap-2 mb-6 flex-wrap">
                            {selectedDoc.tabs.map((tab: any) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === tab.id
                                        ? 'bg-[#0F4E8F] text-white shadow-md'
                                        : 'bg-white text-muted-foreground border border-border/50 hover:bg-[#0F4E8F]/10 hover:text-[#0F4E8F]'
                                        }`}
                                >
                                    {tab.title}
                                </button>
                            ))}
                        </div>

                        {/* Tab Detail panel */}
                        {selectedDoc.tabs.map((tab: any) => {
                            if (activeTab !== tab.id) return null;

                            // Generate basic palette for charts (using CI base #0F4E8F, then alternates)
                            const colors = ['#0F4E8F', '#1D9E75', '#E24B4A', '#BA7517', '#B4B2A9'];

                            return (
                                <div key={tab.id} className="bg-white border border-border/60 shadow-sm rounded-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="mb-8 pb-6 border-b border-border/40 space-y-2">
                                        <h3 className="text-xl md:text-2xl font-bold text-[#0F4E8F]">{tab.title}</h3>
                                        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                                            {tab.summary}
                                        </p>
                                    </div>

                                    <div className="w-full h-[350px] md:h-[400px]">
                                        <BarChart
                                            xAxis={[{ scaleType: 'band', data: tab.chart.xAxis }]}
                                            series={tab.chart.series.map((s: any, idx: number) => ({
                                                data: s.data,
                                                label: s.label,
                                                color: colors[idx % colors.length]
                                            }))}
                                            grid={{ horizontal: true }}
                                            borderRadius={4}
                                            margin={{ top: 70, bottom: 30, left: 60, right: 20 }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="custom-article max-w-none text-base md:text-lg text-muted-foreground bg-white rounded-2xl border border-[#F9FAFB] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            h2: ({ node, ...props }) => (
                                <div className="flex items-center gap-4 mt-16 mb-8 group">
                                    <div className="h-8 md:h-10 w-2 bg-[#0F4E8F] rounded-full shadow-sm group-hover:scale-y-110 transition-transform"></div>
                                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground m-0" {...props} />
                                </div>
                            ),
                            p: ({ node, ...props }) => <p className="leading-relaxed mb-6 last:mb-0" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-semibold text-foreground bg-[#0F4E8F]/10 px-1.5 py-0.5 rounded-md" {...props} />,
                            ul: ({ node, ...props }) => <ul className="space-y-4 my-8 pl-2" {...props} />,
                            li: ({ node, ...props }) => (
                                <li className="flex items-start gap-4" {...props}>
                                    <div className="w-2 h-2 rounded-full bg-[#0F4E8F] mt-2.5 shrink-0 shadow-sm" />
                                    <div className="leading-relaxed flex-1">{props.children}</div>
                                </li>
                            ),
                            hr: ({ node, ...props }) => <hr className="my-14 border-t-2 border-border/40 border-dashed" {...props} />,
                            table: ({ node, ...props }) => (
                                <div className="w-full overflow-x-auto my-10 rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                                    <table className="w-full text-sm text-left border-collapse" {...props} />
                                </div>
                            ),
                            th: ({ node, ...props }) => <th className="bg-[#0F4E8F] text-white px-6 py-4 font-bold border-b border-[#0F4E8F]/20 whitespace-nowrap" {...props} />,
                            tr: ({ node, ...props }) => <tr className="border-b border-border/30 last:border-0 even:bg-[#F9FAFB] odd:bg-white hover:bg-slate-50 transition-colors" {...props} />,
                            td: ({ node, ...props }) => <td className="px-6 py-4 text-muted-foreground font-medium" {...props} />,
                            blockquote: ({ node, ...props }) => (
                                <blockquote className="border-l-4 border-[#0F4E8F] bg-[#0F4E8F]/5 p-6 rounded-r-2xl my-8 text-foreground/90 italic shadow-sm" {...props} />
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
