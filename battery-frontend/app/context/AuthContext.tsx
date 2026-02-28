"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
    name: string;
    email: string;
    phone: string;
}

interface AuthContextType {
    user: User | null;
    selectedRole: string | null;
    login: (userData: User) => void;
    logout: () => void;
    selectRole: (role: string) => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Load auth state from localStorage on init
        const savedUser = localStorage.getItem("auth_user");
        const savedRole = localStorage.getItem("auth_role");

        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem("auth_user", JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        setSelectedRole(null);
        localStorage.removeItem("auth_user");
        localStorage.removeItem("auth_role");
        localStorage.removeItem("wallet_connected"); // Also clear wallet session
        router.push("/login");
    };

    const selectRole = (role: string) => {
        setSelectedRole(role);
        localStorage.setItem("auth_role", role);
    };

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ user, selectedRole, login, logout, selectRole, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
