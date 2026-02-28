"use client";

import AccessGuard from "../components/AccessGuard";
import AgentChat from "../components/AgentChat";
import { BrainCircuit } from "lucide-react";

export default function AgentsPage() {
    return (
        <AccessGuard>
            <div className="min-h-screen bg-gray-50/50">
                <main className="max-w-5xl mx-auto px-6 py-8 md:py-12">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-6 border-b border-gray-200 gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-600 rounded-2xl shadow-sm hidden sm:block">
                                <BrainCircuit className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">AI Agent Ecosystem</h1>
                                <p className="text-gray-500 mt-1.5 text-lg font-medium">Interact with autonomous specialized models to manage your assets.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Agents Online</span>
                        </div>
                    </div>

                    {/* Chat Component Container */}
                    <div className="w-full max-w-4xl mx-auto">
                        <AgentChat />
                    </div>

                </main>
            </div>
        </AccessGuard>
    );
}
