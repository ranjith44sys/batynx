"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ethers } from "ethers";

declare global {
    interface Window {
        ethereum?: any;
    }
}

interface WalletContextType {
    account: string | null;
    roles: string[];
    chainId: number | null;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    switchAccount: () => Promise<void>;
    switchNetwork: () => Promise<void>;
    resetWallet: () => void;
    hasRole: (role: string) => boolean;
    loading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const ABI = [
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
    "function MANUFACTURER_ROLE() view returns (bytes32)",
    "function SERVICE_PROVIDER_ROLE() view returns (bytes32)",
    "function RECYCLER_ROLE() view returns (bytes32)"
];

const ROLE_HASHES = {
    ADMIN: "0x0000000000000000000000000000000000000000000000000000000000000000",
    MANUFACTURER: ethers.keccak256(ethers.toUtf8Bytes("MANUFACTURER_ROLE")),
    SERVICE: ethers.keccak256(ethers.toUtf8Bytes("SERVICE_PROVIDER_ROLE")),
    RECYCLER: ethers.keccak256(ethers.toUtf8Bytes("RECYCLER_ROLE"))
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
    const [account, setAccount] = useState<string | null>(null);
    const [roles, setRoles] = useState<string[]>([]);
    const [chainId, setChainId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const [isChecking, setIsChecking] = useState(false);

    const checkRoles = async (addr: string) => {
        if (!window.ethereum || isChecking) return;
        setIsChecking(true);

        try {
            // Use a single provider instance
            const provider = new ethers.BrowserProvider(window.ethereum);

            // Validate network before calling contract
            const network = await provider.getNetwork();
            const currentChainId = Number(network.chainId);
            setChainId(currentChainId);

            // If not on Hardhat, skip role check to avoid errors
            if (currentChainId !== 31337 && !process.env.NEXT_PUBLIC_RPC_URL) {
                console.log("[WalletContext] Skipping on-chain role check for non-local network.");
                setRoles([]);
                return;
            }

            const code = await provider.getCode(CONTRACT_ADDRESS);
            if (code === "0x") {
                console.warn(`[WalletContext] No contract found at ${CONTRACT_ADDRESS}.`);
                setRoles([]);
                return;
            }

            const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

            const [admin, mfg, svc, rec] = await Promise.all([
                contract.hasRole(ROLE_HASHES.ADMIN, addr).catch(() => false),
                contract.hasRole(ROLE_HASHES.MANUFACTURER, addr).catch(() => false),
                contract.hasRole(ROLE_HASHES.SERVICE, addr).catch(() => false),
                contract.hasRole(ROLE_HASHES.RECYCLER, addr).catch(() => false)
            ]);

            const activeRoles = [];
            if (admin) activeRoles.push("ADMIN");
            if (mfg) activeRoles.push("MANUFACTURER");
            if (svc) activeRoles.push("SERVICE");
            if (rec) activeRoles.push("RECYCLER");

            setRoles(activeRoles);
        } catch (e) {
            // Silence common connection errors during init
            console.error("[WalletContext] Role check failed:", e);
            setRoles([]);
        } finally {
            setIsChecking(false);
            setLoading(false);
        }
    };

    const connectWallet = async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const network = await provider.getNetwork();

                // If not on Hardhat Local (31337), try to switch
                if (Number(network.chainId) !== 31337) {
                    try {
                        await window.ethereum.request({
                            method: "wallet_switchEthereumChain",
                            params: [{ chainId: "0x7A69" }], // 31337 in hex
                        });
                    } catch (err: any) {
                        if (err.code === 4902) {
                            await window.ethereum.request({
                                method: "wallet_addEthereumChain",
                                params: [{
                                    chainId: "0x7A69",
                                    chainName: "Hardhat Local",
                                    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                                    rpcUrls: ["http://127.0.0.1:8545"],
                                }],
                            });
                        }
                    }
                }

                const accounts = await provider.send("eth_requestAccounts", []);
                setAccount(accounts[0]);
                await checkRoles(accounts[0]);
                localStorage.setItem("wallet_connected", "true");
            } catch (error: any) {
                if (error.code !== 4001) {
                    console.error("Connect error:", error);
                }
            }
        } else {
            alert("MetaMask not detected! Please ensure you have the extension installed.");
        }
    };

    const switchAccount = async () => {
        if (window.ethereum) {
            try {
                await window.ethereum.request({
                    method: "wallet_requestPermissions",
                    params: [{ eth_accounts: {} }],
                });
                const provider = new ethers.BrowserProvider(window.ethereum);
                const accounts = await provider.send("eth_requestAccounts", []);
                setAccount(accounts[0]);
                await checkRoles(accounts[0]);
            } catch (error) {
                console.error("Switch account error:", error);
            }
        }
    };

    const resetWallet = () => {
        setAccount(null);
        setRoles([]);
        setChainId(null);
        localStorage.setItem("wallet_connected", "false");
    };

    const disconnectWallet = () => {
        resetWallet();
        window.location.href = "/";
    };

    const switchNetwork = async () => {
        if (window.ethereum) {
            try {
                // Hardhat Local: 31337 (0x7A69)
                await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: "0x7A69" }],
                });
            } catch (switchError: any) {
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: "wallet_addEthereumChain",
                            params: [{
                                chainId: "0x7A69",
                                chainName: "Hardhat Local",
                                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                                rpcUrls: ["http://127.0.0.1:8545"],
                            }],
                        });
                    } catch (addError) {
                        console.error("Failed to add network:", addError);
                    }
                }
            }
        }
    };

    const hasRole = (role: string) => roles.includes(role) || roles.includes("ADMIN");

    useEffect(() => {
        const init = async () => {
            // Give MetaMask a moment to inject if it's slow
            const checkProvider = async (retries = 5) => {
                if (window.ethereum) return true;
                if (retries <= 0) return false;
                await new Promise(r => setTimeout(r, 600));
                return checkProvider(retries - 1);
            };

            const exists = await checkProvider();

            if (exists && window.ethereum) {
                console.log("[WalletContext] MetaMask detected and ready.");

                // Register listeners
                const handleAccounts = (accounts: string[]) => {
                    if (accounts.length > 0) {
                        setAccount(accounts[0]);
                        checkRoles(accounts[0]);
                        localStorage.setItem("wallet_connected", "true");
                    } else {
                        setAccount(null);
                        setRoles([]);
                        localStorage.setItem("wallet_connected", "false");
                    }
                };

                window.ethereum.on("accountsChanged", handleAccounts);
                window.ethereum.on("chainChanged", () => window.location.reload());

                // Check for existing session - use a safer method
                if (localStorage.getItem("wallet_connected") === "true") {
                    try {
                        // Use request instead of ethers send to be more direct
                        const accounts = await window.ethereum.request({ method: "eth_accounts" });
                        if (accounts && accounts.length > 0) {
                            handleAccounts(accounts);
                        }
                    } catch (e) {
                        console.warn("[WalletContext] Static account check skipped:", e);
                    }
                }
            } else {
                console.warn("[WalletContext] MetaMask not found after retries.");
            }
            setLoading(false);
        };
        init();
    }, []);

    return (
        <WalletContext.Provider value={{ account, roles, chainId, connectWallet, disconnectWallet, switchAccount, switchNetwork, resetWallet, hasRole, loading }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return context;
};
