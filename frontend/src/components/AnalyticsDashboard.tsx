"use client";

import React from "react";
import { Cpu, FileCode, Landmark, CheckSquare, Zap, BarChart2, TrendingUp } from "lucide-react";

interface AnalyticsData {
  active_agents: number;
  total_projects: number;
  total_files: number;
  token_usage: number;
  success_rate: number;
  error_count: number;
  build_success_rate: number;
}

interface AnalyticsDashboardProps {
  data: AnalyticsData;
}

export default function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  
  // Custom mock charts data representing agent performance speed (sec) and token consumption (thousands)
  const agentSpeedData = [
    { name: "PM", val: 12 },
    { name: "Arch", val: 15 },
    { name: "UI/UX", val: 8 },
    { name: "Devs", val: 24 },
    { name: "Reviewer", val: 14 },
    { name: "QA", val: 16 },
    { name: "Debugger", val: 10 },
    { name: "DevOps", val: 9 },
  ];

  const tokenUsageData = [12, 19, 32, 45, 54, 73, 91, 112]; // thousands of tokens cumulative

  return (
    <div className="flex flex-col h-full bg-slate-950/60 border border-white/5 rounded-xl overflow-hidden glass-panel">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/50 border-b border-white/5">
        <BarChart2 className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
          PERFORMANCE & COST ANALYTICS
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900/50 border border-white/5 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
              <Cpu className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Active Agents</p>
              <h3 className="text-2xl font-bold text-white mt-1">{data.active_agents}</h3>
            </div>
          </div>

          <div className="p-4 bg-slate-900/50 border border-white/5 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <FileCode className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Files Written</p>
              <h3 className="text-2xl font-bold text-white mt-1">{data.total_files}</h3>
            </div>
          </div>

          <div className="p-4 bg-slate-900/50 border border-white/5 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Landmark className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Tokens Burned</p>
              <h3 className="text-2xl font-bold text-white mt-1">{data.token_usage.toLocaleString()}</h3>
            </div>
          </div>

          <div className="p-4 bg-slate-900/50 border border-white/5 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <CheckSquare className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Build Success</p>
              <h3 className="text-2xl font-bold text-white mt-1">{data.build_success_rate}%</h3>
            </div>
          </div>
        </div>

        {/* Charts Section using Interactive SVGs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Chart 1: Agent Execution Speed (Bar Chart) */}
          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl flex flex-col justify-between h-[280px]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-semibold text-white">Agent Execution Speed (seconds)</h4>
              </div>
              <span className="text-[10px] text-gray-500">Lower is better</span>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2 h-40 border-b border-white/5">
              {agentSpeedData.map((bar, i) => {
                const heightPercent = `${(bar.val / 30) * 100}%`;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">{bar.val}s</span>
                    <div 
                      style={{ height: heightPercent }}
                      className="w-full bg-gradient-to-t from-cyan-600/80 to-violet-500/90 rounded-t-md cursor-pointer hover:brightness-125 transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                    />
                    <span className="text-[9px] font-semibold text-gray-500 mt-1 truncate max-w-full">{bar.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: API Token Consumption Trend (Line Chart) */}
          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl flex flex-col justify-between h-[280px]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-400" />
                <h4 className="text-sm font-semibold text-white">Token Usage Over Steps (cumulative k)</h4>
              </div>
              <span className="text-[10px] text-gray-500">API Tokens</span>
            </div>

            {/* Custom SVG Line Chart */}
            <div className="flex-1 relative flex items-end pb-2 h-40 border-b border-white/5">
              <svg className="w-full h-full" viewBox="0 0 400 150">
                {/* Grid lines */}
                <line x1="0" y1="37" x2="400" y2="37" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1="75" x2="400" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1="112" x2="400" y2="112" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                {/* Line path */}
                <path
                  d={`M 10 ${140 - (tokenUsageData[0] / 120) * 120} 
                     L 65 ${140 - (tokenUsageData[1] / 120) * 120} 
                     L 120 ${140 - (tokenUsageData[2] / 120) * 120} 
                     L 175 ${140 - (tokenUsageData[3] / 120) * 120} 
                     L 230 ${140 - (tokenUsageData[4] / 120) * 120} 
                     L 285 ${140 - (tokenUsageData[5] / 120) * 120} 
                     L 340 ${140 - (tokenUsageData[6] / 120) * 120} 
                     L 390 ${140 - (tokenUsageData[7] / 120) * 120}`}
                  fill="none"
                  stroke="url(#grad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Gradients */}
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>

                {/* Points */}
                {tokenUsageData.map((val, idx) => {
                  const x = 10 + idx * 54.3;
                  const y = 140 - (val / 120) * 120;
                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r="4.5"
                      fill="#8b5cf6"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="cursor-pointer hover:r-[6.5] transition-all"
                    />
                  );
                })}
              </svg>
            </div>
            
            {/* Axis labels */}
            <div className="flex justify-between text-[8px] text-gray-500 px-1 pt-1">
              <span>Step 1</span>
              <span>Step 3</span>
              <span>Step 5</span>
              <span>Step 7</span>
              <span>Step 8</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
