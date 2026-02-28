"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Battery, Activity, ShieldCheck, ArrowRight, AlertCircle, Trash2, ShieldAlert, Sparkles } from "lucide-react";
import AccessGuard from "../components/AccessGuard";

export default function DashboardPage() {
    const [batteryList, setBatteryList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("http://localhost:4000/api/passport/list")
            .then(res => res.json())
            .then(data => {
                setBatteryList(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <AccessGuard requiredRole="ADMIN">
            <div className="min-h-screen bg-gray-50/50">
                <main className="max-w-7xl mx-auto px-6 py-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-6 border-b border-gray-200 gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Active Batteries</h1>
                            <p className="text-gray-500 mt-2 text-lg">Monitor lifecycle events and verify asset integrity.</p>
                        </div>
                        <Link href="/manufacture" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm hover:bg-blue-700 hover:shadow-md transition-all">
                            + Register New Battery
                        </Link>
                    </div>

                    {loading ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-3xl animate-pulse" />)}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {batteryList.map((battery, i) => (
                                <Link
                                    key={i}
                                    href={`/verify?id=${battery.batteryId}`}
                                    className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group border border-gray-100"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="bg-gray-50 p-3 rounded-2xl group-hover:bg-blue-50 transition-colors">
                                            <Battery className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {battery.isSold && (
                                                <span className="text-[10px] font-black bg-red-100 text-red-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                    Sold
                                                </span>
                                            )}
                                            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full uppercase tracking-wider group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                                {battery.chemistryType}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                                        {battery.batteryId}
                                    </h3>
                                    <p className="text-sm text-gray-500 font-medium mb-6">{battery.manufacturer}</p>

                                    <div className="flex items-center justify-between text-xs text-gray-400 font-mono pt-4 border-t border-gray-50">
                                        <span>SN: {battery.serialNumber}</span>
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-4 flex gap-2">
                                        <Link
                                            href={`/agents?id=${battery.batteryId}`}
                                            className="flex-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1.5 border border-indigo-100">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                AI Analyze
                                            </button>
                                        </Link>
                                    </div>

                                    {/* Modern Roadmap Indicator */}
                                    <div className="mt-6 flex items-center justify-between px-1">
                                        {["MFG", "USE", "RPR", "TRN", "RCY"].map((step, idx) => (
                                            <div key={step} className="flex flex-col items-center gap-1.5">
                                                <div className={`w-2 h-2 rounded-full ring-2 ring-white ${idx === 0 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-gray-200"}`} />
                                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </AccessGuard>
    );
}
