"use client";

import React from "react";
import Link from "next/link";
import { Settings, ShoppingCart, ArrowRight, ShieldCheck, Activity, FileText } from "lucide-react";

export default function PortalPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 text-gray-900">
            <div className="max-w-6xl w-full space-y-12">
                <div className="text-center space-y-4">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-gray-900 rounded-3xl shadow-xl">
                            <ShieldCheck className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    <h1 className="text-5xl font-black tracking-tight">Access Portal</h1>
                    <p className="text-xl text-gray-500 font-medium">Select your destination workspace.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mt-12">
                    {/* Management Card */}
                    <Link href="/roles" className="group">
                        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-gray-900 transition-all duration-500 h-full flex flex-col justify-between group-active:scale-[0.98]">
                            <div className="space-y-6">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-gray-900 transition-colors duration-500">
                                    <Activity className="w-8 h-8 text-gray-400 group-hover:text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black mb-2">Management System</h3>
                                    <p className="text-gray-500 font-medium leading-relaxed">
                                        Monitor lifecycle, update usage, and manage battery passports.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-8 flex items-center gap-2 font-bold text-gray-900">
                                Open Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>
                    </Link>

                    {/* Marketplace Card */}
                    <Link href="/marketplace" className="group">
                        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-gray-900 transition-all duration-500 h-full flex flex-col justify-between group-active:scale-[0.98]">
                            <div className="space-y-6">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-gray-900 transition-colors duration-500">
                                    <ShoppingCart className="w-8 h-8 text-gray-400 group-hover:text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black mb-2">Second-Life Marketplace</h3>
                                    <p className="text-gray-500 font-medium leading-relaxed">
                                        Browse and purchase batteries certified for second-life application.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-8 flex items-center gap-2 font-bold text-gray-900">
                                Enter E-Commerce <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>
                    </Link>

                    {/* Chain Logs Card */}
                    <Link href="/logs" className="group">
                        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-gray-900 transition-all duration-500 h-full flex flex-col justify-between group-active:scale-[0.98]">
                            <div className="space-y-6">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-gray-900 transition-colors duration-500">
                                    <FileText className="w-8 h-8 text-gray-400 group-hover:text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black mb-2 text-gray-900">Chain Activity Logs</h3>
                                    <p className="text-gray-500 font-medium leading-relaxed">
                                        Monitor real-time blockchain transactions and event history.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-8 flex items-center gap-2 font-bold text-gray-900">
                                View Ledger <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
