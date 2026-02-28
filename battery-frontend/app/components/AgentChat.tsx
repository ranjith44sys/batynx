"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSearchParams } from "next/navigation";

type Message = {
    id: string;
    role: "user" | "agent" | "system";
    content: string;
    timestamp: Date;
    agentName?: string;
    agentsUsed?: string[];
};

const AGENT_PIPELINE = [
    "Planner Agent",
    "Recommendation Agent",
    "Battery Health Agent",
    "Risk & Fraud Agent",
    "Sustainability Agent",
    "Market Intelligence Agent",
    "Consolidation Agent"
];

export default function AgentChat() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const batteryIdParam = searchParams.get("id");

    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "agent",
            content: "Hello! I am your AI Orchestrator. I can help you analyze battery state of health, estimate market value, assess risk, or run sustainability reports.\n\n**Examples:**\n- *\"Recommend a battery for an electric scooter with long life.\"*\n- *\"Check health and sustainability of battery BATT-HG-101.\"*\n- *\"I want to buy battery BATT-HG-101 for my solar kit.\"*\n\nHow can I assist you today?",
            timestamp: new Date(),
            agentName: "Orchestrator Agent"
        }
    ]);
    const [input, setInput] = useState("");
    const [isExecuting, setIsExecuting] = useState(false);
    const [activeAgentIndex, setActiveAgentIndex] = useState(-1);
    const [completedAgents, setCompletedAgents] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sessionId = useRef(`session-${Date.now()}`);
    const hasInitialTriggered = useRef(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isExecuting, activeAgentIndex]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || isExecuting) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setIsExecuting(true);
        setCompletedAgents([]);
        setActiveAgentIndex(0);

        const progressInterval = setInterval(() => {
            setActiveAgentIndex(prev => {
                if (prev < AGENT_PIPELINE.length - 1) {
                    setCompletedAgents(c => [...c, AGENT_PIPELINE[prev]]);
                    return prev + 1;
                }
                return prev;
            });
        }, 2500);

        try {
            const res = await fetch("http://localhost:5000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text.trim(),
                    session_id: sessionId.current
                })
            });

            clearInterval(progressInterval);

            if (!res.ok) throw new Error(`Agent API error: ${res.status}`);
            const data = await res.json();

            setCompletedAgents(data.agents_used || AGENT_PIPELINE);
            const agentMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "agent",
                content: data.answer,
                timestamp: new Date(),
                agentName: "Orchestrator Agent",
                agentsUsed: data.agents_used || []
            };
            setMessages(prev => [...prev, agentMsg]);
        } catch (err: any) {
            clearInterval(progressInterval);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "agent",
                content: `⚠️ Could not reach the AI Agent backend. Make sure the Python API server is running on port 5000.\n\n**Error:** ${err.message}`,
                timestamp: new Date(),
                agentName: "System"
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsExecuting(false);
            setActiveAgentIndex(-1);
            setCompletedAgents([]);
        }
    };

    // Auto-trigger analysis if ID is in URL
    useEffect(() => {
        if (batteryIdParam && !hasInitialTriggered.current && !isExecuting) {
            hasInitialTriggered.current = true;
            sendMessage(`Analyze health, risk, and sustainability for battery ${batteryIdParam} and give me a full summary.`);
        }
    }, [batteryIdParam]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = input;
        setInput("");
        await sendMessage(text);
    };

    return (
        <div className="flex flex-col h-[75vh] bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Workspace AI Intelligence</h2>
                        <p className="text-xs font-medium text-gray-500">Multi-Agent Ecosystem Connected</p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                            {/* Avatar */}
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'
                                }`}>
                                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                            </div>

                            {/* Message Bubble */}
                            <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                {msg.role === 'agent' && (
                                    <span className="text-xs font-bold text-gray-400 pl-1 uppercase tracking-wider">
                                        {msg.agentName}
                                    </span>
                                )}
                                <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                                    }`}>
                                    {msg.content}
                                </div>
                                {/* Agents Used Badges */}
                                {msg.agentsUsed && msg.agentsUsed.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1 px-1">
                                        {msg.agentsUsed.map((agent, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full border border-indigo-100">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {agent}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <span className="text-[10px] text-gray-400 font-medium px-1">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Agent Pipeline Execution State */}
                {isExecuting && (
                    <div className="flex justify-start">
                        <div className="flex gap-4 max-w-[80%] flex-row">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            </div>
                            <div className="flex flex-col gap-2 items-start justify-center">
                                <div className="px-5 py-4 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-2">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Agent Pipeline</p>
                                    {AGENT_PIPELINE.map((agent, i) => {
                                        const isCompleted = completedAgents.includes(agent);
                                        const isActive = i === activeAgentIndex;
                                        return (
                                            <div key={agent} className={`flex items-center gap-2 text-xs font-medium transition-all duration-300 ${isActive ? 'text-indigo-700' : isCompleted ? 'text-green-600' : 'text-gray-300'
                                                }`}>
                                                {isCompleted ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                                ) : isActive ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                                ) : (
                                                    <div className="w-3.5 h-3.5 rounded-full border border-gray-200" />
                                                )}
                                                <span>{agent}</span>
                                                {isActive && <span className="text-indigo-400 animate-pulse">executing...</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSend} className="relative flex items-center max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask the AI agents to analyze a battery or generate a report..."
                        className="w-full pl-6 pr-16 py-4 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-gray-800"
                        disabled={isExecuting}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isExecuting}
                        className="absolute right-2 p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors flex items-center justify-center shadow-sm"
                    >
                        <Send className="w-4 h-4 translate-x-px translate-y-px" />
                    </button>
                </form>
                <div className="text-center mt-3">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Powered by LangGraph Multi-Agent Ecosystem</p>
                </div>
            </div>
        </div>
    );
}
