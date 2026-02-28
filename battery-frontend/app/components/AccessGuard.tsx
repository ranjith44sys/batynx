"use client";

import React, { ReactNode } from "react";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import { Lock, Wallet, AlertCircle, ArrowRight, UserCircle, LayoutGrid } from "lucide-react";
import Link from "next/link";

interface AccessGuardProps {
    children: ReactNode;
    requiredRole?: "ADMIN" | "MANUFACTURER" | "SERVICE" | "RECYCLER" | "OWNER" | Array<"ADMIN" | "MANUFACTURER" | "SERVICE" | "RECYCLER" | "OWNER">;
}

export default function AccessGuard({ children, requiredRole }: AccessGuardProps) {
    const { account, hasRole, loading, connectWallet, switchAccount, chainId, switchNetwork } = useWallet();
    const { user, selectedRole, isAuthenticated } = useAuth();

    const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium animate-pulse">Verifying Blockchain Permissions...</p>
            </div>
        );
    }

    // 1. Check if traditional session exists
    if (!isAuthenticated) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-white">
                <div className="bg-gray-50 p-6 rounded-3xl mb-8 border border-gray-100 shadow-inner">
                    <UserCircle className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Authentication Required</h2>
                <p className="text-gray-500 max-w-sm mb-8 font-medium">
                    Please log in with your credentials to access the blockchain workspace.
                </p>
                <div className="flex gap-4">
                    <Link
                        href="/login"
                        className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl hover:shadow-2xl active:scale-95"
                    >
                        Log In
                    </Link>
                    <Link
                        href="/signup"
                        className="bg-white text-gray-900 border-2 border-gray-100 px-10 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
                    >
                        Sign Up
                    </Link>
                </div>
            </div>
        );
    }

    // 2. Check if a role is selected (Only if a specific role is required)
    if (requiredRole && !selectedRole) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-white">
                <div className="bg-blue-50 p-6 rounded-3xl mb-8 border border-blue-100 shadow-inner">
                    <LayoutGrid className="w-12 h-12 text-blue-500" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Role Selection Needed</h2>
                <p className="text-gray-500 max-w-sm mb-8 font-medium">
                    You are logged in as <span className="text-gray-900 font-bold">{user?.name}</span>. Please select your workspace role to continue.
                </p>
                <Link
                    href="/roles"
                    className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl hover:shadow-2xl active:scale-95"
                >
                    Select Role & Continue
                </Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium animate-pulse">Verifying Blockchain Permissions...</p>
            </div>
        );
    }

    // 3. Check for correct network (Only if a wallet is connected and a role is required)
    if (requiredRole && account && chainId !== 31337) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-12 text-center bg-amber-50/30">
                <div className="bg-amber-100 p-6 rounded-3xl mb-8 border border-amber-200 shadow-sm">
                    <AlertCircle className="w-12 h-12 text-amber-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Wrong Network Detected</h2>
                <p className="text-gray-500 max-w-md mb-8 leading-relaxed font-medium">
                    You are connected to <span className="text-amber-700 font-bold">Chain ID: {chainId}</span>.
                    This application requires the <span className="text-gray-900 font-bold">Hardhat Local Node (Chain 31337)</span> to function.
                </p>

                <button
                    onClick={switchNetwork}
                    className="flex items-center justify-center gap-3 bg-amber-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-xl hover:shadow-2xl active:scale-95 group"
                >
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    Switch to Localhost 8545
                </button>
            </div>
        );
    }

    // 4. Check if wallet is connected (Only if a specific role is required)
    if (requiredRole && !account) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-gray-100 p-6 rounded-3xl mb-6">
                    <Wallet className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Wallet Connection Required</h2>
                <p className="text-gray-500 max-w-sm mb-8 font-medium">
                    This page requires a secure blockchain connection. Please connect your wallet to proceed.
                </p>
                <button
                    onClick={connectWallet}
                    className="flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl hover:shadow-2xl active:scale-95 group"
                >
                    <Wallet className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Connect Wallet
                </button>
            </div>
        );
    }

    const checkRole = () => {
        if (!requiredRole) return true;

        // ADMIN always has access if they are authenticated and role is selected as ADMIN
        if (selectedRole === "ADMIN") return true;

        const rolesToMatch = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

        return rolesToMatch.some(role =>
            selectedRole === role || hasRole(role as any)
        );
    };

    if (requiredRole && !checkRole()) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-12 text-center bg-white/50">
                <div className="bg-red-50 p-6 rounded-3xl mb-8 border border-red-100/50 shadow-inner">
                    <Lock className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Access Restricted</h2>
                <p className="text-gray-500 max-w-md mb-8 leading-relaxed font-medium">
                    Unauthorized account identified: <span className="font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">{account ? truncate(account) : "None"}</span>.
                    This destination requires the <span className="font-bold text-red-600 px-2 py-0.5 bg-red-50 rounded-lg border border-red-100 uppercase text-[10px] tracking-widest">{Array.isArray(requiredRole) ? requiredRole.join(" or ") : requiredRole}</span> role.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={switchAccount}
                        className="flex items-center justify-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl hover:shadow-2xl active:scale-95 group"
                    >
                        <AlertCircle className="w-5 h-5" />
                        Switch to Authorized Account
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-8 py-4 rounded-2xl font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
