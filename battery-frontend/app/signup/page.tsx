"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Lock, ArrowRight, ShieldCheck, Github } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("http://localhost:4000/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Signup failed");
            }

            login(data);
            router.push("/roles");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[90vh] grid lg:grid-cols-2 bg-white">
            {/* Left Side: Brand & Visuals */}
            <div className="hidden lg:flex flex-col justify-between p-12 bg-gray-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-gray-800 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-gray-800 rounded-full blur-3xl opacity-50" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="bg-white p-2 rounded-xl">
                            <ShieldCheck className="w-6 h-6 text-gray-900" />
                        </div>
                        <span className="text-2xl font-black tracking-tight">EV Passport</span>
                    </div>

                    <h1 className="text-5xl font-black leading-tight mb-6">
                        Start your journey <br />
                        in Sustainable Mobility.
                    </h1>
                    <p className="text-xl text-gray-400 max-w-md leading-relaxed">
                        Join the decentralized network tracking the circular economy of electric vehicle batteries.
                    </p>
                </div>

                <div className="relative z-10 pt-12 border-t border-gray-800">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-gray-900 bg-gray-800 flex items-center justify-center text-[10px] font-bold">
                                    U{i}
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-gray-400 font-medium">Joined by 100+ Manufacturers worldwide</p>
                    </div>
                </div>
            </div>

            {/* Right Side: Signup Form */}
            <div className="flex flex-col justify-center items-center p-8 lg:p-24 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        Back to Home
                    </Link>
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Create Account</h2>
                        <p className="text-gray-500 font-medium">Join the blockchain-verified ecosystem.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-2 animate-shake">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-gray-900 transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-100 py-4 pl-12 pr-4 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-medium text-gray-900"
                                        placeholder="John Carter"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Phone</label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-gray-900 transition-colors" />
                                    <input
                                        type="tel"
                                        required
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-100 py-4 pl-12 pr-4 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-medium text-gray-900"
                                        placeholder="+1 234..."
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-gray-900 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    suppressHydrationWarning
                                    className="w-full bg-gray-50 border border-gray-100 py-4 pl-12 pr-4 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-medium text-gray-900"
                                    placeholder="john@carter.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-gray-900 transition-colors" />
                                    <input
                                        type="password"
                                        required
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-100 py-4 pl-12 pr-4 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-medium text-gray-900"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Confirm</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-gray-900 transition-colors" />
                                    <input
                                        type="password"
                                        required
                                        suppressHydrationWarning
                                        className="w-full bg-gray-50 border border-gray-100 py-4 pl-12 pr-4 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-medium text-gray-900"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            suppressHydrationWarning
                            className="w-full bg-gray-900 text-white py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:shadow-none"
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </form>

                    <div className="text-center pt-8 border-t border-gray-100">
                        <p className="text-gray-500 font-medium">
                            Already have an account? <Link href="/login" className="text-gray-900 font-bold hover:underline">Log In</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
