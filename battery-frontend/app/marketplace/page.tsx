"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, ShoppingCart, ShieldCheck, ArrowRight, QrCode, X, CheckCircle, Activity } from "lucide-react";
import QRCode from "react-qr-code";

export default function MarketplacePage() {
    const [batteries, setBatteries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBattery, setSelectedBattery] = useState<any>(null);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [purchaseData, setPurchaseData] = useState({ name: "", contact: "" });
    const [isBuying, setIsBuying] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        fetchBatteries();
    }, []);

    const fetchBatteries = async () => {
        try {
            const res = await fetch("http://localhost:4000/api/marketplace/list");
            const data = await res.json();
            setBatteries(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch marketplace data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async () => {
        if (!selectedBattery) return;
        setIsBuying(true);
        try {
            const res = await fetch(`http://localhost:4000/api/marketplace/buy/${selectedBattery.batteryId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    buyerName: purchaseData.name,
                    buyerContact: purchaseData.contact
                })
            });
            const result = await res.json();
            if (res.ok) {
                setSuccessMessage("Purchase Successful! The battery ledger has been updated.");
                setShowPurchaseModal(false);
                fetchBatteries(); // Refresh list
            } else {
                alert(result.error || "Purchase failed");
            }
        } catch (error) {
            alert("An error occurred during purchase.");
        } finally {
            setIsBuying(false);
        }
    };

    const filteredBatteries = batteries.filter(b =>
        b.batteryId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.chemistryType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/portal" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </Link>
                        <h1 className="text-2xl font-black tracking-tight">Second-Life Marketplace</h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search batteries..."
                                className="bg-gray-50 border border-gray-100 py-2.5 pl-10 pr-4 rounded-xl outline-none focus:bg-white focus:border-gray-900 transition-all text-sm font-medium w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                {successMessage && (
                    <div className="mb-8 bg-green-50 border border-green-100 p-6 rounded-[2rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="font-black text-green-900">Success!</p>
                            <p className="text-green-700 font-medium">{successMessage}</p>
                        </div>
                        <button onClick={() => setSuccessMessage("")} className="ml-auto p-2 hover:bg-green-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-green-500" />
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500 font-bold">Scanning the grid for available batteries...</p>
                    </div>
                ) : filteredBatteries.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[3rem] border border-gray-100 border-dashed">
                        <ShoppingCart className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-gray-400">No Batteries Available</h3>
                        <p className="text-gray-400 font-medium">Check back later or try a different search.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredBatteries.map((b) => (
                            <div key={b.batteryId} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col group">
                                <div className="p-8 space-y-6 flex-grow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{b.chemistryType}</div>
                                            <h3 className="text-2xl font-black">{b.batteryId}</h3>
                                        </div>
                                        <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors">
                                            <QRCode value={b.idHash || b.batteryId} size={48} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-2xl">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Capacity</div>
                                            <div className="font-black text-lg">{b.capacityKWh} kWh</div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-2xl">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</div>
                                            <div className="font-black text-lg text-green-600">Second-Life</div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Link href={`/verify?id=${b.batteryId}&from=marketplace`} className="text-sm font-bold text-gray-400 hover:text-gray-900 flex items-center gap-2 transition-colors">
                                            <ShieldCheck className="w-4 h-4" /> Verify Ledger Integrity
                                        </Link>
                                    </div>
                                </div>

                                <div className="p-8 pt-0 mt-auto space-y-3">
                                    <button
                                        onClick={() => { setSelectedBattery(b); setShowPurchaseModal(true); }}
                                        className="w-full bg-gray-900 text-white py-5 rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl active:scale-[0.98]"
                                    >
                                        Buy Now <ArrowRight className="w-5 h-5" />
                                    </button>

                                    <Link href={`/agents?id=${b.batteryId}`} className="block w-full">
                                        <button className="w-full bg-white border-2 border-gray-100 text-gray-900 py-4 rounded-2xl font-bold hover:border-gray-900 hover:bg-gray-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                                            <Activity className="w-5 h-5 text-blue-500" />
                                            Analyze AI Health
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Purchase Modal */}
            {showPurchaseModal && selectedBattery && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowPurchaseModal(false)} />
                    <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 space-y-10 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black tracking-tight">Complete Purchase</h2>
                                <p className="text-gray-500 font-medium">Buying {selectedBattery.batteryId} for delivery.</p>
                            </div>
                            <button onClick={() => setShowPurchaseModal(false)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                                <input
                                    className="w-full bg-gray-50 border border-gray-100 py-5 px-6 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-medium"
                                    placeholder="Enter your name"
                                    value={purchaseData.name}
                                    onChange={(e) => setPurchaseData({ ...purchaseData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Contact Details</label>
                                <input
                                    className="w-full bg-gray-50 border border-gray-100 py-5 px-6 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-medium"
                                    placeholder="Phone or Email"
                                    value={purchaseData.contact}
                                    onChange={(e) => setPurchaseData({ ...purchaseData, contact: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                disabled={isBuying || !purchaseData.name || !purchaseData.contact}
                                onClick={handleBuy}
                                className="w-full bg-gray-900 text-white py-6 rounded-[1.5rem] font-bold hover:bg-black transition-all flex items-center justify-center gap-3 shadow-2xl disabled:bg-gray-200 disabled:shadow-none"
                            >
                                {isBuying ? "Processing..." : "Confirm Purchase"}
                                <ShoppingCart className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
