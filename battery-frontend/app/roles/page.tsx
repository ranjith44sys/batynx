"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Activity, Recycle, Settings, ArrowRight, UserCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";

export default function RolesPage() {
    const { selectRole, user } = useAuth();
    const { resetWallet } = useWallet();
    const router = useRouter();

    const roles = [
        {
            id: "ADMIN",
            title: "Global Admin",
            description: "Manage roles, grant permissions, and view global passport analytics.",
            icon: <Settings className="w-6 h-6" />,
            color: "bg-purple-500",
            lightColor: "bg-purple-50",
            borderColor: "border-purple-100"
        },
        {
            id: "MANUFACTURER",
            title: "OEM Manufacturer",
            description: "Mint new battery passports and record initial manufacturing data.",
            icon: <ShieldCheck className="w-6 h-6" />,
            color: "bg-blue-500",
            lightColor: "bg-blue-50",
            borderColor: "border-blue-100"
        },
        {
            id: "SERVICE",
            title: "Service Provider",
            description: "Log maintenance records, repair events, and battery usage snapshots.",
            icon: <Activity className="w-6 h-6" />,
            color: "bg-green-500",
            lightColor: "bg-green-50",
            borderColor: "border-green-100"
        },
        {
            id: "RECYCLER",
            title: "Recycling Facility",
            description: "Manage end-of-life decommissioning and material recovery verification.",
            icon: <Recycle className="w-6 h-6" />,
            color: "bg-amber-500",
            lightColor: "bg-amber-50",
            borderColor: "border-amber-100"
        },
        {
            id: "OWNER",
            title: "Battery Owner",
            description: "Sell your battery, track its usage, and view its full lifecycle history.",
            icon: <UserCheck className="w-6 h-6" />,
            color: "bg-emerald-500",
            lightColor: "bg-emerald-50",
            borderColor: "border-emerald-100"
        }
    ];

    const handleSelect = (roleId: string) => {
        selectRole(roleId);
        resetWallet();
        // Redirect to /verify by default so they can start using the passport
        router.push("/verify");
    };

    return (
        <div className="min-h-screen bg-gray-50/50 py-20 px-6">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm mb-4">
                        <UserCheck className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-bold text-gray-900">Signed in as {user?.name}</span>
                    </div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tight">Select your Workspace.</h1>
                    <p className="text-gray-500 text-lg font-medium max-w-xl mx-auto">
                        Your functional role determines which parts of the blockchain ledger you can interact with.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            onClick={() => handleSelect(role.id)}
                            suppressHydrationWarning
                            className="group relative bg-white p-8 rounded-[2.5rem] border border-gray-200/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left overflow-hidden h-full flex flex-col justify-between"
                        >
                            <div className={`absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity`}>
                                {React.cloneElement(role.icon, { className: "w-32 h-32" })}
                            </div>

                            <div className="relative z-10">
                                <div className={`${role.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg shadow-${role.color}/20 group-hover:scale-110 transition-transform`}>
                                    {role.icon}
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">{role.title}</h3>
                                <p className="text-gray-500 font-medium leading-relaxed mb-8">
                                    {role.description}
                                </p>
                            </div>

                            <div className="relative z-10 flex items-center gap-2 text-gray-900 font-bold group-hover:gap-4 transition-all uppercase tracking-widest text-xs">
                                Enter Workspace <ArrowRight className="w-4 h-4" />
                            </div>
                        </button>
                    ))}
                </div>

                <div className="text-center mt-12 text-gray-400 font-medium italic text-sm">
                    Note: Roles are stored locally and will be verified against your connected wallet permissions.
                </div>
            </div>
        </div>
    );
}
