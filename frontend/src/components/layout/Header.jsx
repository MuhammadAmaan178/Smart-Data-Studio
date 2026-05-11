import React, { useState, useRef, useEffect } from 'react';
import {
  Database, Save, Download, Sun, Moon,
  PanelLeftClose, PanelLeftOpen, RefreshCw, Trash2,
  Wifi, ChevronDown, FolderOpen, Sparkles, FileText,
} from 'lucide-react';

// ─── Click-outside dropdown hook ─────────────────────────────────
const useDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);
  return { isOpen, setIsOpen, ref };
};

// ─── Reusable Dropdown Component ─────────────────────────────────
const DropdownMenu = ({ label, items }) => {
  const { isOpen, setIsOpen, ref } = useDropdown();
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-1 px-3 py-1 text-xs font-black cursor-pointer
                   text-black bg-white border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                   hover:bg-yellow-200 transition-none select-none uppercase"
      >
        {label}
        <ChevronDown size={11} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-54 z-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                        border-[3px] overflow-hidden bg-white border-black">
          {items.map((item, i) =>
            item === 'divider'
              ? <div key={i} className="border-t border-gray-100 dark:border-gray-700 my-1" />
              : (
                <button
                  key={i}
                  onClick={() => { item.action?.(); setIsOpen(false); }}
                  disabled={item.disabled}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left font-bold
                             text-black hover:bg-cyan-300
                             disabled:opacity-40 disabled:cursor-not-allowed
                             transition-none cursor-pointer uppercase"
                >
                  {item.icon && (
                    <item.icon size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                  )}
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-600">{item.shortcut}</span>
                  )}
                </button>
              )
          )}
        </div>
      )}
    </div>
  );
};

// ─── Editable Project Name ────────────────────────────────────────
const ProjectName = ({ name, setName }) => {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  const startEdit = () => { setEditing(true); setTimeout(() => inputRef.current?.select(), 10); };
  const endEdit   = () => { setEditing(false); if (!name.trim()) setName('Untitled_Project.sds'); };

  return editing ? (
    <input
      ref={inputRef}
      value={name}
      onChange={e => setName(e.target.value)}
      onBlur={endEdit}
      onKeyDown={e => e.key === 'Enter' && inputRef.current?.blur()}
      autoFocus
      className="text-sm font-black border-[3px] border-black px-2 py-0.5 outline-none w-52
                 bg-yellow-200 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
    />
  ) : (
    <button
      onClick={startEdit}
      title="Click to rename project"
      className="text-sm font-black px-2 py-0.5 cursor-text border-[3px] border-transparent
                 text-black hover:bg-yellow-200 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                 transition-none"
    >
      {name}
    </button>
  );
};

// ─── Main Header ──────────────────────────────────────────────────
const Header = ({ 
  theme, toggleTheme, sidebarOpen, toggleSidebar, onOpenDemoModal, 
  onFileUpload, projectName, setProjectName, onSaveWorkspace, onLoadWorkspace
}) => {
  const fileInputRef = useRef(null);
  const sdsInputRef  = useRef(null);

  const fileItems = [
    { 
      label: 'Import Dataset (.csv)', 
      icon: Database, 
      action: () => fileInputRef.current?.click(),
      shortcut: 'Ctrl+I' 
    },
    { 
      label: 'Load Workspace (.sds)', 
      icon: FolderOpen, 
      action: () => sdsInputRef.current?.click(),
      shortcut: 'Ctrl+L' 
    },
    { 
      label: 'Save Workspace (.sds)', 
      icon: Save, 
      action: onSaveWorkspace,
      shortcut: 'Ctrl+S' 
    },
  ];

  const viewItems = [
    {
      label:  theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      icon:   theme === 'dark' ? Sun : Moon,
      action: toggleTheme,
    },
    {
      label:  sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar',
      icon:   sidebarOpen ? PanelLeftClose : PanelLeftOpen,
      action: toggleSidebar,
    },
  ];

  const runtimeItems = [
    { label: 'Restart Backend', icon: RefreshCw, action: () => {}, disabled: true },
    { label: 'Clear Output',    icon: Trash2,    action: () => {}, disabled: true },
  ];

  return (
    <header className="shrink-0 flex flex-col bg-[#fff8e7] border-b-[3px] border-black transition-none z-50">

      {/* ── Top Row ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between h-14 px-4 border-b-[3px] border-black">

        {/* Left: Logo + Project Name */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-black flex items-center justify-center text-[#00f0ff] text-xl font-black shadow-[2px_2px_0px_0px_rgba(255,73,158,1)] border-2 border-black transform -rotate-3">
              S
            </div>
            <span className="text-sm font-black text-black tracking-widest hidden sm:block select-none uppercase">
              Smart DataStudio
            </span>
          </div>
          <span className="text-black font-black text-lg select-none">/</span>
          <ProjectName name={projectName} setName={setProjectName} />
        </div>

        {/* Right: Connection + Theme toggle + Avatar */}
        <div className="flex items-center gap-3">

          {/* Connection badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-[11px] font-black uppercase
                          bg-lime-400 border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                          text-black">
            <Wifi size={11} />
            <span>Connected</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 rounded-lg cursor-pointer transition-colors
                       text-gray-500 dark:text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-700
                       hover:text-gray-900 dark:hover:text-gray-100"
          >
            {theme === 'dark'
              ? <Sun  size={16} className="text-yellow-400" />
              : <Moon size={16} />
            }
          </button>

          {/* User Avatar */}
          <div className="w-8 h-8 border-[3px] border-black flex items-center justify-center
                          text-black text-xs font-black cursor-pointer
                          bg-pink-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                          hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-none">
            A
          </div>
        </div>
      </div>

      {/* ── Menu Bar (bottom row) ─────────────────────────── */}
      <div className="flex items-center gap-0.5 h-8 px-2">
        <DropdownMenu label="File"    items={fileItems}    />
        <DropdownMenu label="View"    items={viewItems}    />
        <DropdownMenu label="Runtime" items={runtimeItems} />

        {/* Separator */}
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* ── "Try Demo" — top-level direct-action button ── */}
        <button
          onClick={onOpenDemoModal}
          className="flex items-center gap-1.5 px-4 py-1 text-xs font-black uppercase
                     text-black bg-cyan-400 border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                     active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                     transition-none cursor-pointer select-none"
          title="Load a standard demo dataset instantly"
        >
          <Sparkles size={12} />
          Try Demo
        </button>

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".csv" 
          onChange={(e) => {
            if (e.target.files[0]) {
              onFileUpload(e.target.files[0]);
              e.target.value = ''; // Reset for same-file re-upload
            }
          }} 
        />
        <input 
          type="file" 
          ref={sdsInputRef} 
          className="hidden" 
          accept=".sds" 
          onChange={(e) => {
            if (e.target.files[0]) {
              onLoadWorkspace(e.target.files[0]);
              e.target.value = '';
            }
          }} 
        />
      </div>
    </header>
  );
};

export default Header;
