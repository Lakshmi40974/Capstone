"use client";

import React from "react";
import { User, CheckCircle2, AlertTriangle, Play, HelpCircle, Loader2 } from "lucide-react";

interface AgentStatus {
  name: string;
  role: string;
  status: "Idle" | "Working" | "Completed" | "Error" | "Healing" | "Chat";
  message?: string;
}

interface AgentWorkflowProps {
  agents: AgentStatus[];
  activeAgent: string;
  onSelectAgent: (name: string) => void;
}

export default function AgentWorkflow({ agents, activeAgent, onSelectAgent }: AgentWorkflowProps) {
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Working":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          icon: <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />,
          glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)] border-emerald-400",
          statusText: "Working"
        };
      case "Healing":
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          icon: <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />,
          glow: "shadow-[0_0_15px_rgba(245,158,11,0.25)] border-amber-400",
          statusText: "Self Healing"
        };
      case "Completed":
        return {
          bg: "bg-blue-500/10 border-blue-500/30 text-blue-400",
          icon: <CheckCircle2 className="w-4 h-4 text-blue-400" />,
          glow: "border-blue-500/60",
          statusText: "Done"
        };
      case "Error":
        return {
          bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
          icon: <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />,
          glow: "shadow-[0_0_15px_rgba(244,63,94,0.3)] border-rose-500",
          statusText: "Error"
        };
      case "Chat":
        return {
          bg: "bg-purple-500/10 border-purple-500/30 text-purple-400",
          icon: <Play className="w-4 h-4 text-purple-400" />,
          glow: "shadow-[0_0_15px_rgba(168,85,247,0.25)] border-purple-400",
          statusText: "Interview"
        };
      default:
        return {
          bg: "bg-slate-900/40 border-white/5 text-gray-500",
          icon: <HelpCircle className="w-4 h-4 text-gray-600" />,
          glow: "border-white/5 hover:border-white/20",
          statusText: "Idle"
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/60 border border-white/5 rounded-xl overflow-hidden glass-panel">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/50 border-b border-white/5">
        <User className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-semibold tracking-wider text-violet-400 uppercase">
          AGENT WORKFLOW NETWORK
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 tech-grid-bg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent) => {
            const config = getStatusConfig(agent.status);
            const isSelected = activeAgent === agent.name;
            
            return (
              <div
                key={agent.name}
                onClick={() => onSelectAgent(agent.name)}
                className={`relative flex flex-col justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-300 ${config.bg} ${config.glow} ${
                  isSelected ? "scale-[1.02] border-violet-500 ring-1 ring-violet-500/50" : ""
                }`}
              >
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-sm font-semibold tracking-wide ${isSelected ? "text-violet-300" : "text-white"}`}>
                      {agent.name}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5 tracking-wider">
                      {agent.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-md border border-white/5">
                    {config.icon}
                    <span className="text-[10px] font-semibold uppercase">{config.statusText}</span>
                  </div>
                </div>

                {/* Subtitle / Live Output description */}
                <div className="mt-3 text-xs text-gray-300 line-clamp-2 italic">
                  {agent.message || "Awaiting task..."}
                </div>

                {/* Bottom line */}
                <div className="mt-2.5 pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-500">
                  <span>Simulated Agent</span>
                  {isSelected && (
                    <span className="text-violet-400 font-bold animate-pulse text-[9px] tracking-widest uppercase">
                      ACTIVE CHAT
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
