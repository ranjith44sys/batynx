"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, User, ShieldAlert, ArrowRight } from "lucide-react";
import Link from "next/link";
import AccessGuard from "../components/AccessGuard";

export default function TransferPage() {
    const searchParams = useSearchParams();
    const [batteryId, setBatteryId] = useState(searchParams.get("id") || "");
    const [form, setForm] = useState({
        toOwner: "",
        transferDate: new Date().toISOString().slice(0, 16),
        updatedSOH: 100,
        sellerSignature: "",
        buyerSignature: ""
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
                    setError("This battery is already sold and ownership is locked. No further transfers are allowed.");
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

        try {
            const res = await fetch(`http://localhost:4000/api/passport/transfer/${batteryId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    transferDate: new Date(form.transferDate).toISOString(),
                    updatedSOH: Number(form.updatedSOH),
                    fromOwner: "0x123..." // This should eventually come from the contract
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Transfer failed");
            }
            setResult(await res.json());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AccessGuard requiredRole={["ADMIN", "OWNER"]}>
            <div className="min-h-screen bg-gray-50/50">
                <main className="max-w-2xl mx-auto px-6 py-12">
                    <Link href={`/verify?id=${batteryId}`} className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors mb-6 group">
                        <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        Back to Verification
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">Transfer Ownership</h1>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Battery Passport ID</label>
                                <input
                                    required
                                    value={batteryId}
                                    onChange={e => setBatteryId(e.target.value)}
                                    onBlur={() => checkBatteryStatus(batteryId)}
                                    suppressHydrationWarning
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all font-medium"
                                    placeholder="Target ID (e.g. BAT-101)"
                                />
                                {checkingStatus && <p className="text-[10px] text-gray-400 mt-1 animate-pulse font-bold">Checking ledger status...</p>}
                            </div>

                            <div className="h-px bg-gray-100" />

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">New Owner Address</label>
                                <div className="relative">
                                    <input
                                        required
                                        value={form.toOwner}
                                        onChange={e => setForm({ ...form, toOwner: e.target.value })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pl-11 text-gray-900 focus:outline-none focus:border-gray-900 transition-all font-mono text-sm"
                                        placeholder="0x..."
                                    />
                                    <User className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Transfer Date</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        value={form.transferDate}
                                        onChange={e => setForm({ ...form, transferDate: e.target.value })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Current SOH (%)</label>
                                    <input
                                        required
                                        type="number"
                                        value={form.updatedSOH}
                                        onChange={e => setForm({ ...form, updatedSOH: Number(e.target.value) })}
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Seller Signature</label>
                                    <input
                                        required
                                        value={form.sellerSignature}
                                        onChange={e => setForm({ ...form, sellerSignature: e.target.value })}
                                        suppressHydrationWarning
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all italic border-dashed"
                                        placeholder="Electronic Sign"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Buyer Signature</label>
                                    <input
                                        required
                                        value={form.buyerSignature}
                                        onChange={e => setForm({ ...form, buyerSignature: e.target.value })}
                                        suppressHydrationWarning
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-900 transition-all italic border-dashed"
                                        placeholder="Electronic Sign"
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-2xl flex items-start gap-3">
                                <ShieldAlert className="w-5 h-5 text-gray-400 mt-0.5" />
                                <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                                    This action will permanently transfer the blockchain token and all associated metadata to the new owner's wallet address. This process is irreversible.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || isSold || checkingStatus}
                                suppressHydrationWarning
                                className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isSold
                                    ? "bg-gray-400 cursor-not-allowed opacity-50"
                                    : "bg-gray-900 text-white hover:bg-black hover:shadow-xl active:scale-95"}`}
                            >
                                {loading ? "Authorizing..." : (
                                    <>
                                        {isSold ? "Transfer Locked - Battery Sold" : "Complete Transfer"} <Send className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            {result && (
                                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-blue-800 flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full"><Send className="w-4 h-4" /></div>
                                    <div>
                                        <p className="font-bold">Transfer Initiated</p>
                                        <p className="text-xs opacity-75 font-mono">Blockchain Hash: {result.txHash}</p>
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
