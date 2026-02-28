"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Wallet, User as UserIcon, LogOut, ChevronDown } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";

export default function Navigation() {
    const pathname = usePathname();
    const { account, connectWallet, roles, hasRole } = useWallet();
    const { user, selectedRole, isAuthenticated, logout } = useAuth();

    const routes = [
        { path: "/", label: "Home", public: true },
        { path: "/dashboard", label: "Dashboard", role: "ADMIN" },
        { path: "/verify", label: "Verify", public: false }, // Only authenticated users
        { path: "/manufacture", label: "Manufacture", role: "MANUFACTURER" },
        { path: "/usage", label: "Usage", role: "SERVICE", allowOwner: true },
        { path: "/repair", label: "Repair", role: "SERVICE" },
        { path: "/transfer", label: "Transfer", role: "ADMIN", allowOwner: true },
        { path: "/recycle", label: "Recycle", role: "RECYCLER" },
        { path: "/agents", label: "AI Agents", role: "ADMIN", allowOwner: true }
    ];

    return (
        <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="bg-gray-900 p-2 rounded-xl group-hover:scale-105 transition-transform">
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <span className="text-xl font-bold text-gray-900 tracking-tight">EV Passport</span>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Blockchain Verified</div>
                    </div>
                </Link>

                <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-2xl border border-gray-200/50">
                    {routes.map((route) => {
                        const isActive = pathname === route.path;
                        // Use the selected role from AuthContext for visibility if it exists
                        // 1. Public pages are always visible
                        // 2. "Verify" is visible to anyone authenticated
                        // 3. Role-specific pages require the selected role to match
                        const canSee = route.public || (isAuthenticated && (
                            route.path === "/verify" ||
                            route.path === "/agents" ||
                            (selectedRole && (
                                route.role === selectedRole ||
                                selectedRole === "ADMIN" ||
                                (route.allowOwner && selectedRole === "OWNER")
                            ))
                        ));

                        if (!canSee) return null;

                        return (
                            <Link
                                key={route.path}
                                href={route.path}
                                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${isActive
                                    ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                                    : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                                    }`}
                            >
                                {route.label}
                            </Link>
                        );
                    })}
                </div>

                <div className="flex items-center gap-4">
                    {!isAuthenticated ? (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/login"
                                className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/signup"
                                className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all shadow-md hover:shadow-lg active:scale-95"
                            >
                                Get Started
                            </Link>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            {/* User Profile / Role */}
                            <div className="flex items-center gap-3 bg-white border border-gray-200 pl-2 pr-4 py-1.5 rounded-xl">
                                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white">
                                    <UserIcon className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-gray-900 leading-tight">{user?.name}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{selectedRole}</span>
                                </div>
                            </div>

                            {/* Wallet Session */}
                            {account ? (
                                <div className="flex items-center gap-3 bg-green-50 border border-green-100 px-4 py-2 rounded-xl group relative">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs font-mono font-bold text-green-700">
                                        {account.slice(0, 6)}...{account.slice(-4)}
                                    </span>
                                </div>
                            ) : (
                                <button
                                    onClick={connectWallet}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                                >
                                    <Wallet className="w-4 h-4" />
                                    Connect Wallet
                                </button>
                            )}

                            {/* Logout */}
                            <div className="flex items-center gap-1 border border-gray-100 rounded-xl p-1">
                                <Link
                                    href="/roles"
                                    title="Switch Workspace / Role"
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
                                >
                                    <ShieldCheck className="w-5 h-5" />
                                </Link>
                                <button
                                    onClick={logout}
                                    title="Sign Out of All Sessions"
                                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
