import React from 'react';
import { Database, FileText, LayoutDashboard, BrainCircuit, Network, Wand2 } from 'lucide-react';

const PipelineHeader = ({ currentView }) => {
  const steps = [
    { id: 'data-prep', label: 'PREP' },
    { id: 'data-summary', label: 'SUMMARY' },
    { id: 'feature-engineering', label: 'FEATURES' },
    { id: 'dashboard', label: 'DASHBOARD' },
    { id: 'ml-studio', label: 'ML STUDIO' },
    { id: 'dl-studio', label: 'DL STUDIO' }
  ];

  const pageInfo = {
    'data-prep': { title: 'DATA PREP & CLEANING', icon: <Database size={24} strokeWidth={3} /> },
    'data-summary': { title: 'DATA SUMMARY', icon: <FileText size={24} strokeWidth={3} /> },
    'feature-engineering': { title: 'FEATURE ENGINEERING', icon: <Wand2 size={24} strokeWidth={3} /> },
    'dashboard': { title: 'INTERACTIVE DASHBOARD', icon: <LayoutDashboard size={24} strokeWidth={3} /> },
    'ml-studio': { title: 'ML STUDIO', icon: <BrainCircuit size={24} strokeWidth={3} /> },
    'dl-studio': { title: 'DL STUDIO', icon: <Network size={24} strokeWidth={3} /> }
  };

  const activeIndex = steps.findIndex(s => s.id === currentView) !== -1 
    ? steps.findIndex(s => s.id === currentView) 
    : 0;
  
  const currentInfo = pageInfo[currentView] || pageInfo['data-prep'];

  return (
    <div 
      className="flex flex-col shrink-0 w-full bg-[#fef9ef] border-b-[2px] border-black z-30"
      style={{ padding: '8px 16px', minHeight: '48px', height: 'auto', justifyContent: 'center' }}
    >
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center gap-2 text-base md:text-xl font-black uppercase text-black">
          {currentInfo.icon}
          {currentInfo.title}
        </div>
        <div className="hidden md:flex items-center gap-2">
          {steps.map((step, i) => {
            const isActive = i === activeIndex;
            return (
              <React.Fragment key={step.id}>
                <div className={`px-3 py-1 text-xs font-black uppercase border-[2px] border-black transition-none ${
                  isActive 
                    ? 'bg-[#ffe45e] text-black shadow-[2px_2px_0px_#000]' 
                    : 'bg-transparent text-black'
                }`}>
                  {isActive ? '● ' : ''}{step.label}
                </div>
                {i < steps.length - 1 && <div className="w-4 border-t-[2px] border-dashed border-black" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PipelineHeader;
