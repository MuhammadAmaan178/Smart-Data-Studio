import React, { useState } from 'react';
import { X, ClipboardList } from 'lucide-react';

const QueueDrawer = ({ queue, onRemove, onClearAll, onApplyAll, isApplying }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getIconColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'missing': return 'bg-[#00f0ff]'; // cyan
      case 'duplicates': return 'bg-[#ff499e]'; // pink
      case 'string': return 'bg-[#ffe45e]'; // yellow
      case 'outlier': return 'bg-[#ff8c00]'; // orange
      default: return 'bg-gray-400';
    }
  };

  return (
    <>
      {/* TRIGGER TAB */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-0 top-1/2 -translate-y-1/2 w-8 h-20 bg-[#ffe45e] border-[2px] border-black border-l-[3px] rounded-l-[4px] cursor-pointer flex flex-col items-center justify-center z-[200] hover:bg-[#ffeb85] transition-colors"
      >
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-[2px] border-black mb-1 transition-transform ${
          queue.length > 0 ? 'bg-[#ff499e] text-white scale-110' : 'bg-black text-white scale-100'
        }`}>
          {queue.length}
        </div>
        <div 
          className="text-[10px] font-black uppercase tracking-widest text-black" 
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          QUEUE
        </div>
      </div>

      {/* BACKDROP */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-[198]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* DRAWER PANEL */}
      <div 
        className={`fixed right-0 top-0 h-screen w-80 bg-[#fef9ef] border-l-[3px] border-black shadow-[-6px_0px_0px_#000] z-[199] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* DRAWER HEADER */}
        <div className="bg-black text-white p-4 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-lg uppercase tracking-wider">Actions Queue</h2>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-300">
              <X size={20} strokeWidth={3} />
            </button>
          </div>
          <p className="text-[10px] font-bold text-gray-300 uppercase mt-1">Changes will be applied sequentially</p>
        </div>

        {/* DRAWER BODY */}
        <div className="flex-1 overflow-y-auto p-4">
          {queue.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <ClipboardList size={48} className="mb-2 text-black" strokeWidth={1.5} />
              <p className="font-black text-black uppercase">No Actions Queued</p>
              <p className="text-xs font-bold text-gray-600 mt-1">Add actions from the sections below</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {queue.map((action) => (
                <div key={action.id} className="bg-white border-[2px] border-black shadow-[4px_4px_0px_#000] p-2 flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full border-[2px] border-black ${getIconColor(action.type)} shrink-0`} />
                    <div className="flex flex-col">
                      <span className="font-black text-xs uppercase text-black leading-tight">{action.type}</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">{action.column || 'GLOBAL'}{action.strategy ? ` · ${action.strategy}` : ''}</span>
                    </div>
                  </div>
                  <button onClick={() => onRemove(action.id)} className="text-red-500 hover:text-red-700 shrink-0 ml-2 cursor-pointer">
                    <X size={16} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DRAWER FOOTER */}
        <div className="p-4 bg-white border-t-[2px] border-black shrink-0">
          <button 
            onClick={onClearAll}
            disabled={queue.length === 0 || isApplying}
            className="w-full mb-2 py-2 bg-white text-black border-[2px] border-black shadow-[2px_2px_0px_#000] text-xs font-black uppercase hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 cursor-pointer"
          >
            Clear All
          </button>
          <button 
            onClick={async () => {
              const success = await onApplyAll();
              if (success) setIsOpen(false);
            }}
            disabled={queue.length === 0 || isApplying}
            className="w-full py-3 bg-[#ffe45e] text-black border-[2px] border-black shadow-[4px_4px_0px_#000] text-sm font-black uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 cursor-pointer"
          >
            {isApplying ? 'Applying...' : 'Apply All Changes'}
          </button>
        </div>
      </div>
    </>
  );
};

export default QueueDrawer;
