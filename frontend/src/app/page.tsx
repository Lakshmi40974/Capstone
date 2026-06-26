"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal, Settings as SettingsIcon, Play, Code2, 
  FolderGit2, BarChart2, Plus, LogOut, Send, Download, 
  Github, Save, RefreshCw, Layers, ShieldCheck, HeartPulse
} from "lucide-react";
import Editor from "@monaco-editor/react";

import FileExplorer from "../components/FileExplorer";
import AgentWorkflow from "../components/AgentWorkflow";
import AnalyticsDashboard from "../components/AnalyticsDashboard";

// Base API URL
const API_URL = "http://localhost:8000/api";
const WS_URL = "ws://localhost:8000/api/ws";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface LogEntry {
  id?: number;
  agent_name: string;
  status: string;
  message: string;
  timestamp: string;
}

interface FileItem {
  path: string;
  updated_at: string;
}

export default function Home() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"projects" | "workspace" | "agents" | "analytics" | "settings">("projects");
  
  // Projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  // Workspace
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const [editorContent, setEditorContent] = useState<string>("");
  const [isEditorSaving, setIsEditorSaving] = useState(false);
  
  // Real-time Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  
  // Agents workflow statuses
  const [agents, setAgents] = useState<any[]>([]);
  
  // Chat
  const [activeChatAgent, setActiveChatAgent] = useState("Product Manager");
  const [chatMessage, setChatMessage] = useState("");
  const [chatConversations, setChatConversations] = useState<{ [agent: string]: { sender: "user" | "agent"; text: string }[] }>({});
  const [isSendingChat, setIsSendingChat] = useState(false);
  
  // Settings keys
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState({
    active_agents: 14,
    total_projects: 0,
    total_files: 0,
    token_usage: 0,
    success_rate: 100,
    error_count: 0,
    build_success_rate: 100
  });

  const wsRef = useRef<WebSocket | null>(null);

  // Initialize simulated 14 agents
  const initialAgents = [
    { name: "Product Manager", role: "Requirements Specifier", status: "Idle", message: "Awaiting task..." },
    { name: "Software Architect", role: "UML/Folder Design", status: "Idle", message: "Awaiting specs..." },
    { name: "UI/UX Designer", role: "Styles & Themes", status: "Idle", message: "Awaiting wireframes..." },
    { name: "Research Agent", role: "Library & Stack analysis", status: "Idle", message: "Awaiting requirements..." },
    { name: "Database Engineer", role: "DB Schemas", status: "Idle", message: "Awaiting models..." },
    { name: "Backend Developer", role: "FastAPI Implementation", status: "Idle", message: "Awaiting database schema..." },
    { name: "Frontend Developer", role: "Next.js & Tailwind components", status: "Idle", message: "Awaiting design docs..." },
    { name: "Code Reviewer", role: "Quality reviews", status: "Idle", message: "Awaiting code..." },
    { name: "Security Agent", role: "OWASP Vulnerabilities check", status: "Idle", message: "Awaiting code..." },
    { name: "QA Testing Agent", role: "Unit & E2E tests", status: "Idle", message: "Awaiting code..." },
    { name: "Performance Agent", role: "Tuning DB queries", status: "Idle", message: "Awaiting review..." },
    { name: "Debugging Agent", role: "Healing Compile Exceptions", status: "Idle", message: "Awaiting diagnostic reports..." },
    { name: "DevOps Agent", role: "Docker & GitHub Actions", status: "Idle", message: "Awaiting builds..." },
    { name: "Documentation Agent", role: "README technical writer", status: "Idle", message: "Awaiting project completion..." }
  ];

  useEffect(() => {
    fetchProjects();
    fetchSettings();
    fetchAnalytics();
    setAgents(initialAgents);
  }, []);

  // Handle WebSocket Connection
  useEffect(() => {
    if (!selectedProject) return;

    // Connect to WebSocket
    const ws = new WebSocket(`${WS_URL}/${selectedProject.id}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "log") {
        const newLog: LogEntry = {
          agent_name: data.agent_name,
          status: data.status,
          message: data.message,
          timestamp: new Date().toLocaleTimeString()
        };
        setLogs((prev) => [...prev, newLog]);

        // Update active agent status in UI
        setAgents((prev) => 
          prev.map((agent) => {
            if (agent.name === data.agent_name) {
              return {
                ...agent,
                status: data.status === "Success" || data.status === "Completed" ? "Completed" : data.status,
                message: data.message
              };
            }
            return agent;
          })
        );

        // Auto fetch files when developer updates them
        if (data.status === "FileCreated" || data.status === "HealedFile") {
          fetchFiles(selectedProject.id);
        }
      } else if (data.type === "file_updated") {
        fetchFiles(selectedProject.id);
      }
    };

    ws.onclose = () => {
      logger.info("WebSocket disconnected.");
    };

    // Load initial project logs & files
    fetchLogs(selectedProject.id);
    fetchFiles(selectedProject.id);

    return () => {
      ws.close();
    };
  }, [selectedProject]);

  // Scroll to bottom of logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Fetch REST APIS
  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/projects`);
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/settings`);
      const data = await res.json();
      setGeminiApiKey(data.gemini_api_key);
      setGithubToken(data.github_token);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFiles = async (projectId: string) => {
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}/files`);
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async (projectId: string) => {
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}/logs`);
      const data = await res.json();
      const mappedLogs = data.map((log: any) => ({
        agent_name: log.agent_name,
        status: log.status,
        message: log.message,
        timestamp: new Date(log.timestamp).toLocaleTimeString()
      }));
      setLogs(mappedLogs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectFile = async (path: string) => {
    if (!selectedProject) return;
    try {
      setActiveFile(path);
      const res = await fetch(`${API_URL}/projects/${selectedProject.id}/files/${path}`);
      const data = await res.json();
      setEditorContent(data.content);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveFile = async () => {
    if (!selectedProject || !activeFile) return;
    setIsEditorSaving(true);
    try {
      await fetch(`${API_URL}/projects/${selectedProject.id}/files/${activeFile}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editorContent })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsEditorSaving(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc })
      });
      const data = await res.json();
      setProjects((prev) => [data, ...prev]);
      setSelectedProject(data);
      setNewProjectName("");
      setNewProjectDesc("");
      setShowNewProjectModal(false);
      setActiveTab("workspace");
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerGeneration = async () => {
    if (!selectedProject) return;
    try {
      // Clear status
      setAgents(initialAgents.map(a => ({ ...a, status: "Idle", message: "Generating..." })));
      setLogs([]);
      
      await fetch(`${API_URL}/projects/${selectedProject.id}/generate`, { method: "POST" });
      
      // Update selected project status
      setSelectedProject((prev: any) => prev ? { ...prev, status: "In Progress" } : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await fetch(`${API_URL}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gemini_api_key: geminiApiKey, github_token: githubToken })
      });
      setSaveSettingsSuccess(true);
      setTimeout(() => setSaveSettingsSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendChat = async () => {
    if (!selectedProject || !chatMessage.trim() || isSendingChat) return;
    
    const prompt = chatMessage;
    setChatMessage("");
    setIsSendingChat(true);

    // Update UI chat logs locally
    setChatConversations((prev) => ({
      ...prev,
      [activeChatAgent]: [...(prev[activeChatAgent] || []), { sender: "user", text: prompt }]
    }));

    try {
      const res = await fetch(`${API_URL}/projects/${selectedProject.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_name: activeChatAgent, message: prompt })
      });
      const data = await res.json();
      
      // Add response
      setChatConversations((prev) => ({
        ...prev,
        [activeChatAgent]: [...(prev[activeChatAgent] || []), { sender: "agent", text: data.response }]
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleExportZip = () => {
    if (!selectedProject) return;
    window.open(`${API_URL}/projects/${selectedProject.id}/export`, "_blank");
  };

  return (
    <div className="flex h-screen bg-cyber-bg text-gray-200 overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/5 bg-slate-950/80 flex flex-col justify-between z-10 glass-panel">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
            <div className="p-2 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-lg shadow-lg shadow-violet-500/20">
              <Layers className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-widest uppercase">AUTO DEVS</h1>
              <p className="text-[9px] text-cyan-400 font-semibold tracking-wide uppercase">AI Software House</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <button 
              onClick={() => setActiveTab("projects")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all ${
                activeTab === "projects" 
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30" 
                  : "hover:bg-white/5 text-gray-400 hover:text-gray-200"
              }`}
            >
              <FolderGit2 className="w-4 h-4" />
              Projects
            </button>
            <button 
              onClick={() => {
                if (selectedProject) setActiveTab("workspace");
              }}
              disabled={!selectedProject}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all ${
                !selectedProject 
                  ? "opacity-40 cursor-not-allowed" 
                  : activeTab === "workspace" 
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/30" 
                    : "hover:bg-white/5 text-gray-400 hover:text-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Code2 className="w-4 h-4" />
                Workspace
              </div>
              {selectedProject && selectedProject.status === "In Progress" && (
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              )}
            </button>
            <button 
              onClick={() => {
                if (selectedProject) setActiveTab("agents");
              }}
              disabled={!selectedProject}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all ${
                !selectedProject 
                  ? "opacity-40 cursor-not-allowed" 
                  : activeTab === "agents" 
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/30" 
                    : "hover:bg-white/5 text-gray-400 hover:text-gray-200"
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              Agent Workflow
            </button>
            <button 
              onClick={() => {
                fetchAnalytics();
                setActiveTab("analytics");
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all ${
                activeTab === "analytics" 
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30" 
                  : "hover:bg-white/5 text-gray-400 hover:text-gray-200"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Analytics
            </button>
            <button 
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all ${
                activeTab === "settings" 
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30" 
                  : "hover:bg-white/5 text-gray-400 hover:text-gray-200"
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              Settings
            </button>
          </nav>
        </div>

        {/* Selected Project Footer display */}
        {selectedProject && (
          <div className="p-4 m-4 bg-slate-900/60 border border-white/5 rounded-xl">
            <h4 className="text-xs font-bold text-white truncate">{selectedProject.name}</h4>
            <p className="text-[10px] text-gray-400 mt-1 truncate">Status: <span className="text-cyan-400 font-semibold">{selectedProject.status}</span></p>
          </div>
        )}
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col h-full bg-slate-950/40 relative">
        <div className="absolute inset-0 tech-grid-bg opacity-40 pointer-events-none" />

        {/* Header Bar */}
        <header className="px-8 py-4 border-b border-white/5 bg-slate-950/50 flex justify-between items-center z-10 glass-panel">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">
              {activeTab === "projects" && "SIMULATED DEVELOPMENT PROJECTS"}
              {activeTab === "workspace" && `DEVELOPER WORKSPACE: ${selectedProject?.name || ""}`}
              {activeTab === "agents" && "MULTI-AGENT COLLABORATION PIPELINE"}
              {activeTab === "analytics" && "PLATFORM USAGE & METRIC METADATA"}
              {activeTab === "settings" && "DEVELOPMENT KEYS & API SETTINGS"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "workspace" && selectedProject && (
              <>
                <button
                  onClick={handleTriggerGeneration}
                  disabled={selectedProject.status === "In Progress"}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white uppercase shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Compile / Run Team
                </button>
                <button
                  onClick={handleExportZip}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-gray-200 hover:text-white uppercase transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  ZIP Export
                </button>
              </>
            )}
            
            {activeTab === "projects" && (
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 hover:brightness-110 text-xs font-bold text-white uppercase tracking-wider transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                New Project
              </button>
            )}
          </div>
        </header>

        {/* Tab View Contents */}
        <div className="flex-1 overflow-hidden p-6 z-10">
          
          {/* 1. Projects List view */}
          {activeTab === "projects" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto max-h-full">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => {
                    setSelectedProject(proj);
                    setActiveTab("workspace");
                  }}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between h-[180px] hover:scale-[1.01] ${
                    selectedProject?.id === proj.id
                      ? "bg-violet-600/10 border-violet-500 shadow-md shadow-violet-500/15"
                      : "bg-slate-900/50 border-white/5 hover:border-white/15"
                  }`}
                >
                  <div>
                    <h3 className="text-base font-bold text-white truncate">{proj.name}</h3>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-3">{proj.description}</p>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5 text-xs">
                    <span className="text-gray-500">{new Date(proj.created_at).toLocaleDateString()}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-950 border border-white/5 text-cyan-400 font-semibold text-[10px] tracking-wider uppercase">
                      {proj.status}
                    </span>
                  </div>
                </div>
              ))}
              
              {projects.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
                  <FolderGit2 className="w-16 h-16 opacity-10 mb-4 text-violet-400" />
                  <p className="text-sm">No projects created yet. Click "New Project" to start.</p>
                </div>
              )}
            </div>
          )}

          {/* 2. Workspace View (Complete Lovable/Devin style editor) */}
          {activeTab === "workspace" && selectedProject && (
            <div className="flex h-full gap-5 overflow-hidden">
              
              {/* File Explorer (Left Panel) */}
              <div className="w-72 h-full flex flex-col">
                <FileExplorer 
                  files={files} 
                  activeFile={activeFile} 
                  onSelectFile={handleSelectFile} 
                />
              </div>

              {/* Monaco Code Editor (Center Panel) */}
              <div className="flex-1 flex flex-col h-full bg-slate-950/60 border border-white/5 rounded-xl overflow-hidden glass-panel">
                <div className="flex justify-between items-center px-4 py-2.5 bg-slate-900/50 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-gray-300 font-medium truncate max-w-[200px]">
                      {activeFile || "No file opened"}
                    </span>
                  </div>
                  {activeFile && (
                    <button
                      onClick={handleSaveFile}
                      disabled={isEditorSaving}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-500 text-[10px] font-bold text-white uppercase transition-all disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isEditorSaving ? "Saving..." : "Save"}
                    </button>
                  )}
                </div>

                {/* Editor Container */}
                <div className="flex-1 relative bg-[#1e1e1e]">
                  {activeFile ? (
                    <Editor
                      height="100%"
                      language={activeFile.endsWith(".py") ? "python" : activeFile.endsWith(".md") ? "markdown" : "typescript"}
                      theme="vs-dark"
                      value={editorContent}
                      onChange={(value) => setEditorContent(value || "")}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 }
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 text-xs">
                      <Code2 className="w-12 h-12 opacity-10 mb-2 text-violet-400 animate-pulse" />
                      Select a file from the explorer or compile the agent team to generate code.
                    </div>
                  )}
                </div>

                {/* Real-time Streaming Logs Terminal (Bottom Panel) */}
                <div className="h-64 border-t border-white/5 bg-slate-950/95 flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border-b border-white/5">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-gray-300">STREAMING AGENT ACTIVITY LOGS</span>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] space-y-1.5 text-gray-300">
                    {logs.map((log, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-gray-500">[{log.timestamp}]</span>
                        <span className="text-violet-400 font-semibold truncate max-w-[120px]">{log.agent_name}:</span>
                        <span className="text-cyan-400">[{log.status}]</span>
                        <span className="text-gray-200 whitespace-pre-wrap">{log.message}</span>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="text-gray-600 italic">No agent updates yet. Click "Compile / Run Team" above to begin.</div>
                    )}
                    <div ref={terminalEndRef} />
                  </div>
                </div>
              </div>

              {/* Chat Panel & Live Performance ranking (Right Panel) */}
              <div className="w-80 h-full flex flex-col bg-slate-950/60 border border-white/5 rounded-xl overflow-hidden glass-panel">
                
                {/* Chat header selecting agent */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">INTERVIEW AGENT</span>
                    <span className="text-[9px] text-cyan-400 uppercase font-semibold">{activeChatAgent}</span>
                  </div>
                  <select 
                    value={activeChatAgent}
                    onChange={(e) => setActiveChatAgent(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-md text-[10px] py-1 px-2 text-gray-300 focus:outline-none"
                  >
                    {agents.map((a) => (
                      <option key={a.name} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>

                {/* Chat messaging display */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                  {(chatConversations[activeChatAgent] || []).map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                      <span className="text-[9px] text-gray-500 font-semibold mb-0.5 uppercase">
                        {msg.sender === "user" ? "You" : activeChatAgent}
                      </span>
                      <div className={`p-2.5 rounded-2xl text-xs max-w-[90%] whitespace-pre-wrap ${
                        msg.sender === "user" 
                          ? "bg-violet-600 text-white rounded-tr-none" 
                          : "bg-slate-900/80 border border-white/5 text-gray-200 rounded-tl-none"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  
                  {(!chatConversations[activeChatAgent] || chatConversations[activeChatAgent].length === 0) && (
                    <div className="text-center text-gray-500 text-xs py-8">
                      You can ask {activeChatAgent} details about the project plans, generated files, or system designs.
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-3 bg-slate-900/30 border-t border-white/5 flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                    placeholder={`Message ${activeChatAgent}...`}
                    className="flex-1 bg-slate-950 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={handleSendChat}
                    className="p-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Agent workflow visualizer network */}
          {activeTab === "agents" && selectedProject && (
            <AgentWorkflow 
              agents={agents} 
              activeAgent={activeChatAgent}
              onSelectAgent={(name) => {
                setActiveChatAgent(name);
                setActiveTab("workspace");
              }}
            />
          )}

          {/* 4. Analytics Dashboard view */}
          {activeTab === "analytics" && (
            <AnalyticsDashboard data={analytics} />
          )}

          {/* 5. Settings Screen */}
          {activeTab === "settings" && (
            <div className="max-w-2xl bg-slate-950/60 border border-white/5 rounded-xl p-6 glass-panel space-y-6">
              <h3 className="text-base font-bold text-white">Platform Settings</h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Gemini API Key</label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter your Gemini Generative AI Key"
                    className="w-full bg-slate-900/60 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500 transition-all"
                  />
                  <p className="text-[10px] text-gray-500">Stored locally in your secure database. Used to run the 14 agent simulations.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">GitHub Access Token (PAT)</label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="Enter your GitHub PAT"
                    className="w-full bg-slate-900/60 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500 transition-all"
                  />
                  <p className="text-[10px] text-gray-500">Required if you want the agents to automatically commit or publish code directly to GitHub.</p>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white uppercase tracking-wider transition-all"
                >
                  Save Settings
                </button>

                {saveSettingsSuccess && (
                  <p className="text-xs text-emerald-400 font-semibold mt-2 animate-pulse">✓ Settings saved successfully!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* New Project creation Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-white/10 rounded-2xl p-6 glass-panel space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white">Create New Project</h3>
              <button 
                onClick={() => setShowNewProjectModal(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. E-Commerce Platform"
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase">Project Description (Prompt)</label>
                <textarea
                  rows={4}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Describe your project idea in detail: E.g., Build an e-commerce website with auth and stripe checkout backend..."
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white uppercase tracking-wider transition-all"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
