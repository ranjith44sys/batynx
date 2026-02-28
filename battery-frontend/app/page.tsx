"use client";

import { Wallet, ShieldCheck, ArrowRight, UserCheck, Activity, Recycle, Settings } from "lucide-react";
import { useWallet } from "./context/WalletContext";
import { useAuth } from "./context/AuthContext";
import Link from "next/link";

export default function Home() {
  const { account, connectWallet, roles } = useWallet();
  const { isAuthenticated, selectedRole } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">v2.0 Beta Live</span>
            </div>

            <h1 className="text-6xl font-black text-gray-900 leading-[1.1] tracking-tight">
              Digital Battery <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500">Passport System.</span>
            </h1>

            <p className="text-xl text-gray-500 leading-relaxed max-w-xl">
              Track the entire lifecycle of EV batteries on a decentralized ledger.
              Secure, transparent, and strictly role-based.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <Link
                  href="/portal"
                  className="flex items-center justify-center gap-3 bg-gray-900 text-white px-10 py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-xl hover:shadow-2xl active:scale-95"
                >
                  Enter Workspace <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="flex items-center justify-center gap-3 bg-gray-900 text-white px-10 py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-xl hover:shadow-2xl active:scale-95 group"
                  >
                    Get Started for Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-3 bg-white text-gray-900 border-2 border-gray-100 px-10 py-5 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Graphics / Placeholder */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-gray-100 to-transparent rounded-[4rem] -z-10" />
            <div className="bg-white border border-gray-100 rounded-[3rem] p-8 shadow-2xl transition-all duration-700 hover:shadow-blue-500/10 hover:border-blue-100 animate-pulse-float">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-gray-50 rounded-full" />
                  <div className="h-4 w-4 bg-gray-100 rounded-full" />
                </div>
                <div className="aspect-video bg-white rounded-2xl flex items-center justify-center transition-transform duration-500 hover:scale-[1.05] overflow-hidden">
                  <img
                    src="/logo.png"
                    alt="System Logo"
                    className="w-full max-w-[420px] h-auto object-contain drop-shadow-2xl scale-125 translate-y-2"
                  />
                </div>
                <div className="space-y-3">
                  <div className="h-3 w-full bg-gray-50 rounded-full" />
                  <div className="h-3 w-5/6 bg-gray-50 rounded-full" />
                  <div className="h-3 w-4/6 bg-gray-50 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes pulse-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.02); }
        }
        .animate-pulse-float {
          animation: pulse-float 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
