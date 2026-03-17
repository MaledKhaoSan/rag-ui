"use client";

import { useState } from "react";
import { Sparkles, MessageSquare, Files, Plus, Trash2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatView } from "@/components/chat/chat-view";
import { DocumentView } from "@/components/documents/document-view";
import { KBProvider, useKB } from "@/components/kb-context";
import { MultiSelect } from "@/components/ui/multi-select";
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type ViewType = 'chat' | 'documents';

function PageContent() {
    const [view, setView] = useState<ViewType>('chat');
    const [createOpen, setCreateKBOpen] = useState(false);
    const [newKBName, setNewKBName] = useState("");
    const { knowledgeBases, selectedKBs, setSelectedKBs, createKB, deleteKB } = useKB();

    const handleCreateKB = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKBName.trim()) return;
        const sanitized = newKBName.trim().toLowerCase().replace(/\s+/g, "_");
        const success = await createKB(sanitized);
        if (success) {
            toast.success(`Knowledge base "${sanitized}" created`);
            setNewKBName("");
            setCreateKBOpen(false);
        } else {
            toast.error("Failed to create knowledge base");
        }
    };

    const handleDeleteKB = async () => {
        if (selectedKBs.length !== 1) {
            toast.error("Please select a single knowledge base to delete");
            return;
        }
        const kbName = selectedKBs[0];
        const success = await deleteKB(kbName);
        if (success) {
            toast.success(`Knowledge base "${kbName}" deleted`);
        } else {
            toast.error("Failed to delete knowledge base");
        }
    };

    const kbOptions = knowledgeBases.map(kb => ({
        label: kb.name,
        value: kb.name
    }));

    return (
        <div className="flex flex-col h-screen bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-50 overflow-hidden">
            {/* Header */}
            <header className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold tracking-tight">RAG Assistant</h1>
                        <p className="text-xs text-muted-foreground">Powered by Intelligent Router</p>
                    </div>
                </div>

                {/* KB Selector */}
                <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <div className="w-fit">
                        <MultiSelect
                            options={kbOptions}
                            selected={selectedKBs}
                            onChange={setSelectedKBs}
                            placeholder="All Knowledge Bases"
                            className="h-8 text-xs"
                        />
                    </div>

                    {/* Create KB Dialog */}
                    <Dialog open={createOpen} onOpenChange={setCreateKBOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" title="Create Knowledge Base">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm">
                            <form onSubmit={handleCreateKB}>
                                <DialogHeader>
                                    <DialogTitle>Create Knowledge Base</DialogTitle>
                                    <DialogDescription>
                                        Enter a name for the new knowledge base. It will create dedicated Qdrant collections and MinIO storage paths.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="kb-name">Name</Label>
                                        <Input
                                            id="kb-name"
                                            name="name"
                                            placeholder="e.g. hr, finance, legal"
                                            value={newKBName}
                                            onChange={(e) => setNewKBName(e.target.value)}
                                            autoFocus
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            Lowercase, no spaces. Will be auto-sanitized.
                                        </p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline" type="button">Cancel</Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={!newKBName.trim()}>Create</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete KB */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" title="Delete KB (Select exactly one)" disabled={selectedKBs.length !== 1}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Knowledge Base &quot;{selectedKBs[0] || ""}&quot;?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete all collections, vectors, and files in this knowledge base. This cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteKB}>
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                {/* View Switcher */}
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('chat')}
                        className={cn(
                            "gap-2 text-xs font-medium h-8 rounded-md transition-all",
                            view === 'chat'
                                ? "bg-white dark:bg-neutral-700 text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                        )}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('documents')}
                        className={cn(
                            "gap-2 text-xs font-medium h-8 rounded-md transition-all",
                            view === 'documents'
                                ? "bg-white dark:bg-neutral-700 text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                        )}
                    >
                        <Files className="w-3.5 h-3.5" />
                        Documents
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative">
                {view === 'chat' && <ChatView />}
                {view === 'documents' && <DocumentView />}
            </main>
        </div>
    );
}

export default function Page() {
    return (
        <KBProvider>
            <PageContent />
        </KBProvider>
    );
}
