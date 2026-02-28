"use client";

import { useState } from "react";
import { ArrowRight, Save } from "lucide-react";
import AccessGuard from "../components/AccessGuard";
import FileUpload from "../components/FileUpload";

export default function ManufacturePage() {
    const [batteryId, setBatteryId] = useState("");
    const [form, setForm] = useState({
        serialNumber: "",
        chemistryType: "LFP",
        capacityKWh: 60,
        manufacturingDate: new Date().toISOString().split('T')[0],
        manufacturerId: "MFG-12345",
        carbonAmount: 100,
        ownerAddress: "",
        telemetry: {
            vAvg: 3.8,
            vMin: 3.5,
            vMax: 4.2,
            iAvg: 0.1,
            tAvg: 22,
            tMin: 18,
            tMax: 26
        },
        cycleLifeExpectancy: 3000,
        maxChargeRate: 2.0
    });
    const [attachment, setAttachment] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setResult(null);

        const payload = {
            batteryId,
            ...form,
            attachment,
            capacityKWh: Number(form.capacityKWh),
            manufacturingDate: new Date(form.manufacturingDate).toISOString(),
            carbonFootprint: { amount: Number(form.carbonAmount), unit: "kgCO2e" },
            telemetry: form.telemetry,
            cycleLifeExpectancy: Number(form.cycleLifeExpectancy),
            maxChargeRate: Number(form.maxChargeRate)
        };

        try {
            const res = await fetch("http://localhost:4000/api/passport/manufacture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Manufacturing failed");
            }
            setResult(await res.json());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AccessGuard requiredRole="MANUFACTURER">
            <div className="min-h-screen bg-gray-50/50">
                <main className="max-w-2xl mx-auto px-6 py-12">
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">Register Battery</h1>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">System Identity</label>
                                <div className="space-y-4">
                                    <input
                                        required
                                        value={batteryId}
                                        onChange={e => setBatteryId(e.target.value)}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all font-medium"
                                        placeholder="Battery ID (e.g. BAT-101)"
                                    />
                                    <input
                                        required
                                        value={form.serialNumber}
                                        onChange={e => setForm({ ...form, serialNumber: e.target.value })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                                        placeholder="Serial Number"
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 my-8" />

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Technical Specs</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        required
                                        value={form.chemistryType}
                                        onChange={e => setForm({ ...form, chemistryType: e.target.value })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                                        placeholder="Chemistry"
                                    />
                                    <div className="relative">
                                        <input
                                            required
                                            type="number"
                                            value={form.capacityKWh}
                                            onChange={e => setForm({ ...form, capacityKWh: Number(e.target.value) })}
                                            suppressHydrationWarning
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                                            placeholder="Capacity"
                                        />
                                        <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-medium">kWh</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Mfg Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={form.manufacturingDate}
                                        onChange={e => setForm({ ...form, manufacturingDate: e.target.value })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Manufacturer</label>
                                    <input
                                        required
                                        value={form.manufacturerId}
                                        onChange={e => setForm({ ...form, manufacturerId: e.target.value })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                                        placeholder="ID"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Sustainability</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="number"
                                        value={form.carbonAmount}
                                        onChange={e => setForm({ ...form, carbonAmount: Number(e.target.value) })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                                    />
                                    <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-medium">kgCO2e</span>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 my-8" />

                            <FileUpload
                                onUploadSuccess={(file) => setAttachment(file)}
                                label="Technical Documentation (PDF)"
                            />

                            <div className="h-px bg-gray-100 my-8" />

                            <div className="h-px bg-gray-100 my-8" />

                            <div className="space-y-6">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Initial Performance Baseline</label>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Avg Voltage (V)</label>
                                        <input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.vAvg} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, vAvg: parseFloat(e.target.value) } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Min Voltage</label>
                                        <input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.vMin} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, vMin: parseFloat(e.target.value) } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Max Voltage</label>
                                        <input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.vMax} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, vMax: parseFloat(e.target.value) } })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Avg Temp (°C)</label>
                                        <input type="number" step="0.1" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.tAvg} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, tAvg: parseFloat(e.target.value) } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Min Temp</label>
                                        <input type="number" step="0.1" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.tMin} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, tMin: parseFloat(e.target.value) } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Max Temp</label>
                                        <input type="number" step="0.1" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.tMax} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, tMax: parseFloat(e.target.value) } })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mean Discharge (A)</label>
                                    <input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs font-bold outline-none" value={form.telemetry.iAvg} onChange={e => setForm({ ...form, telemetry: { ...form.telemetry, iAvg: parseFloat(e.target.value) } })} />
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 my-8" />

                            <div className="space-y-6">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Longevity Optimization Targets</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Cycle Life Expectancy</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs font-bold outline-none"
                                                value={form.cycleLifeExpectancy}
                                                onChange={e => setForm({ ...form, cycleLifeExpectancy: Number(e.target.value) })}
                                            />
                                            <span className="absolute right-3 top-3 text-[10px] text-gray-400 font-bold">Cycles</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Max Charge Rate (C)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs font-bold outline-none"
                                                value={form.maxChargeRate}
                                                onChange={e => setForm({ ...form, maxChargeRate: Number(e.target.value) })}
                                            />
                                            <span className="absolute right-3 top-3 text-[10px] text-gray-400 font-bold">C-Rate</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 my-8" />

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Owner Assignment</label>
                                <input
                                    required
                                    value={form.ownerAddress}
                                    onChange={e => setForm({ ...form, ownerAddress: e.target.value })}
                                    suppressHydrationWarning
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all font-mono text-sm"
                                    placeholder="Initial Owner Address (0x...)"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                suppressHydrationWarning
                                className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black disabled:opacity-50 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? "Registering..." : (
                                    <>
                                        Mint Passport <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>

                            {result && (
                                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 text-green-800">
                                    <div className="bg-green-100 p-2 rounded-full"><Save className="w-4 h-4" /></div>
                                    <div>
                                        <p className="font-bold">Passport Minted Successfully</p>
                                        <p className="text-xs opacity-75 font-mono mt-0.5">{result.txHash}</p>
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
