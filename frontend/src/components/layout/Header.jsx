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
        className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium cursor-pointer
                   text-gray-600 dark:text-gray-300
                   hover:bg-gray-100 dark:hover:bg-gray-700
                   transition-colors select-none"
      >
        {label}
        <ChevronDown size={11} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-54 z-50 rounded-lg shadow-2xl
                        border overflow-hidden
                        bg-white dark:bg-gray-800
                        border-gray-200 dark:border-gray-600">
          {items.map((item, i) =>
            item === 'divider'
              ? <div key={i} className="border-t border-gray-100 dark:border-gray-700 my-1" />
              : (
                <button
                  key={i}
                  onClick={() => { item.action?.(); setIsOpen(false); }}
                  disabled={item.disabled}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left
                             text-gray-700 dark:text-gray-200
                             hover:bg-gray-50 dark:hover:bg-gray-700
                             disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors cursor-pointer"
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
      className="text-sm font-medium border border-blue-400 rounded px-2 py-0.5 outline-none w-52
                 bg-white dark:bg-gray-700
                 text-gray-800 dark:text-gray-100"
    />
  ) : (
    <button
      onClick={startEdit}
      title="Click to rename project"
      className="text-sm font-medium px-2 py-0.5 rounded cursor-text border border-transparent
                 text-gray-700 dark:text-gray-200
                 hover:bg-gray-100 dark:hover:bg-gray-700
                 hover:border-gray-300 dark:hover:border-gray-600
                 transition-colors"
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
    <header className="shrink-0 flex flex-col
                       bg-white dark:bg-gray-900
                       border-b border-gray-200 dark:border-gray-700
                       transition-colors duration-300">

      {/* ── Top Row ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between h-11 px-4
                      border-b border-gray-100 dark:border-gray-800">

        {/* Left: Logo + Project Name */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600
                            flex items-center justify-center text-white text-xs font-black shadow-sm">
              S
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 hidden sm:block select-none">
              Smart DataStudio
            </span>
          </div>
          <span className="text-gray-300 dark:text-gray-600 text-lg select-none">/</span>
          <ProjectName name={projectName} setName={setProjectName} />
        </div>

        {/* Right: Connection + Theme toggle + Avatar */}
        <div className="flex items-center gap-3">

          {/* Connection badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium
                          bg-green-50 dark:bg-green-900/30
                          border border-green-200 dark:border-green-800
                          text-green-700 dark:text-green-400">
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
          <div className="w-7 h-7 rounded-full flex items-center justify-center
                          text-white text-xs font-bold cursor-pointer
                          bg-gradient-to-br from-purple-500 to-pink-500
                          hover:opacity-80 transition-opacity shadow-sm">
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded
                     text-blue-600 dark:text-blue-400
                     bg-blue-50 dark:bg-blue-900/30
                     hover:bg-blue-100 dark:hover:bg-blue-900/50
                     border border-blue-200 dark:border-blue-800
                     transition-colors cursor-pointer select-none"
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
