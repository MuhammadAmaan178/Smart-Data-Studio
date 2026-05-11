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
                  bg-gray-50 dark:bg-gray-800
                  border-r border-gray-200 dark:border-gray-700
                  transition-all duration-300 ease-in-out
                  ${isOpen ? 'w-64' : 'w-16'}`}
    >
      {/* Toggle button */}
      <div className={`flex items-center h-10 px-3 border-b
                       border-gray-200 dark:border-gray-700
                       ${isOpen ? 'justify-end' : 'justify-center'}`}>
        <button
          onClick={toggleSidebar}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="p-1.5 rounded-md cursor-pointer
                     text-gray-400 dark:text-gray-500
                     hover:bg-gray-200 dark:hover:bg-gray-700
                     hover:text-gray-700 dark:hover:text-gray-200
                     transition-colors"
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
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
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg
                          transition-all duration-200 cursor-pointer text-left
                          ${isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : `text-gray-500 dark:text-gray-400
                               hover:bg-gray-200 dark:hover:bg-gray-700
                               hover:text-gray-900 dark:hover:text-gray-100`
                          }`}
            >
              <Icon size={18} className="shrink-0" />

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
      <div className={`px-3 py-3 border-t border-gray-200 dark:border-gray-700
                       overflow-hidden transition-all duration-300
                       ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-[10px] text-gray-400 dark:text-gray-600 whitespace-nowrap">
          Smart DataStudio v1.0
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-700 whitespace-nowrap">
          Flask · React · Tailwind v4
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
