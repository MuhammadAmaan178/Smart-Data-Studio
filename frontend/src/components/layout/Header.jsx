import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logOut } from '../../utils/auth';
import {
  Database, Save, Download,
  PanelLeftClose, PanelLeftOpen, RefreshCw, Trash2,
  Wifi, ChevronDown, FolderOpen, Sparkles, FileText,
  Cloud, LogOut, Menu,
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
        <div 
          style={{ zIndex: 99999 }}
          className="absolute top-full left-0 mt-2 w-54 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                        border-[3px] overflow-hidden bg-white border-black z-[60]"
        >
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
  sidebarOpen, toggleSidebar, onOpenDemoModal, 
  onFileUpload, projectName, setProjectName, onSaveWorkspace, onLoadWorkspace,
  hasUnsavedChanges, isSaving, saveStatus, session, onSaveToCloud, onLogout
}) => {
  const navigate = useNavigate();
  const avatarDropdown = useDropdown();
  const fileInputRef = useRef(null);
  const sdsInputRef  = useRef(null);

  const fileItems = [
    {
      label: 'MY PROJECTS',
      icon: FolderOpen,
      action: () => navigate('/projects')
    },
    'divider',
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
    {
      label: 'Save to Cloud',
      icon: Cloud,
      action: onSaveToCloud,
      shortcut: 'Ctrl+Shift+S'
    },
    'divider',
    {
      label: 'Log Out',
      icon: LogOut,
      action: onLogout
    }
  ];


  const viewItems = [
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
    <header className="shrink-0 flex flex-col bg-[#fff8e7] border-b-[3px] border-black transition-none z-40">

      {/* ── Top Row ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between h-14 px-4 border-b-[3px] border-black">

        {/* Left: Logo + Project Name */}
        <div className="flex items-center gap-3">
          {/* Hamburger button for mobile overlay drawer */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-1 mr-1 text-black bg-white border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-200 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none cursor-pointer"
            title="Toggle Menu"
          >
            <Menu size={16} strokeWidth={3} />
          </button>

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

          {/* Unsaved Changes Indicator */}
          {isSaving && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-black uppercase text-black bg-yellow-200 border-[2px] border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ml-2">
              <RefreshCw size={10} className="animate-spin text-black" />
              <span>SAVING...</span>
            </div>
          )}

          {!isSaving && saveStatus === 'saved' && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-black uppercase text-white bg-lime-500 border-[2px] border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>SAVED</span>
            </div>
          )}

          {!isSaving && saveStatus !== 'saved' && hasUnsavedChanges && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-black uppercase text-black bg-amber-100 border-[2px] border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ml-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400 border border-black inline-block" />
              <span>UNSAVED</span>
            </div>
          )}
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

          {/* User Avatar Dropdown */}
          <div className="relative" ref={avatarDropdown.ref}>
            <button
              onClick={() => avatarDropdown.setIsOpen(o => !o)}
              className={`h-8 flex items-center justify-center gap-1.5 px-2.5 border-[3px] border-black
                         text-black text-xs font-black cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                         transition-none select-none ${
                           avatarDropdown.isOpen 
                             ? 'bg-[#ffe45e]' 
                             : 'bg-pink-400 hover:bg-[#ffe45e]'
                         }`}
            >
              <span>{session?.email ? session.email.charAt(0).toUpperCase() : 'A'}</span>
              <ChevronDown size={11} className={`transition-transform duration-200 ${avatarDropdown.isOpen ? 'rotate-180' : ''}`} />
            </button>

            {avatarDropdown.isOpen && (
              <div
                style={{ zIndex: 99999 }}
                className="absolute right-0 top-full mt-2 w-56 bg-white border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col z-[60]"
              >
                {/* User info row (not clickable) */}
                <div className="px-3.5 py-2.5 text-left select-none">
                  <div className="text-xs font-bold text-black truncate">{session?.email}</div>
                  <div className="text-[9px] font-bold text-gray-500 tracking-wider mt-0.5">SMART DATASTUDIO</div>
                </div>

                {/* Divider */}
                <div className="border-t-2 border-black" />

                {/* MY PROJECTS */}
                <button
                  onClick={() => {
                    avatarDropdown.setIsOpen(false);
                    navigate('/projects');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left font-bold text-black hover:bg-cyan-300 transition-none cursor-pointer uppercase"
                >
                  <FolderOpen size={13} className="text-black shrink-0" />
                  <span className="flex-1">MY PROJECTS</span>
                </button>

                {/* LOG OUT */}
                <button
                  onClick={() => {
                    avatarDropdown.setIsOpen(false);
                    if (onLogout) {
                      onLogout();
                    } else {
                      logOut();
                      navigate('/login');
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left font-bold text-black hover:bg-cyan-300 transition-none cursor-pointer uppercase"
                >
                  <LogOut size={13} className="text-black shrink-0" />
                  <span className="flex-1">LOG OUT</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Menu Bar Wrapper (bottom row) ─────────────────────────── */}
      <div>
        <div className="flex items-center gap-1.5 h-8 px-2 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-none relative z-50">
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
      </div>
    </header>
  );
};

export default Header;
