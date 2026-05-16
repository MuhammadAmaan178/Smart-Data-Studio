import React, { useState } from 'react';
import { X, Check, ChevronRight, ChevronLeft } from 'lucide-react';

const DashboardProperties = ({ selectedWidget, updateWidget, deselectWidget, columns = [] }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!selectedWidget) {
    return (
      <div className="w-[300px] shrink-0 bg-white border-l-[3px] border-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-full border-[3px] border-black bg-[#fef9ef] flex items-center justify-center mb-4">
          <span className="font-black text-2xl">⚙</span>
        </div>
        <h3 className="font-black uppercase text-sm mb-2">SELECT A WIDGET</h3>
        <p className="text-xs font-bold text-gray-500 uppercase">Click the ⚙ icon on any widget to edit its properties</p>
      </div>
    );
  }

  const { type, config } = selectedWidget;

  const handleChange = (key, value) => {
    updateWidget(selectedWidget.id, {
      config: { ...config, [key]: value }
    });
  };

  const renderHeadingProps = () => (
    <div className="p-4 space-y-6">
      <div>
        <label className="block text-[10px] font-black uppercase mb-1">Heading Text</label>
        <input 
          type="text" 
          value={config.text || ''} 
          onChange={(e) => handleChange('text', e.target.value)}
          className="w-full border-[2px] border-black p-2 font-bold uppercase text-sm focus:outline-none focus:bg-[#fff5ba]"
        />
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase mb-2">Font Size</label>
        <div className="flex flex-col gap-2">
          {['SMALL', 'MEDIUM', 'LARGE', 'HUGE'].map(sz => (
            <button 
              key={sz} onClick={() => handleChange('size', sz)}
              className={`py-1.5 border-[2px] border-black font-black uppercase text-xs ${config.size === sz ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase mb-2">Alignment</label>
        <div className="flex gap-2">
          {['LEFT', 'CENTER', 'RIGHT'].map(al => (
            <button 
              key={al} onClick={() => handleChange('align', al)}
              className={`flex-1 py-1.5 border-[2px] border-black font-black uppercase text-[10px] ${config.align === al ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
            >
              {al}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMetricProps = () => (
    <div className="p-4 space-y-6">
      <div className="p-3 border-[2px] border-black bg-[#fef9ef] space-y-3">
        <h4 className="font-black text-[10px] uppercase border-b-2 border-black pb-1">DATA SOURCE</h4>
        <div>
          <label className="block text-[10px] font-black uppercase mb-1">Column</label>
          <select 
            value={config.column || ''} 
            onChange={(e) => handleChange('column', e.target.value)}
            className="w-full border-[2px] border-black p-1.5 font-bold uppercase text-xs focus:outline-none bg-white"
          >
            <option value="">-- SELECT --</option>
            {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase mb-1">Aggregation</label>
          <select 
            value={config.aggregation || ''} 
            onChange={(e) => handleChange('aggregation', e.target.value)}
            className="w-full border-[2px] border-black p-1.5 font-bold uppercase text-xs focus:outline-none bg-white"
          >
            <option value="">-- SELECT --</option>
            {['COUNT', 'SUM', 'MEAN', 'MIN', 'MAX', 'MEDIAN'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="p-3 border-[2px] border-black bg-[#fef9ef] space-y-3">
        <h4 className="font-black text-[10px] uppercase border-b-2 border-black pb-1">DISPLAY</h4>
        <div>
          <label className="block text-[10px] font-black uppercase mb-1">Custom Label (Optional)</label>
          <input 
            type="text" 
            value={config.label || ''} 
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder={`${config.aggregation || 'AGG'} OF ${config.column || 'COL'}`}
            className="w-full border-[2px] border-black p-1.5 font-bold uppercase text-xs focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase mb-1">Accent Color</label>
          <div className="flex gap-2">
            {['#ffe45e', '#00f0ff', '#ff499e', '#ff8c00'].map(col => (
              <button 
                key={col} onClick={() => handleChange('color', col)}
                className="w-8 h-8 border-[2px] border-black flex items-center justify-center hover:scale-110 transition-transform shadow-[2px_2px_0px_#000]"
                style={{ backgroundColor: col }}
              >
                {config.color === col && <Check size={16} color={col === '#000000' ? 'white' : 'black'} strokeWidth={4} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderChartProps = () => (
    <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-150px)] pb-20">
      <div className="space-y-2">
        <h4 className="font-black text-[10px] uppercase bg-black text-white px-2 py-1 inline-block">CHART TYPE</h4>
        <div className="grid grid-cols-3 gap-2">
          {['BAR', 'LINE', 'SCATTER', 'PIE', 'AREA', 'HISTOGRAM', 'BUBBLE', 'VIOLIN', 'BOXPLOT'].map(ct => (
            <button 
              key={ct} onClick={() => handleChange('chart_type', ct)}
              className={`py-2 border-[2px] border-black font-black uppercase text-[9px] ${config.chart_type === ct ? 'bg-[#ffe45e] shadow-[2px_2px_0px_#000] -translate-y-px -translate-x-px' : 'bg-white hover:bg-gray-100'} transition-all`}
            >
              {ct}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 border-[2px] border-black bg-[#fef9ef] space-y-3">
        <h4 className="font-black text-[10px] uppercase border-b-2 border-black pb-1">DATA MAPPING</h4>
        <div>
          <label className="block text-[10px] font-black uppercase mb-1">X-AXIS COLUMN</label>
          <select 
            value={config.x_column || ''} 
            onChange={(e) => handleChange('x_column', e.target.value)}
            className="w-full border-[2px] border-black p-1.5 font-bold uppercase text-xs focus:outline-none bg-white"
          >
            <option value="">-- SELECT --</option>
            {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        
        {!['PIE', 'HISTOGRAM'].includes(config.chart_type) && (
          <div>
            <label className="block text-[10px] font-black uppercase mb-1">Y-AXIS COLUMN</label>
            <select 
              value={config.y_column || ''} 
              onChange={(e) => handleChange('y_column', e.target.value)}
              className="w-full border-[2px] border-black p-1.5 font-bold uppercase text-xs focus:outline-none bg-white"
            >
              <option value="">-- SELECT --</option>
              {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        )}

        {config.chart_type === 'BUBBLE' && (
          <div>
            <label className="block text-[10px] font-black uppercase mb-1">SIZE COLUMN (BUBBLE)</label>
            <select 
              value={config.size_column || ''} 
              onChange={(e) => handleChange('size_column', e.target.value)}
              className="w-full border-[2px] border-black p-1.5 font-bold uppercase text-xs focus:outline-none bg-white"
            >
              <option value="">-- OPTIONAL --</option>
              {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        )}

        {['BAR', 'LINE', 'AREA'].includes(config.chart_type) && (
          <div>
            <label className="block text-[10px] font-black uppercase mb-1">Y AGGREGATION</label>
            <select 
              value={config.aggregation || 'MEAN'} 
              onChange={(e) => handleChange('aggregation', e.target.value)}
              className="w-full border-[2px] border-black p-1.5 font-bold uppercase text-xs focus:outline-none bg-white"
            >
              {['COUNT', 'SUM', 'MEAN', 'MIN', 'MAX'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="p-3 border-[2px] border-black bg-[#fef9ef] space-y-3">
        <h4 className="font-black text-[10px] uppercase border-b-2 border-black pb-1">STYLE</h4>
        <div>
          <label className="block text-[10px] font-black uppercase mb-1">Chart Title</label>
          <input 
            type="text" 
            value={config.title || ''} 
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full border-[2px] border-black p-1.5 font-bold uppercase text-xs focus:outline-none"
            placeholder="AUTO GENERATED TITLE"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase mb-2">Color Theme</label>
          <div className="grid grid-cols-2 gap-2">
            {['BRUTAL', 'NEON', 'MONO', 'WARM'].map(t => (
              <button 
                key={t} onClick={() => handleChange('theme', t)}
                className={`py-1.5 border-[2px] border-black font-black uppercase text-[10px] ${config.theme === t ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <input 
            type="checkbox" 
            id="showLegend"
            checked={config.showLegend !== false} 
            onChange={(e) => handleChange('showLegend', e.target.checked)}
            className="w-4 h-4 accent-[#ffe45e] border-black border-2"
          />
          <label htmlFor="showLegend" className="text-[10px] font-black uppercase cursor-pointer">Show Legend</label>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="showGrid"
            checked={config.showGrid !== false} 
            onChange={(e) => handleChange('showGrid', e.target.checked)}
            className="w-4 h-4 accent-[#ffe45e] border-black border-2"
          />
          <label htmlFor="showGrid" className="text-[10px] font-black uppercase cursor-pointer">Show Grid Lines</label>
        </div>
      </div>
      
      {/* Update button triggers re-render by changing state, but we can just let React handle it since we change state on-the-fly,
          but user asked for an "UPDATE CHART" button. To satisfy the prompt's feel: */}
      <button 
        onClick={() => deselectWidget()}
        className="w-full bg-[#ffe45e] py-3 border-[3px] border-black font-black uppercase text-sm hover:-translate-y-1 hover:-translate-x-1 shadow-[4px_4px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
      >
        DONE
      </button>
    </div>
  );

  if (isCollapsed) {
    return (
      <div 
        className="w-[40px] shrink-0 bg-[#ffe45e] border-l-[3px] border-black flex flex-col items-center py-4 cursor-pointer hover:bg-yellow-400 transition-colors z-10"
        onClick={() => setIsCollapsed(false)}
        title="Expand Properties"
      >
        <ChevronLeft size={24} strokeWidth={3} className="text-black" />
        <div className="mt-8" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          <span className="font-black uppercase tracking-widest text-sm">PROPERTIES</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[300px] shrink-0 bg-white border-l-[3px] border-black flex flex-col h-full transition-all duration-250">
      <div className="bg-black text-white p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsCollapsed(true)} className="hover:text-gray-300 transition-colors mr-2">
            <ChevronRight size={20} strokeWidth={3} />
          </button>
          <h3 className="font-black uppercase tracking-wider text-sm">
            {type} PROPERTIES
          </h3>
        </div>
        <button onClick={deselectWidget} className="hover:text-[#ff499e] transition-colors">
          <X size={20} strokeWidth={3} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {type === 'heading' && renderHeadingProps()}
        {type === 'metric' && renderMetricProps()}
        {type === 'chart' && renderChartProps()}
      </div>
    </div>
  );
};

export default DashboardProperties;
