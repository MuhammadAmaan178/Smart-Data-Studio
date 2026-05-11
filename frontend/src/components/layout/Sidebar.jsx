import React from 'react';
import {
  Database, FileText, LayoutDashboard, BrainCircuit, Network,
  ChevronRight, ChevronLeft
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'data-prep',    label: 'Data Prep & Cleaning',  icon: Database        },
  { id: 'data-summary', label: 'Data Summary',           icon: FileText        },
  { id: 'dashboard',    label: 'Interactive Dashboard',  icon: LayoutDashboard },
  { id: 'ml-studio',    label: 'ML Studio',              icon: BrainCircuit    },
  { id: 'dl-studio',    label: 'Deep Learning Studio',   icon: Network         },
];

const Sidebar = ({ currentView, setCurrentView, isOpen, toggleSidebar }) => {
  return (
    <aside
      className={`h-full flex flex-col shrink-0
                  bg-[#ffe45e] border-r-[3px] border-black
                  transition-none
                  ${isOpen ? 'w-64' : 'w-16'}`}
    >
      {/* Toggle button */}
      <div className={`flex items-center h-12 px-3 border-b-[3px] border-black
                       ${isOpen ? 'justify-end' : 'justify-center'}`}>
        <button
          onClick={toggleSidebar}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="p-1 cursor-pointer text-black bg-white border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                     hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-none"
        >
          {isOpen ? <ChevronLeft size={20} strokeWidth={3} /> : <ChevronRight size={20} strokeWidth={3} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = currentView === id;
          return (
            <button
              key={id}
              onClick={() => setCurrentView(id)}
              title={!isOpen ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-3 font-black uppercase tracking-wider
                          border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                          transition-none cursor-pointer text-left
                          ${isActive
                            ? 'bg-black text-[#ffe45e] shadow-none translate-x-[3px] translate-y-[3px]'
                            : `bg-white text-black hover:bg-cyan-300`
                          }`}
            >
              <Icon size={20} strokeWidth={2.5} className="shrink-0" />

              {/* Animated label */}
              <span
                className={`text-xs font-medium whitespace-nowrap overflow-hidden
                            transition-all duration-300 ease-in-out
                            ${isOpen ? 'opacity-100 w-auto max-w-[160px]' : 'opacity-0 w-0 max-w-0'}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Version stamp (expanded only) */}
      <div className={`px-3 py-3 border-t-[3px] border-black bg-white
                       overflow-hidden transition-none
                       ${isOpen ? 'block' : 'hidden'}`}>
        <p className="text-[11px] font-black text-black uppercase">
          Smart DataStudio v1.0
        </p>
        <p className="text-[9px] font-bold text-gray-500 uppercase">
          Flask · React · Neo-Brutal
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
