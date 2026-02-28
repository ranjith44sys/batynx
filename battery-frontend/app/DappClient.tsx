"use client";

import { useState } from "react";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

const ABI = [
  "function mint(address to, string calldata initialDataHash) external returns (uint256)",
  "function addEvent(uint256 tokenId, string calldata eventTypeString, string calldata dataHash) external",
  "function getEventCount(uint256 tokenId) view returns (uint256)",
  "function getLifecycleEvent(uint256 tokenId, uint256 index) view returns (bytes32 eventType, string memory dataHash, uint256 timestamp, address author)"
];

export default function DappClient() {
  const [account, setAccount] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState("");
  const [dataHash, setDataHash] = useState("");
  const [events, setEvents] = useState<any[]>([]);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask not detected! Please install the MetaMask extension.");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0]);
  }

  async function getContract() {
    if (!window.ethereum) throw new Error("MetaMask not found");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  }

  async function createPassport() {
    try {
      const contract = await getContract();
      const tx = await contract.mint(account, dataHash || "Initial manufacturing data");
      await tx.wait();
      alert("Passport minted successfully!");
    } catch (err: any) {
      console.error("Minting failed:", err);
      alert("Minting failed: " + (err.reason || err.message));
    }
  }

  async function addEvent() {
    try {
      const contract = await getContract();
      const tx = await contract.addEvent(
        tokenId,
        "MAINTENANCE",
        dataHash || "ipfs://event-data"
      );
      await tx.wait();
      alert("Event added successfully!");
    } catch (err: any) {
      console.error("Adding event failed:", err);
      alert("Error: " + (err.reason || err.message));
    }
  }

  async function fetchEvents() {
    try {
      const contract = await getContract();
      const count = await contract.getEventCount(tokenId);
      const eventList = [];
      for (let i = 0; i < Number(count); i++) {
        const evt = await contract.getLifecycleEvent(tokenId, i);
        eventList.push({
          timestamp: evt.timestamp,
          dataHash: evt.dataHash
        });
      }
      setEvents(eventList);
    } catch (err: any) {
      console.error("Fetching events failed:", err);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-xl bg-slate-900/80 backdrop-blur rounded-2xl shadow-xl p-8 space-y-6">

        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Battery Passport
          </h1>
          <p className="text-slate-400 text-sm">
            Immutable lifecycle tracking for EV batteries
          </p>
        </header>

        <div className="border border-slate-700 rounded-xl p-4 space-y-3">
          {!account ? (
            <button
              onClick={connectWallet}
              suppressHydrationWarning
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition font-medium"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="text-sm text-slate-300">
              Connected as
              <div className="font-mono text-xs mt-1 text-slate-400 break-all">
                {account}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">
              Token ID (uint256)
            </label>
            <input
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 1, 2, 3..."
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              suppressHydrationWarning
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-400">
              Data Hash / Metadata
            </label>
            <input
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="IPFS hash or description"
              value={dataHash}
              onChange={(e) => setDataHash(e.target.value)}
              suppressHydrationWarning
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={createPassport}
            suppressHydrationWarning
            disabled={!account}
            className={`py-2 rounded-lg transition text-sm font-medium ${!account ? "bg-slate-700 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500"}`}
          >
            Mint
          </button>
          <button
            onClick={addEvent}
            suppressHydrationWarning
            disabled={!account}
            className={`py-2 rounded-lg transition text-sm font-medium ${!account ? "bg-slate-700 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-500"}`}
          >
            Add Event
          </button>
          <button
            onClick={fetchEvents}
            suppressHydrationWarning
            className="py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition text-sm font-medium"
          >
            Fetch
          </button>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-300">
            Lifecycle Events
          </h2>

          {events.length === 0 ? (
            <p className="text-xs text-slate-500">
              No events recorded yet.
            </p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {events.map((e, i) => (
                <li
                  key={i}
                  className="text-xs bg-slate-800 border border-slate-700 rounded-lg p-3"
                >
                  <div className="text-slate-400">
                    {new Date(Number(e.timestamp) * 1000).toLocaleString()}
                  </div>
                  <div className="font-mono break-all text-slate-300 mt-1">
                    {e.ipfsHash}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );

}
