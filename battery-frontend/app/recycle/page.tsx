"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Recycle as RecycleIcon, Battery, ArrowRight } from "lucide-react";
import Link from "next/link";
import AccessGuard from "../components/AccessGuard";

export default function RecyclePage() {
    const searchParams = useSearchParams();
    const [batteryId, setBatteryId] = useState(searchParams.get("id") || "");
    const [form, setForm] = useState({
        decommissionDate: new Date().toISOString().split('T')[0],
        recyclingFacilityId: "RECYCLE-BASE-01",
        reason: "EndOfLife",
        finalState: "Recycled",
        recoveredMaterials: "Lithium, Cobalt, Nickel"
    });
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [isSold, setIsSold] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    const checkBatteryStatus = async (id: string) => {
        if (!id) return;
        setCheckingStatus(true);
        setError("");
        setIsSold(false);
        try {
            const res = await fetch(`http://localhost:4000/verify/${id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.report?.isSold) {
                    setIsSold(true);
                    setError("This battery is already sold and belongs to the buyer. Permission to decommission or process for second-life must be authorized by the new owner.");
                }
            }
        } catch (err) {
            console.error("Status check failed", err);
        } finally {
            setCheckingStatus(false);
        }
    };

    useEffect(() => {
        if (batteryId) checkBatteryStatus(batteryId);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setResult(null);

        const payload = {
            decommissionDate: new Date(form.decommissionDate).toISOString(),
            recyclingFacilityId: form.recyclingFacilityId,
            finalSOH: 80, // Default or add to form
            finalState: form.finalState, // New field mapping
            recoveryPercentage: 95, // Default or add to form
            recoveredMaterials: form.recoveredMaterials.split(',').map(m => m.trim()),
            certificateOfDestruction: "CERT-" + Date.now()
        };

        try {
            const res = await fetch(`http://localhost:4000/api/passport/recycle/${batteryId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Recycle logging failed");
            }
            setResult(await res.json());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AccessGuard requiredRole="RECYCLER">
            <div className="min-h-screen bg-gray-50/50">
                <main className="max-w-2xl mx-auto px-6 py-12">
                    <Link href={`/verify?id=${batteryId}`} className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors mb-6 group">
                        <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        Back to Verification
                    </Link>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-red-900 p-3 rounded-2xl shadow-lg shadow-red-900/20">
                            <RecycleIcon className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">End of Life Utility</h1>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 italic">Decommissioning Target</label>
                                <div className="relative">
                                    <input
                                        required
                                        value={batteryId}
                                        onChange={e => setBatteryId(e.target.value)}
                                        onBlur={() => checkBatteryStatus(batteryId)}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pl-11 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-900/10 focus:border-red-900 transition-all font-mono font-bold"
                                        placeholder="BAT-XXXX-XXX"
                                    />
                                    <Battery className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
                                </div>
                                {checkingStatus && <p className="text-[10px] text-gray-400 mt-1 animate-pulse font-bold italic">Checking ownership locks...</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Facility ID</label>
                                    <input
                                        required
                                        value={form.recyclingFacilityId}
                                        onChange={e => setForm({ ...form, recyclingFacilityId: e.target.value })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Lifecycle State</label>
                                    <select
                                        required
                                        value={form.finalState}
                                        onChange={e => setForm({ ...form, finalState: e.target.value })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all font-bold"
                                    >
                                        <option value="SecondLife">Second-Life Reuse</option>
                                        <option value="Recycled">Recycling</option>
                                        <option value="Disposed">Disposal (Final)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Decommissioning Reason</label>
                                <select
                                    required
                                    value={form.reason}
                                    onChange={e => setForm({ ...form, reason: e.target.value })}
                                    suppressHydrationWarning
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                                >
                                    <option value="EndOfLife">End of Life (Normal)</option>
                                    <option value="Damage">Accidental Damage</option>
                                    <option value="Recall">Manufacturer Recall</option>
                                    <option value="Upgrade">Technology Upgrade</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Materials Recovered / Notes</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={form.recoveredMaterials}
                                    onChange={e => setForm({ ...form, recoveredMaterials: e.target.value })}
                                    suppressHydrationWarning
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all resize-none"
                                    placeholder="e.g. Lithium: 5kg, Cobalt: 2kg... or Second-life notes"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || isSold || checkingStatus}
                                suppressHydrationWarning
                                className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isSold
                                    ? "bg-gray-400 cursor-not-allowed opacity-50"
                                    : "bg-red-900 text-white hover:bg-black hover:shadow-xl active:scale-95"}`}
                            >
                                {loading ? "Processing..." : (
                                    <>
                                        {isSold ? "Operation Locked - Battery Sold" : "Update Battery Lifecycle State"}
                                    </>
                                )}
                            </button>

                            {result && (
                                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 text-green-800">
                                    <div className="bg-green-100 p-2 rounded-full"><RecycleIcon className="w-4 h-4" /></div>
                                    <div>
                                        <p className="font-bold">Lifecycle State Updated</p>
                                        <p className="text-[10px] opacity-75 font-mono italic">Battery is now marked as: {form.finalState}</p>
                                        <p className="text-[10px] opacity-75 font-mono">TX: {result.txHash}</p>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-900 text-sm font-medium">
                                    {error}
                                </div>
                            )}
                        </form>
                    </div>
                </main>
            </div>
        </AccessGuard>
    );
}
