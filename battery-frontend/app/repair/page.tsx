"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Save, ArrowRight } from "lucide-react";
import Link from "next/link";
import AccessGuard from "../components/AccessGuard";
import FileUpload from "../components/FileUpload";

export default function RepairPage() {
    const searchParams = useSearchParams();
    const [batteryId, setBatteryId] = useState(searchParams.get("id") || "");
    const [form, setForm] = useState({
        serviceDate: new Date().toISOString().slice(0, 16),
        serviceProviderId: "SERVICE-001",
        repairType: "ComponentReplacement",
        postRepairSOH: 98,
        technicianSignature: "",
        telemetry: {
            vAvg: 3.7,
            vMin: 3.2,
            vMax: 4.2,
            iAvg: 0.5,
            tAvg: 25,
            tMin: 20,
            tMax: 35
        },
        healthRestorationFactor: 5
    });
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [lifecycleState, setLifecycleState] = useState<string | null>(null);
    const [attachment, setAttachment] = useState<any>(null);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    const checkBatteryStatus = async (id: string) => {
        if (!id) return;
        setCheckingStatus(true);
        setError("");
        try {
            const res = await fetch(`http://localhost:4000/verify/${id}`);
            if (!res.ok) throw new Error("Battery ID not found");
            const data = await res.json();

            if (data.report?.isSold) {
                setLifecycleState("Sold - Locked");
                setError("This battery is already sold. No further maintenance records are allowed.");
            } else if (data.status === 3) {
                setLifecycleState("Deactivated");
            } else if (data.status === 2) {
                setLifecycleState("Recycled");
            } else if (data.status === 1) {
                setLifecycleState("SecondLife");
            } else {
                setLifecycleState("Active");
            }
        } catch (err: any) {
            setError(err.message);
            setLifecycleState(null);
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
            serviceDate: new Date(form.serviceDate).toISOString(),
            serviceProviderId: form.serviceProviderId,
            repairType: form.repairType,
            postRepairSOH: Number(form.postRepairSOH),
            technicianSignature: form.technicianSignature,
            attachment,
            replacedComponents: [],
            telemetry: form.telemetry,
            healthRestorationFactor: Number(form.healthRestorationFactor)
        };

        try {
            const res = await fetch(`http://localhost:4000/api/passport/repair/${batteryId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Repair logging failed");
            }
            setResult(await res.json());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AccessGuard requiredRole="SERVICE">
            <div className="min-h-screen bg-gray-50/50">
                <main className="max-w-2xl mx-auto px-6 py-12">
                    <Link href={`/verify?id=${batteryId}`} className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors mb-6 group">
                        <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        Back to Verification
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">Log Repair</h1>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="flex gap-2">
                                <input
                                    required
                                    value={batteryId}
                                    onChange={e => setBatteryId(e.target.value)}
                                    onBlur={() => checkBatteryStatus(batteryId)}
                                    suppressHydrationWarning
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all font-medium"
                                    placeholder="Target Battery ID"
                                />
                                <button
                                    type="button"
                                    onClick={() => checkBatteryStatus(batteryId)}
                                    disabled={checkingStatus}
                                    className="px-4 bg-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50 text-xs"
                                >
                                    {checkingStatus ? "..." : "Check"}
                                </button>
                            </div>

                            {lifecycleState && (
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${lifecycleState === "Deactivated" || lifecycleState === "Recycled"
                                    ? "bg-red-50 border-red-100 text-red-700"
                                    : lifecycleState === "Active" ? "bg-green-50 border-green-100 text-green-700"
                                        : "bg-blue-50 border-blue-100 text-blue-700"
                                    }`}>
                                    Current Status: {lifecycleState}
                                    {(lifecycleState === "Deactivated" || lifecycleState === "Recycled") && " (Updates Locked)"}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Service Date</label>
                                <input
                                    required
                                    type="datetime-local"
                                    value={form.serviceDate}
                                    onChange={e => setForm({ ...form, serviceDate: e.target.value })}
                                    suppressHydrationWarning
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Provider ID</label>
                                    <input
                                        required
                                        value={form.serviceProviderId}
                                        onChange={e => setForm({ ...form, serviceProviderId: e.target.value })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Repair Type</label>
                                    <select
                                        required
                                        value={form.repairType}
                                        onChange={e => setForm({ ...form, repairType: e.target.value })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all appearance-none"
                                    >
                                        <option value="ComponentReplacement">Component Replacement</option>
                                        <option value="SoftwareUpdate">Software Update</option>
                                        <option value="Inspection">Inspection</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Post-Repair SOH</label>
                                    <input
                                        required
                                        type="number"
                                        value={form.postRepairSOH}
                                        onChange={e => setForm({ ...form, postRepairSOH: Number(e.target.value) })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Technician</label>
                                    <input
                                        required
                                        value={form.technicianSignature}
                                        onChange={e => setForm({ ...form, technicianSignature: e.target.value })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 my-8" />

                            <div className="space-y-6">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Diagnostic Telemetry Snapshot (Post-Repair)</label>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Avg Voltage (V)</label>
                                        <input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.vAvg} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, vAvg: parseFloat(e.target.value) } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Min Voltage</label>
                                        <input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.vMin} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, vMin: parseFloat(e.target.value) } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Max Voltage</label>
                                        <input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.vMax} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, vMax: parseFloat(e.target.value) } })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Avg Temp (°C)</label>
                                        <input type="number" step="0.1" className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.tAvg} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, tAvg: parseFloat(e.target.value) } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Min Temp</label>
                                        <input type="number" step="0.1" className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.tMin} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, tMin: parseFloat(e.target.value) } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Max Temp</label>
                                        <input type="number" step="0.1" className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.tMax} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, tMax: parseFloat(e.target.value) } })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mean Discharge (A)</label>
                                    <input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.iAvg} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, iAvg: parseFloat(e.target.value) } })} />
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 my-8" />

                            <div className="space-y-6">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Maintenance Optimization</label>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Health Restoration Factor</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs font-bold outline-none"
                                            value={form.healthRestorationFactor}
                                            onChange={e => setForm({ ...form, healthRestorationFactor: Number(e.target.value) })}
                                        />
                                        <span className="absolute right-3 top-3 text-[10px] text-gray-400 font-bold">% Est. Gain</span>
                                    </div>
                                    <p className="text-[9px] text-gray-400 font-medium italic">Estimated Health improvement based on service performed.</p>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 my-8" />
                            <FileUpload
                                onUploadSuccess={(file: any) => setAttachment(file)}
                                label="Diagnostic Report / Maintenance Record (PDF)"
                            />

                            <div className="h-px bg-gray-100 my-8" />

                            <button
                                type="submit"
                                disabled={loading || lifecycleState === "Deactivated" || lifecycleState === "Recycled" || lifecycleState === "Sold - Locked" || checkingStatus}
                                suppressHydrationWarning
                                className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${lifecycleState === "Deactivated" || lifecycleState === "Recycled" || lifecycleState === "Sold - Locked"
                                    ? "bg-gray-400 cursor-not-allowed opacity-50"
                                    : "bg-gray-900 text-white hover:bg-black hover:shadow-xl active:scale-95"
                                    }`}
                            >
                                {loading ? "Processing..." : (
                                    <>
                                        {lifecycleState === "Deactivated" || lifecycleState === "Recycled" || lifecycleState === "Sold - Locked" ? `Battery Locked - ${lifecycleState}` : "Log Repair"}
                                    </>
                                )}
                            </button>

                            {result && (
                                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 text-green-800">
                                    <div className="bg-green-100 p-2 rounded-full"><Save className="w-4 h-4" /></div>
                                    <p className="font-bold">Repair Logged Successfully</p>
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
