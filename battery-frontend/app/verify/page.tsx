"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Calendar, Hash, ArrowRight, ShieldCheck, ShoppingCart, Tag, Download, FileText } from "lucide-react";
import AccessGuard from "../components/AccessGuard";
import { useAuth } from "../context/AuthContext";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function VerifyPage() {
    const router = useRouter();
    const { selectedRole } = useAuth();
    const searchParams = useSearchParams();
    const from = searchParams.get("from");
    console.log("[VerifyPage] Referred from:", from);
    const [batteryId, setBatteryId] = useState(searchParams.get("id") || "");
    const [verifyResult, setVerifyResult] = useState<any>(null);
    const [batteryHistory, setBatteryHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleVerify = async () => {
        if (!batteryId) return;

        setLoading(true);
        setError("");
        setVerifyResult(null);
        setBatteryHistory([]);

        try {
            const res = await fetch(`http://localhost:4000/verify/${batteryId}`);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.details || errorData.error || "Battery not found");
            }

            const data = await res.json();
            setVerifyResult(data);

            const histRes = await fetch(`http://localhost:4000/api/passport/history/${batteryId}`);
            if (histRes.ok) {
                const histData = await histRes.json();
                setBatteryHistory(histData);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!verifyResult || !batteryHistory.length) return;

        const doc = new jsPDF();
        const isTampered = !verifyResult.integrity;

        // Header
        doc.setFontSize(22);
        if (isTampered) {
            doc.setTextColor(220, 0, 0);
            doc.text("⚠️ TAMPERED Battery Passport Ledger", 14, 20);
        } else {
            doc.setTextColor(0, 0, 0);
            doc.text("Battery Passport Ledger", 14, 20);
        }

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

        if (isTampered) {
            doc.setFontSize(12);
            doc.setTextColor(220, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text("WARNING: This document contains data that does NOT match the blockchain hash.", 14, 34);
            doc.setFont("helvetica", "normal");
        }

        // Asset Info
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Asset Summary", 14, 42);

        const summaryData = [
            ["Battery ID", batteryId],
            ["Authenticity", isTampered ? "⚠️ FAILED / TAMPERED" : "✅ VERIFIED"],
            ["Blockchain Sync", verifyResult.integrity ? "Symmetric" : "Mismatch Detected"],
            ["Current Status", verifyResult.status === 3 ? "DECOMMISSIONED" : (verifyResult.report?.isSold ? "SOLD" : "ACTIVE")]
        ];

        autoTable(doc, {
            startY: 47,
            head: [["Field", "Value"]],
            body: summaryData,
            theme: 'striped',
            headStyles: { fillColor: isTampered ? [220, 0, 0] : [40, 40, 40] }
        });

        // Lifecycle Events
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Lifecycle History (Audit Trail)", 14, (doc as any).lastAutoTable.finalY + 15);

        const tableBody = batteryHistory.map((evt) => {
            const date = new Date(evt.timestamp * 1000).toLocaleString();
            const type = getEventType(evt);
            const isEventTampered = verifyResult.tamperedEvents?.includes(evt.index);

            let dataDetails = "";
            if (evt.data) {
                dataDetails = Object.entries(evt.data)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ");
            } else {
                dataDetails = "DATA MISSING OR UNREADABLE";
            }

            return [
                date,
                isEventTampered ? `⚠️ ${type} (TAMPERED)` : type,
                dataDetails
            ];
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [["Timestamp", "Event Type", "Details"]],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [60, 60, 60] },
            columnStyles: {
                1: { cellWidth: 40 },
                2: { cellWidth: 100 }
            },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 1) {
                    const rowIndex = data.row.index;
                    if (verifyResult.tamperedEvents?.includes(batteryHistory[rowIndex]?.index)) {
                        data.cell.styles.textColor = [220, 0, 0];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        if (isTampered) {
            doc.setFontSize(14);
            doc.setTextColor(220, 0, 0);
            doc.text("Tamper Audit Report", 14, (doc as any).lastAutoTable.finalY + 15);

            doc.setFontSize(10);
            doc.setTextColor(0);
            const tamperText = `The following recovery points in the battery's history have been modified or corrupted:\n` +
                verifyResult.tamperedEvents.map((idx: number) => {
                    const evt = batteryHistory.find(h => h.index === idx);
                    return `- Event #${idx}: ${getEventType(evt)} (Hash Mismatch)`;
                }).join("\n");

            const splitText = doc.splitTextToSize(tamperText, 180);
            doc.text(splitText, 14, (doc as any).lastAutoTable.finalY + 22);
        }

        const filename = isTampered ? `TAMPERED_${batteryId}_Ledger.pdf` : `${batteryId}_Ledger.pdf`;
        doc.save(filename);
    };


    const getEventType = (evt: any) => {
        if (evt.index === 0) return "MANUFACTURING";
        if (evt.data?.buyerName !== undefined) return "BATTERY SOLD";
        if (evt.data?.mileage !== undefined) return "USAGE SNAPSHOT";
        if (evt.data?.repairType !== undefined) return "REPAIR / SERVICE";
        if (evt.data?.toOwner !== undefined) return "OWNERSHIP TRANSFER";
        if (evt.data?.recyclingFacilityId !== undefined) return "DECOMMISSION";
        return "UNKNOWN EVENT";
    };

    const getEventIcon = (evt: any) => {
        if (evt.index === 0) return <Hash className="w-5 h-5 text-purple-600" />;
        if (evt.data?.buyerName !== undefined) return <ShoppingCart className="w-5 h-5 text-green-600" />;
        if (evt.data?.mileage !== undefined) return <Clock className="w-5 h-5 text-blue-600" />;
        if (evt.data?.repairType !== undefined) return <Calendar className="w-5 h-5 text-amber-600" />;
        if (evt.data?.toOwner !== undefined) return <Tag className="w-5 h-5 text-emerald-600" />;
        if (evt.data?.recyclingFacilityId !== undefined) return <XCircle className="w-5 h-5 text-red-600" />;
        return <Calendar className="w-5 h-5 text-gray-400" />;
    };

    useEffect(() => {
        if (searchParams.get("id")) {
            handleVerify();
        }
    }, []);

    return (
        <AccessGuard>
            <div className="min-h-screen bg-gray-50/50">
                <main className="max-w-4xl mx-auto px-6 py-12">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                        <div className="flex gap-4">
                            <Link href="/portal" className="text-sm font-bold text-gray-400 hover:text-gray-900 flex items-center gap-2">
                                <ArrowRight className="w-4 h-4 rotate-180" /> Portal
                            </Link>
                            {from === "marketplace" && (
                                <Link href="/marketplace" className="text-sm font-bold text-gray-900 flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg group">
                                    <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Marketplace
                                </Link>
                            )}
                        </div>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">Verify Asset</h1>

                    {/* Search Bar */}
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-200 flex gap-2 mb-8">
                        <input
                            type="text"
                            placeholder="Enter Battery ID (e.g. BAT-101)"
                            value={batteryId}
                            onChange={(e) => setBatteryId(e.target.value)}
                            suppressHydrationWarning
                            className="flex-1 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-gray-50 transition-colors"
                        />
                        <button
                            onClick={handleVerify}
                            disabled={loading}
                            suppressHydrationWarning
                            className="px-8 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all shadow-md"
                        >
                            {loading ? "Verifying..." : "Verify"}
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-700 mb-8 flex items-center gap-3">
                            <XCircle className="w-6 h-6" />
                            {error}
                        </div>
                    )}

                    {verifyResult && (
                        <div className="space-y-8">
                            {/* Integrity Status */}
                            <div className={`rounded-3xl p-8 flex items-center justify-between gap-6 ${verifyResult.integrity
                                ? "bg-gradient-to-br from-green-50 to-green-100 border border-green-200"
                                : "bg-gradient-to-br from-red-50 to-red-100 border border-red-200"
                                }`}>
                                <div className="flex items-center gap-6">
                                    <div className={`p-4 rounded-full ${verifyResult.integrity ? "bg-green-200 text-green-700" : "bg-red-200 text-red-700"}`}>
                                        {verifyResult.integrity ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-bold ${verifyResult.integrity ? "text-green-900" : "text-red-900"}`}>
                                            {verifyResult.integrity ? "Authenticity Verified" : "Data Integrity Failed"}
                                        </h3>
                                        <p className={`text-sm font-mono mt-2 break-all ${verifyResult.integrity ? "text-green-700" : "text-red-700"}`}>
                                            {verifyResult.onChainHash}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-3">
                                    <button
                                        onClick={handleDownloadPDF}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-sm group border ${verifyResult.integrity
                                            ? "bg-white text-green-700 border-green-200 hover:bg-green-50"
                                            : "bg-red-600 text-white border-red-700 hover:bg-red-700"
                                            }`}
                                    >
                                        <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                                        {verifyResult.integrity ? "Download Ledger PDF" : "Download Tamper Report"}
                                    </button>

                                    {verifyResult.status === 3 && (
                                        <div className="bg-gray-900 text-white px-6 py-3 rounded-2xl flex items-center gap-3 animate-pulse">
                                            <XCircle className="w-6 h-6 text-red-400" />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black uppercase tracking-widest">Final State reached</span>
                                                <span className="text-lg font-bold">DECOMMISSIONED</span>
                                            </div>
                                        </div>
                                    )}
                                    {verifyResult.report?.isSold && (
                                        <div className="bg-amber-900 text-white px-6 py-3 rounded-2xl flex items-center gap-3 animate-pulse">
                                            <CheckCircle2 className="w-6 h-6 text-amber-400" />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black uppercase tracking-widest">Ownership Locked</span>
                                                <span className="text-lg font-bold">SOLD</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons based on Role */}
                            {verifyResult.integrity && !verifyResult.isDecommissioned && !verifyResult.report?.isSold &&
                                ['SERVICE', 'OWNER', 'RECYCLER'].includes(selectedRole || '') && (
                                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Available Actions</h3>
                                        <div className="flex flex-wrap gap-4">
                                            {selectedRole === 'SERVICE' && (
                                                <button
                                                    onClick={() => router.push(`/usage?id=${batteryId}`)}
                                                    className="flex items-center gap-2 bg-gray-50 text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95 border border-gray-200"
                                                >
                                                    <Clock className="w-5 h-5" />
                                                    Log Usage Snapshot
                                                </button>
                                            )}
                                            {selectedRole === 'SERVICE' && (
                                                <button
                                                    onClick={() => router.push(`/repair?id=${batteryId}`)}
                                                    className="flex items-center gap-2 bg-gray-50 text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95 border border-gray-200"
                                                >
                                                    <Calendar className="w-5 h-5" />
                                                    Record Maintenance
                                                </button>
                                            )}
                                            {selectedRole === 'OWNER' && (
                                                <button
                                                    onClick={() => router.push(`/transfer?id=${batteryId}`)}
                                                    className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all active:scale-95"
                                                >
                                                    <ArrowRight className="w-5 h-5" />
                                                    Sell Battery
                                                </button>
                                            )}
                                            {selectedRole === 'RECYCLER' && (
                                                <button
                                                    onClick={() => router.push(`/recycle?id=${batteryId}`)}
                                                    className="flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-amber-700 transition-all active:scale-95"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    Process Decommission
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                            {from === 'marketplace' && (
                                <div className="flex justify-center pt-4">
                                    <button
                                        onClick={() => router.push("/marketplace")}
                                        className="flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 border border-gray-200 shadow-sm group"
                                    >
                                        <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                                        Return to Marketplace
                                    </button>
                                </div>
                            )}

                            {verifyResult.status === 3 && (
                                <div className="bg-gray-50 border border-gray-200 rounded-3xl p-8 text-center">
                                    <div className="max-w-md mx-auto space-y-3">
                                        <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto" />
                                        <h3 className="text-lg font-bold text-gray-900">End of Lifecycle</h3>
                                        <p className="text-sm text-gray-500 font-medium">
                                            This battery has been officially decommissioned. The blockchain record is now locked, and no further usage, repairs, or ownership transfers are permitted.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Event Timeline */}
                            <div className="relative border-l-2 border-gray-200 ml-4 pl-8 space-y-12 py-4">
                                {batteryHistory.map((evt, i) => (
                                    <div key={i} className="relative">
                                        <span className={`absolute -left-[41px] top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm ${i === 0 ? "bg-gray-900" : "bg-white border-gray-300"}`}></span>

                                        <div className={`bg-white rounded-2xl border p-6 shadow-sm transition-all ${verifyResult.tamperedEvents?.includes(evt.index)
                                            ? "border-red-500 bg-red-50/30 ring-1 ring-red-200"
                                            : "border-gray-200 hover:shadow-md"
                                            }`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${verifyResult.tamperedEvents?.includes(evt.index) ? "bg-red-100" : "bg-gray-50"}`}>
                                                        {getEventIcon(evt)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-bold text-gray-900 text-lg">{getEventType(evt)}</h3>
                                                            {verifyResult.tamperedEvents?.includes(evt.index) && (
                                                                <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                                                                    TAMPERED
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-medium">{new Date(evt.timestamp * 1000).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Event Details */}
                                            <div className={`grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t ${verifyResult.tamperedEvents?.includes(evt.index) ? "border-red-100" : "border-gray-50"}`}>
                                                {evt.data ? Object.entries(evt.data).map(([k, v]: any) => (
                                                    k !== 'carbonFootprint' && typeof v !== 'object' && (
                                                        <div key={k}>
                                                            <span className="text-gray-400 capitalize text-xs font-semibold">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                            <p className={`font-medium ${verifyResult.tamperedEvents?.includes(evt.index) ? "text-red-900" : "text-gray-900"}`}>
                                                                {String(v)}
                                                            </p>
                                                        </div>
                                                    )
                                                )) : (
                                                    <div className="col-span-2 text-red-600 font-bold flex items-center gap-2 py-2">
                                                        <XCircle className="w-4 h-4" />
                                                        Local data missing or unreadable - Fingerprint Mismatch
                                                    </div>
                                                )}
                                            </div>

                                            {evt.data?.attachment && (
                                                <div className={`mt-4 p-4 rounded-xl flex items-center justify-between group/file transition-all border ${verifyResult.tamperedEvents?.includes(evt.index)
                                                    ? "bg-red-100/50 border-red-200"
                                                    : "bg-blue-50 border-blue-100 hover:bg-white hover:border-blue-300 shadow-sm"
                                                    }`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${verifyResult.tamperedEvents?.includes(evt.index) ? "bg-red-200" : "bg-blue-100"}`}>
                                                            <FileText className={`w-5 h-5 ${verifyResult.tamperedEvents?.includes(evt.index) ? "text-red-700" : "text-blue-700"}`} />
                                                        </div>
                                                        <div>
                                                            <p className={`text-xs font-black ${verifyResult.tamperedEvents?.includes(evt.index) ? "text-red-900" : "text-blue-900"}`}>
                                                                {evt.data.attachment.originalName}
                                                            </p>
                                                            <p className="text-[10px] text-blue-600/70 font-black uppercase tracking-widest mt-0.5">
                                                                PDF Resource • Verified
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <a
                                                        href={`http://localhost:4000/storage/attachments/${evt.data.attachment.filename}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`p-2 rounded-lg transition-all ${verifyResult.tamperedEvents?.includes(evt.index)
                                                            ? "bg-red-600 text-white hover:bg-red-700"
                                                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-md group-hover/file:scale-110"
                                                            }`}
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            )}

                                            <div className={`mt-4 pt-3 border-t flex items-center justify-between ${verifyResult.tamperedEvents?.includes(evt.index) ? "border-red-100" : "border-gray-50"}`}>
                                                <span className={`text-xs font-mono flex items-center gap-1 ${verifyResult.tamperedEvents?.includes(evt.index) ? "text-red-500" : "text-gray-400"}`}>
                                                    <Hash className="w-3 h-3" /> {evt.dataHash.slice(0, 20)}...
                                                </span>
                                                {verifyResult.tamperedEvents?.includes(evt.index) && (
                                                    <span className="text-[10px] text-red-600 font-bold uppercase tracking-widest">Verification Failed</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </AccessGuard>
    );
}
