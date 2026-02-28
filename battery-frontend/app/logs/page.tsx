"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { X, Activity, Zap, Clock, CheckCircle, AlertTriangle, FileText, TrendingUp, Database } from "lucide-react";

export default function LogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

    useEffect(() => {
        fetchLogs();
        // Refresh every 3 seconds for live updates
        const interval = setInterval(fetchLogs, 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await fetch("http://localhost:4000/api/logs/all");
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
                setError("");
            } else {
                setError("Failed to fetch logs from server");
            }
        } catch (err: any) {
            setError(err?.message || "Connection error");
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (idx: number) => {
        setExpandedLogs(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'MINT': return <Zap className="w-5 h-5" />;
            case 'USAGE': return <Activity className="w-5 h-5" />;
            case 'REPAIR': return <AlertTriangle className="w-5 h-5" />;
            case 'TRANSFER': return <TrendingUp className="w-5 h-5" />;
            case 'PURCHASE': return <CheckCircle className="w-5 h-5" />;
            case 'RECYCLE': return <Database className="w-5 h-5" />;
            default: return <Database className="w-5 h-5" />;
        }
    };

    const getTypeStyle = (type: string) => {
        switch (type) {
            case 'MINT': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'USAGE': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
            case 'REPAIR': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
            case 'TRANSFER': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
            case 'PURCHASE': return 'bg-pink-500/10 text-pink-600 border-pink-500/20';
            case 'RECYCLE': return 'bg-gray-700/10 text-gray-700 border-gray-700/20';
            default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            {/* Header */}
            <header className="border-b border-gray-200 sticky top-0 z-30 backdrop-blur-xl bg-white/90">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/portal" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl shadow-lg">
                                <FileText className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-gray-900">Chain Activity Monitor</h1>
                                <p className="text-xs text-gray-500 font-semibold mt-0.5">Real-time blockchain transaction ledger</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                            <span className="text-emerald-700 text-sm font-black uppercase tracking-wider">Live</span>
                        </div>
                        <div className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl">
                            <span className="text-gray-700 text-sm font-black">{logs.length} Events</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                {error && (
                    <div className="mb-8 bg-red-50 border-2 border-red-200 rounded-2xl p-6 flex items-center gap-4">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                        <div>
                            <p className="font-black text-red-900">Connection Error</p>
                            <p className="text-red-700 text-sm font-medium mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {loading && logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 space-y-5">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                            <div className="w-16 h-16 border-4 border-t-gray-900 rounded-full animate-spin absolute top-0"></div>
                        </div>
                        <p className="text-gray-600 font-bold text-lg">Loading transaction history...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-40 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-300">
                        <Clock className="w-20 h-20 text-gray-400 mx-auto mb-8" />
                        <h3 className="text-3xl font-black text-gray-600">No Activity Yet</h3>
                        <p className="text-gray-500 font-semibold mt-3 text-lg">Blockchain events will appear here in real-time</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-gray-900">Recent Transactions</h2>
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full border border-gray-200">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Auto-refresh: 3s</span>
                            </div>
                        </div>

                        {logs.map((log, idx) => (
                            <div
                                key={idx}
                                className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:border-gray-900 transition-all duration-500 group"
                            >
                                <div className="p-8">
                                    <div className="flex items-start gap-8">
                                        <div className={`p-5 rounded-3xl border-2 ${getTypeStyle(log.type)} group-hover:scale-105 transition-transform duration-500`}>
                                            {getTypeIcon(log.type)}
                                        </div>

                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <span className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border-2 ${getTypeStyle(log.type)}`}>
                                                        {log.type}
                                                    </span>
                                                    {log.batteryId && (
                                                        <span className="text-gray-900 text-sm font-black font-mono bg-gray-50 border border-gray-100 px-4 py-1.5 rounded-xl">
                                                            {log.batteryId}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-gray-400 text-xs font-bold flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </span>
                                            </div>

                                            <p className="text-gray-800 font-bold text-xl leading-snug tracking-tight">
                                                {log.details}
                                            </p>

                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => toggleExpand(idx)}
                                                    className="flex items-center gap-2 text-xs font-black text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-widest"
                                                >
                                                    {expandedLogs[idx] ? "Hide Technical Details" : "View Technical Details"}
                                                    <TrendingUp className={`w-4 h-4 transition-transform duration-500 ${expandedLogs[idx] ? 'rotate-180' : ''}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Technical Details Panel */}
                                    {expandedLogs[idx] && (
                                        <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <FileText className="w-3 h-3" /> Contract Call
                                                    </p>
                                                    <code className="text-sm font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                                                        {log.contractCall || "BatteryPassport#addEvent"}
                                                    </code>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <Activity className="w-3 h-3" /> Transaction Hash
                                                    </p>
                                                    <p className="text-xs font-mono text-gray-600 break-all leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                        {log.txHash || "N/A"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Block Number</p>
                                                        <p className="text-sm font-black text-gray-900">#{log.blockNumber || "Pending"}</p>
                                                    </div>
                                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Gas Used</p>
                                                        <p className="text-sm font-black text-gray-900">{log.gasUsed || "N/A"} units</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Network Path</p>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                                                            <p className="text-[10px] font-mono text-gray-500 truncate" title={log.from}>
                                                                <span className="font-bold text-gray-800 mr-2">From:</span> {log.from || "N/A"}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                                            <p className="text-[10px] font-mono text-gray-500 truncate" title={log.to}>
                                                                <span className="font-bold text-gray-800 mr-2">To:</span> {log.to || "N/A"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
