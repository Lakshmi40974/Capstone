"use client";

import React, { useState } from "react";
import { Folder, FolderOpen, FileCode, ChevronDown, ChevronRight, HardDrive } from "lucide-react";

interface FileItem {
  path: string;
  updated_at: string;
}

interface FileExplorerProps {
  files: FileItem[];
  activeFile: string;
  onSelectFile: (path: string) => void;
}

interface TreeNode {
  name: string;
  fullPath: string;
  type: "file" | "folder";
  children?: { [key: string]: TreeNode };
}

export default function FileExplorer({ files, activeFile, onSelectFile }: FileExplorerProps) {
  const [collapsedFolders, setCollapsedFolders] = useState<{ [key: string]: boolean }>({});

  const toggleFolder = (path: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  // Build tree from file paths
  const buildTree = (fileList: FileItem[]): TreeNode => {
    const root: TreeNode = { name: "root", fullPath: "", type: "folder", children: {} };

    fileList.forEach((file) => {
      const parts = file.path.split("/");
      let current = root;

      parts.forEach((part, index) => {
        if (!current.children) current.children = {};

        const isLast = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join("/");

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            fullPath: currentPath,
            type: isLast ? "file" : "folder",
            children: isLast ? undefined : {},
          };
        }
        current = current.children[part];
      });
    });

    return root;
  };

  const tree = buildTree(files);

  const renderNode = (node: TreeNode, depth: number = 0) => {
    if (node.name === "root") {
      return Object.values(node.children || {}).map((child) => renderNode(child, depth));
    }

    const isFolder = node.type === "folder";
    const isCollapsed = collapsedFolders[node.fullPath] || false;
    const isActive = activeFile === node.fullPath;

    return (
      <div key={node.fullPath} className="select-none">
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.fullPath);
            } else {
              onSelectFile(node.fullPath);
            }
          }}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer text-sm transition-all duration-150 ${
            isActive
              ? "bg-violet-600/30 text-violet-300 border-l-2 border-violet-500 font-medium"
              : "hover:bg-white/5 text-gray-400 hover:text-gray-200"
          }`}
        >
          {isFolder ? (
            <>
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              )}
              {isCollapsed ? (
                <Folder className="w-4 h-4 text-violet-400/80" />
              ) : (
                <FolderOpen className="w-4 h-4 text-violet-400" />
              )}
            </>
          ) : (
            <>
              <span className="w-3.5" /> {/* Align with chevron */}
              <FileCode className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-gray-500"}`} />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </div>

        {isFolder && !isCollapsed && node.children && (
          <div className="mt-0.5">
            {Object.values(node.children).map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/60 border border-white/5 rounded-xl overflow-hidden glass-panel">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/50 border-b border-white/5">
        <HardDrive className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">
          WORKSPACE FILES
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-xs p-4 text-center">
            <Folder className="w-8 h-8 opacity-20 mb-2 text-violet-400" />
            No files generated yet
          </div>
        ) : (
          renderNode(tree)
        )}
      </div>
    </div>
  );
}
