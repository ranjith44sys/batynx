"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Activity, Zap, ShieldCheck,
    AlertCircle, Compass, Gauge, Clock,
    ChevronRight, Info, CheckCircle2
} from "lucide-react";

export default function AnalyzePage() {
    const params = useParams();
    const router = useRouter();
    const batteryId = params.id as string;

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [creditScore, setCreditScore] = useState<any>(null);
    const [optimization, setOptimization] = useState<any>(null);
    const [error, setError] = useState("");

    const loadAllAIs = async () => {
        if (!batteryId) return;
        setLoading(true);
        setError("");

        const encodedId = encodeURIComponent(batteryId);

        try {
            // 1. Fetch telemetry and Health/UseCase
            const healthRes = await fetch(`http://localhost:4000/api/ai/latest-telemetry/${encodedId}`);
            if (healthRes.ok) {
                const telemetry = await healthRes.json();

                const analyzeRes = await fetch("http://localhost:4000/api/ai/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ batteryId, ...telemetry })
                });
                if (analyzeRes.ok) setResult(await analyzeRes.json());
            }

            // 2. Fetch Credit Score
            const creditRes = await fetch(`http://localhost:4000/api/ai/credit-score/${encodedId}`);
            if (creditRes.ok) setCreditScore(await creditRes.json());

            // 3. Fetch Optimization Constraints
            const optRes = await fetch(`http://localhost:4000/api/ai/optimization/${encodedId}`);
            if (optRes.ok) setOptimization(await optRes.json());

        } catch (err) {
            setError("Connectivity interruption: Could not reach the AI Diagnostic Service.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllAIs();
    }, [batteryId]);

    return (
        <div className="min-h-screen bg-white text-slate-900 pb-20 font-sans selection:bg-blue-100">
            {/* Minimal Header */}
            <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 text-slate-500" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">AI Diagnostic Report</h1>
                            <p className="text-[10px] font-mono text-slate-400">BATCH_NODE: {batteryId?.toUpperCase()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">Live Audit</span>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12">
                {error && (
                    <div className="mb-10 p-6 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <p className="text-sm font-medium text-red-700">{error}</p>
                    </div>
                )}

                {loading && !result && (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6">
                        <div className="w-12 h-12 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-sm font-medium text-slate-400 font-mono tracking-widest uppercase italic">Synthesizing Neural Weights...</p>
                    </div>
                )}

                {result && (
                    <div className="space-y-10 animate-in fade-in duration-700">
                        {/* Section 1: Core Health (SAP Model) */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Health & Use-Case (SAP)</h2>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="p-8 rounded-3xl border border-slate-100 bg-slate-50 shadow-sm flex flex-col justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">State of Health</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-7xl font-bold text-slate-900 tracking-tighter">{result.soh}%</span>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-500 bg-white/50 p-3 rounded-xl border border-white">
                                        <Info className="w-3.5 h-3.5 text-blue-500" />
                                        <span>RUL Prediction: <b>{result.rul} cycles</b></span>
                                    </div>
                                </div>
                                <div className="p-8 rounded-3xl border border-slate-100 bg-slate-50 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Classification</p>
                                    <h3 className="text-4xl font-bold text-slate-900 mb-3">{result.band}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed italic border-l-2 border-emerald-500/20 pl-4">
                                        "{result.recommendation}"
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Financial Reliability */}
                        {creditScore && (
                            <section className="space-y-4 pt-10 border-t border-slate-50">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Reliability Audit</h2>
                                </div>
                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="p-8 rounded-3xl border border-slate-100 bg-slate-50 shadow-sm overflow-hidden relative">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Credit Score</p>
                                        <p className="text-6xl font-bold text-slate-900 tracking-tighter">{creditScore.creditScore}/100</p>
                                    </div>
                                    <div className="md:col-span-2 p-8 rounded-3xl border border-slate-100 bg-slate-50 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 text-center md:text-left">Risk Grade</p>
                                            <div className="flex items-center gap-4">
                                                <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xl font-bold italic">
                                                    {creditScore.grade}
                                                </div>
                                                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">{creditScore.riskLevel}</p>
                                            </div>
                                        </div>
                                        <div className="hidden md:block p-4 border border-dashed border-slate-200 rounded-2xl max-w-xs transition-opacity opacity-60 hover:opacity-100">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase italic">
                                                {creditScore.reasoning}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Section 3: Longevity Constraints */}
                        {optimization && (
                            <section className="space-y-4 pt-10 border-t border-slate-50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Compass className="w-4 h-4 text-blue-500" />
                                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Optimization Guide</h2>
                                </div>
                                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-10 opacity-10">
                                        <Zap className="w-40 h-40 text-blue-400" />
                                    </div>
                                    <div className="relative z-10 grid md:grid-cols-3 gap-8 mb-10 pb-10 border-b border-white/10 border-dashed">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-blue-300 uppercase tracking-[0.2em]">Max SoC Ceiling</p>
                                            <p className="text-4xl font-bold italic">{optimization.recommended_max_soc}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-amber-300 uppercase tracking-[0.2em]">Peak Charge Rate</p>
                                            <p className="text-4xl font-bold italic">{optimization.optimal_charge_rate}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-emerald-300 uppercase tracking-[0.2em]">ROI Extension</p>
                                            <p className="text-4xl font-bold italic text-emerald-400">+{optimization.estimated_life_extension}</p>
                                        </div>
                                    </div>
                                    <div className="relative z-10 space-y-3">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Guidance Rationale</p>
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {optimization.reasoning.map((r: string, i: number) => (
                                                <div key={i} className="flex items-start gap-2 text-xs font-medium text-slate-400 italic">
                                                    <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                                                    {r}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}

                <footer className="mt-20 pt-10 border-t border-slate-50 text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] leading-relaxed">
                        Neural predictions are non-binding approximations.
                        <br />Verification recommended via physical impedance spectroscopy.
                    </p>
                </footer>
            </main>
        </div>
    );
}
