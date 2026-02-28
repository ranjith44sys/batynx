"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("http://localhost:4000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Login failed");
            }

            login(data);
            router.push("/portal");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col justify-center items-center p-8 bg-white">
            <div className="w-full max-w-md space-y-12">
                <div className="text-center space-y-4">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors mb-4">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        Back to Home
                    </Link>
                    <div className="flex justify-center">
                        <div className="inline-flex items-center justify-center p-3 bg-gray-900 rounded-2xl">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">Welcome Back</h2>
                    <p className="text-gray-500 font-medium">Please enter your details to sign in.</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-2 animate-shake">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-gray-900 transition-colors" />
                            <input
                                type="email"
                                required
                                suppressHydrationWarning
                                className="w-full bg-gray-50 border border-gray-100 py-5 pl-12 pr-4 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-medium text-gray-900"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center pl-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Password</label>
                            <button type="button" suppressHydrationWarning className="text-xs font-bold text-gray-900 hover:underline">Forgot?</button>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-gray-900 transition-colors" />
                            <input
                                type="password"
                                required
                                suppressHydrationWarning
                                className="w-full bg-gray-50 border border-gray-100 py-5 pl-12 pr-4 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-medium text-gray-900"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        suppressHydrationWarning
                        className="w-full bg-gray-900 text-white py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:shadow-none"
                    >
                        {loading ? "Signing in..." : "Continue"}
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </form>

                <div className="text-center">
                    <p className="text-gray-500 font-medium">
                        Don't have an account? <Link href="/signup" className="text-gray-900 font-bold hover:underline">Sign up for free</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
