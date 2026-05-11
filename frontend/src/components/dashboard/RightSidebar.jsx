import React, { useState } from 'react';
import { Type, Calculator, BarChart2, ArrowLeft, Loader } from 'lucide-react';
import { generateChart, getMetrics } from '../../api/client';

// ── Shared form primitives ────────────────────────────────────────
const labelCls  = "block text-xs font-black text-black mb-1 uppercase";
const selectCls = "w-full text-sm border-[3px] border-black p-1.5 bg-white text-black focus:outline-none cursor-pointer";
const inputCls  = "w-full text-sm border-[3px] border-black p-1.5 bg-white text-black placeholder-gray-400 focus:outline-none";

// ── Mini section title ────────────────────────────────────────────
const ST = ({ children }) => (
  <p className="text-sm font-black uppercase tracking-wider text-black mb-1.5">
    {children}
  </p>
);

// ── Stateless toggle button ───────────────────────────────────────
const ToggleBtn = ({ active, onClick, children, title }) => (
  <button
    title={title}
    onClick={onClick}
    className={`flex-1 py-1.5 text-xs font-black uppercase border-[3px] border-black transition-none cursor-pointer ${
      active
        ? 'bg-black text-[#ffe45e]'
        : 'bg-white text-black hover:bg-cyan-300'
    }`}
  >
    {children}
  </button>
);

// ── Reusable color picker row ─────────────────────────────────────
const ColorPicker = ({ label, value, onChange }) => {
  const isEmpty = !value || value === 'transparent';
  return (
    <div>
      <ST>{label}</ST>
      <div className="flex items-center gap-2 border-[3px] border-black p-1.5 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <input
          type="color"
          value={isEmpty ? '#ffffff' : value}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 cursor-pointer border-0 p-0"
          title={`Pick ${label.toLowerCase()}`}
        />
        <span className="text-xs font-bold text-black flex-1 uppercase">
          {isEmpty ? 'transparent' : value}
        </span>
        {!isEmpty && (
          <button
            onClick={() => onChange('transparent')}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer px-1"
            title="Reset to transparent"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

// ── Reusable typography block (shared by Heading & Metric panels) ──
const TypographyControls = ({ s, set, toggle }) => (
  <>
    {/* Family + Size */}
    <div className="grid grid-cols-2 gap-2">
      <div>
        <ST>Family</ST>
        <select value={s.fontFamily} onChange={e => set('fontFamily', e.target.value)} className={selectCls}>
          <option value="font-sans">Sans</option>
          <option value="font-serif">Serif</option>
          <option value="font-mono">Mono</option>
        </select>
      </div>
      <div>
        <ST>Size</ST>
        <select value={s.fontSize} onChange={e => set('fontSize', e.target.value)} className={selectCls}>
          <option value="text-sm">Small</option>
          <option value="text-base">Base</option>
          <option value="text-lg">Large</option>
          <option value="text-xl">XL</option>
          <option value="text-2xl">2XL</option>
          <option value="text-3xl">3XL</option>
          <option value="text-4xl">4XL</option>
          <option value="text-6xl">6XL</option>
        </select>
      </div>
    </div>

    {/* Weight */}
    <div>
      <ST>Weight</ST>
      <select value={s.fontWeight} onChange={e => set('fontWeight', e.target.value)} className={selectCls}>
        <option value="font-light">Light</option>
        <option value="font-normal">Normal</option>
        <option value="font-medium">Medium</option>
        <option value="font-semibold">Semibold</option>
        <option value="font-bold">Bold</option>
        <option value="font-extrabold">Extrabold</option>
        <option value="font-black">Black</option>
      </select>
    </div>

    {/* Text Color */}
    <ColorPicker
      label="Text Color"
      value={s.color}
      onChange={val => set('color', val)}
    />

    {/* Alignment */}
    <div>
      <ST>Alignment</ST>
      <div className="flex gap-1">
        <ToggleBtn active={s.textAlign === 'text-left'}   onClick={() => set('textAlign', 'text-left')}   title="Left">Left</ToggleBtn>
        <ToggleBtn active={s.textAlign === 'text-center'} onClick={() => set('textAlign', 'text-center')} title="Center">Center</ToggleBtn>
        <ToggleBtn active={s.textAlign === 'text-right'}  onClick={() => set('textAlign', 'text-right')}  title="Right">Right</ToggleBtn>
      </div>
    </div>

    {/* Style toggles */}
    <div>
      <ST>Style</ST>
      <div className="flex gap-1">
        <ToggleBtn
          active={s.fontStyle === 'italic'}
          onClick={() => toggle('fontStyle', 'italic', 'not-italic')}
          title="Italic"
        >
          <span className="italic font-serif">I</span>
        </ToggleBtn>
        <ToggleBtn
          active={s.textDecoration === 'underline'}
          onClick={() => toggle('textDecoration', 'underline', 'no-underline')}
          title="Underline"
        >
          <span className="underline">U</span>
        </ToggleBtn>
      </div>
    </div>
  </>
);

// ─── Toolbox Mode ─────────────────────────────────────────────────
const ToolboxMode = () => {
  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('widgetType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const tools = [
    { type: 'heading', label: 'Heading / Text',  icon: Type,       desc: 'Add a title or label to your dashboard.' },
    { type: 'metric',  label: 'Metric Card',      icon: Calculator, desc: 'Display a single calculated statistic.'  },
    { type: 'chart',   label: 'Chart Block',      icon: BarChart2,  desc: 'Generate a Seaborn visualization.'       },
  ];

  return (
    <div className="p-4 space-y-4 overflow-y-auto flex-1">
      {tools.map(({ type, label, icon: Icon, desc }) => (
        <div
          key={type}
          draggable
          onDragStart={(e) => handleDragStart(e, type)}
          className="border-[3px] border-black p-4 mb-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-none cursor-grab active:cursor-grabbing group"
        >
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 border-[3px] border-black bg-[#ffe45e] text-black">
              <Icon size={18} />
            </div>
            <h3 className="font-black text-black text-sm uppercase">{label}</h3>
          </div>
          <p className="text-xs font-bold text-gray-700 leading-relaxed pl-12">{desc}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Chart Properties ──────────────────────────────────────────────
const ChartProperties = ({ anomalyReport, onUpdateChart }) => {
  const [chartType, setChartType] = useState('barplot');
  const [xCol,      setXCol]      = useState('');
  const [yCol,      setYCol]      = useState('');
  const [hue,       setHue]       = useState('');
  const [palette,   setPalette]   = useState('deep');
  const [title,     setTitle]     = useState('My Chart');
  const [xlabel,    setXLabel]    = useState('');
  const [ylabel,    setYLabel]    = useState('');
  const [legendLoc, setLegendLoc] = useState('best');
  
  // Chart-specific settings
  const [alpha,       setAlpha]       = useState(0.8);
  const [markerSize,  setMarkerSize]  = useState(50);
  const [estimator,   setEstimator]   = useState('mean');
  const [dodge,       setDodge]       = useState(true);
  const [linewidth,   setLinewidth]   = useState(2);
  const [showMarkers, setShowMarkers] = useState(false);
  const [bins,        setBins]        = useState(20);
  const [kde,         setKde]         = useState(true);
  const [orientation, setOrientation] = useState('vertical');

  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);

  const columns = anomalyReport ? Object.keys(anomalyReport.columns) : [];
  const numericCols = anomalyReport
    ? Object.entries(anomalyReport.columns)
        .filter(([_, i]) => i.inferred_type.includes('int') || i.inferred_type.includes('float'))
        .map(([c]) => c)
    : [];

  const handleUpdate = async () => {
    setIsLoading(true); setError(null);
    try {
      const payload = { 
        chart_type: chartType, x_col: xCol, y_col: yCol, hue: hue || null, 
        palette, title, xlabel, ylabel, legend_loc: legendLoc,
        alpha, marker_size: markerSize, estimator, dodge,
        linewidth, show_markers: showMarkers, bins, kde, orientation
      };
      const res = await generateChart(payload);
      onUpdateChart(res.image);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate chart.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto flex-1">
      <h4 className="text-xl font-black uppercase tracking-tight text-black border-b-[3px] border-black pb-2 mb-4">Chart Config</h4>

      {error && <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-700">{error}</div>}

      {/* ── Global Settings ── */}
      <div className="space-y-3">
        <ST>Global Settings</ST>
        
        <div><label className={labelCls}>Chart Type</label>
          <select value={chartType} onChange={e => setChartType(e.target.value)} className={selectCls}>
            <option value="barplot">Bar Plot</option>
            <option value="scatterplot">Scatter Plot</option>
            <option value="lineplot">Line Plot</option>
            <option value="histplot">Histogram</option>
            <option value="boxplot">Box Plot</option>
            <option value="countplot">Count Plot</option>
            <option value="correlation_heatmap">Correlation Heatmap</option>
          </select>
        </div>

        {chartType !== 'correlation_heatmap' && (<>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>X-Axis</label>
              <select value={xCol} onChange={e => setXCol(e.target.value)} className={selectCls}>
                <option value="">Select...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Y-Axis (Num)</label>
              <select value={yCol} disabled={['histplot', 'countplot'].includes(chartType)} onChange={e => setYCol(e.target.value)} className={selectCls}>
                <option value="">Select...</option>
                {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div><label className={labelCls}>Hue (Optional)</label>
            <select value={hue} onChange={e => setHue(e.target.value)} className={selectCls}>
              <option value="">None</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </>)}

        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Palette</label>
            <select value={palette} onChange={e => setPalette(e.target.value)} className={selectCls}>
              <option value="deep">Deep</option><option value="muted">Muted</option>
              <option value="pastel">Pastel</option><option value="viridis">Viridis</option>
              <option value="crest">Crest</option><option value="flare">Flare</option>
              <option value="coolwarm">Coolwarm</option>
            </select>
          </div>
          <div><label className={labelCls}>Legend Pos</label>
            <select value={legendLoc} onChange={e => setLegendLoc(e.target.value)} className={selectCls}>
              <option value="best">Best</option>
              <option value="upper right">Top Right</option>
              <option value="upper left">Top Left</option>
              <option value="lower left">Bottom</option>
            </select>
          </div>
        </div>

        <div><label className={labelCls}>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>X Label</label>
            <input type="text" value={xlabel} onChange={e => setXLabel(e.target.value)} className={inputCls} placeholder="Auto" />
          </div>
          <div><label className={labelCls}>Y Label</label>
            <input type="text" value={ylabel} onChange={e => setYLabel(e.target.value)} className={inputCls} placeholder="Auto" />
          </div>
        </div>
      </div>

      {/* ── Chart-Specific Settings ── */}
      {chartType !== 'correlation_heatmap' && (
        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <ST>Chart-Specific Settings</ST>

          {chartType === 'scatterplot' && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={labelCls}>Alpha (Opacity)</label>
                  <span className="text-[10px] text-gray-400">{alpha}</span>
                </div>
                <input type="range" min="0" max="1" step="0.1" value={alpha} onChange={e => setAlpha(e.target.value)} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
              <div><label className={labelCls}>Marker Size</label>
                <input type="number" value={markerSize} onChange={e => setMarkerSize(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          {(chartType === 'barplot' || chartType === 'countplot') && (
            <div className="space-y-3">
              <div><label className={labelCls}>Estimator</label>
                <select value={estimator} onChange={e => setEstimator(e.target.value)} className={selectCls}>
                  <option value="mean">Mean</option>
                  <option value="sum">Sum</option>
                  <option value="median">Median</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="dodge" checked={dodge} onChange={e => setDodge(e.target.checked)} className="w-4 h-4 border-2 border-black accent-black cursor-pointer" />
                <label htmlFor="dodge" className="text-xs font-black text-black uppercase cursor-pointer">Dodge Bars</label>
              </div>
            </div>
          )}

          {chartType === 'lineplot' && (
            <div className="space-y-3">
              <div><label className={labelCls}>Line Width</label>
                <input type="number" value={linewidth} onChange={e => setLinewidth(e.target.value)} className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="markers" checked={showMarkers} onChange={e => setShowMarkers(e.target.checked)} className="w-4 h-4 border-2 border-black accent-black cursor-pointer" />
                <label htmlFor="markers" className="text-xs font-black text-black uppercase cursor-pointer">Show Markers</label>
              </div>
            </div>
          )}

          {chartType === 'histplot' && (
            <div className="space-y-3">
              <div><label className={labelCls}>Bins</label>
                <input type="number" value={bins} onChange={e => setBins(e.target.value)} className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="kde" checked={kde} onChange={e => setKde(e.target.checked)} className="w-4 h-4 border-2 border-black accent-black cursor-pointer" />
                <label htmlFor="kde" className="text-xs font-black text-black uppercase cursor-pointer">Show KDE Curve</label>
              </div>
            </div>
          )}

          {chartType === 'boxplot' && (
            <div><label className={labelCls}>Orientation</label>
              <select value={orientation} onChange={e => setOrientation(e.target.value)} className={selectCls}>
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </div>
          )}
        </div>
      )}

      <button onClick={handleUpdate} disabled={isLoading}
        className="w-full mt-4 neo-btn neo-btn-primary py-3 text-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
        {isLoading ? <><Loader size={20} className="animate-spin" /> GENERATING...</> : 'UPDATE CHART'}
      </button>
    </div>
  );
};

// ─── Metric Properties ─────────────────────────────────────────────
const DEF_METRIC = {
  column: '', metricType: 'mean',
  fontSize: 'text-4xl', fontWeight: 'font-bold',
  textAlign: 'text-center', textDecoration: 'no-underline',
  fontStyle: 'not-italic', color: '', fontFamily: 'font-sans',
  backgroundColor: 'transparent',
};

const MetricProperties = ({ anomalyReport, onUpdateMetric, onUpdateMetricSettings, currentSettings }) => {
  // API selection state
  const [column,    setColumn]    = useState(currentSettings?.column     || '');
  const [metricType, setMetricType] = useState(currentSettings?.metricType || 'mean');
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);

  // Typography settings state — seeded from persisted settings
  const [s, setS] = useState({ ...DEF_METRIC, ...currentSettings });

  const set    = (key, val) => setS(prev => ({ ...prev, [key]: val }));
  const toggle = (key, on, off) => setS(prev => ({ ...prev, [key]: prev[key] === on ? off : on }));

  const numericCols = anomalyReport
    ? Object.entries(anomalyReport.columns)
        .filter(([_, i]) => i.inferred_type.includes('int') || i.inferred_type.includes('float'))
        .map(([c]) => c)
    : [];

  const metricOptions = [
    { value: 'sum',      label: 'Sum'       }, { value: 'mean',     label: 'Mean'      },
    { value: 'median',   label: 'Median'    }, { value: 'min',      label: 'Min'       },
    { value: 'max',      label: 'Max'       }, { value: 'std',      label: 'Std Dev'   },
    { value: 'var',      label: 'Variance'  }, { value: 'count',    label: 'Count'     },
    { value: 'skew',     label: 'Skewness'  }, { value: 'kurtosis', label: 'Kurtosis'  },
  ];

  const handleCalculate = async () => {
    if (!column) return;
    setIsLoading(true); setError(null);
    try {
      const res = await getMetrics(column, metricType);
      onUpdateMetric(res);
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto flex-1">
      <h4 className="text-xl font-black uppercase tracking-tight text-black border-b-[3px] border-black pb-2 mb-4">Metric Settings</h4>

      {/* ── Data section ───────────────────────────────────────── */}
      <div className="space-y-3 pb-3 border-b border-gray-100 dark:border-gray-700">
        <ST>Data</ST>
        {error && <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-700">{error}</div>}

        <div><label className={labelCls}>Column (Numeric)</label>
          <select value={column} onChange={e => { setColumn(e.target.value); set('column', e.target.value); }} className={selectCls}>
            <option value="">Select Column...</option>
            {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div><label className={labelCls}>Metric</label>
          <select value={metricType} onChange={e => { setMetricType(e.target.value); set('metricType', e.target.value); }} className={selectCls}>
            {metricOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <button onClick={handleCalculate} disabled={!column || isLoading}
          className="w-full neo-btn neo-btn-primary py-3 flex items-center justify-center gap-2 cursor-pointer">
          {isLoading ? <><Loader size={20} className="animate-spin" /> CALCULATING...</> : 'CALCULATE'}
        </button>
      </div>

      {/* ── Typography section ──────────────────────────────────── */}
      <div className="space-y-3">
        <ST>Typography</ST>
        <TypographyControls s={s} set={set} toggle={toggle} />
      </div>

      {/* ── Background Color ────────────────────────────────────── */}
      <ColorPicker
        label="Background Color"
        value={s.backgroundColor}
        onChange={val => set('backgroundColor', val)}
      />

      {/* Apply styles */}
      <button
        onClick={() => onUpdateMetricSettings({ ...s, column, metricType })}
        className="w-full mt-4 neo-btn py-3 text-lg cursor-pointer bg-[#ffe45e]"
      >
        APPLY STYLES
      </button>
    </div>
  );
};

// ─── Heading Properties ────────────────────────────────────────────
const DEF_HEADING = {
  text: 'New Heading', fontSize: 'text-3xl', fontWeight: 'font-bold',
  textAlign: 'text-left', textDecoration: 'no-underline',
  fontStyle: 'not-italic', color: '#111827', fontFamily: 'font-sans',
  backgroundColor: 'transparent',
};

const HeadingProperties = ({ currentSettings, onUpdateHeading }) => {
  const [s, setS] = useState({ ...DEF_HEADING, ...currentSettings });

  const set    = (key, val)     => setS(prev => ({ ...prev, [key]: val }));
  const toggle = (key, on, off) => setS(prev => ({ ...prev, [key]: prev[key] === on ? off : on }));

  return (
    <div className="p-4 space-y-4 overflow-y-auto flex-1">
      <h4 className="text-xl font-black uppercase tracking-tight text-black border-b-[3px] border-black pb-2 mb-4">Heading Settings</h4>

      {/* Content */}
      <div>
        <ST>Content</ST>
        <input
          type="text"
          value={s.text}
          onChange={e => set('text', e.target.value)}
          className={inputCls}
          placeholder="Enter heading text..."
        />
      </div>

      {/* Typography */}
      <TypographyControls s={s} set={set} toggle={toggle} />

      {/* Background Color */}
      <ColorPicker
        label="Background Color"
        value={s.backgroundColor}
        onChange={val => set('backgroundColor', val)}
      />

      {/* Apply */}
      <button
        onClick={() => onUpdateHeading(s)}
        className="w-full mt-4 neo-btn neo-btn-primary py-3 text-lg cursor-pointer"
      >
        APPLY STYLES
      </button>
    </div>
  );
};

// ─── Main RightSidebar ─────────────────────────────────────────────
const RightSidebar = ({
  selectedWidgetId, setSelectedWidgetId,
  cards, widgetData, anomalyReport,
  onUpdateChart, onUpdateMetric, onUpdateMetricSettings, onUpdateHeading,
}) => {
  const selectedCard     = cards.find(c => c.id === selectedWidgetId);
  const isPropertiesMode = !!selectedCard;

  return (
    <aside className="w-80 h-full bg-[#00f0ff] border-l-[3px] border-black flex flex-col shadow-none z-10 transition-none">
      {/* Header */}
      <div className="py-4 px-6 border-b-[3px] border-black bg-white flex items-center justify-between shrink-0">
        {isPropertiesMode ? (
          <>
            <div>
              <h2 className="text-xl font-black text-black uppercase tracking-tight">Properties</h2>
              <p className="text-xs font-bold text-gray-700 uppercase">{selectedCard.type} Widget</p>
            </div>
            <button onClick={() => setSelectedWidgetId(null)}
              className="flex items-center gap-1 text-xs font-black text-black border-[3px] border-black px-2 py-1 bg-[#ffe45e] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none cursor-pointer uppercase transition-none">
              <ArrowLeft size={16} strokeWidth={3} /> TOOLBOX
            </button>
          </>
        ) : (
          <div>
            <h2 className="text-xl font-black text-black uppercase tracking-tight">Toolbox</h2>
            <p className="text-xs font-bold text-gray-700 uppercase">Drag items onto canvas</p>
          </div>
        )}
      </div>

      {/* Content */}
      {isPropertiesMode ? (
        <>
          {selectedCard.type === 'chart' && (
            <ChartProperties
              anomalyReport={anomalyReport}
              onUpdateChart={(img) => onUpdateChart(selectedWidgetId, img)}
            />
          )}
          {selectedCard.type === 'metric' && (
            <MetricProperties
              anomalyReport={anomalyReport}
              currentSettings={widgetData[selectedWidgetId]?.settings ?? null}
              onUpdateMetric={(d)        => onUpdateMetric(selectedWidgetId, d)}
              onUpdateMetricSettings={(s) => onUpdateMetricSettings(selectedWidgetId, s)}
            />
          )}
          {selectedCard.type === 'heading' && (
            <HeadingProperties
              currentSettings={widgetData[selectedWidgetId]?.settings ?? null}
              onUpdateHeading={(settings) => onUpdateHeading(selectedWidgetId, settings)}
            />
          )}
        </>
      ) : (
        <ToolboxMode />
      )}
    </aside>
  );
};

export default RightSidebar;
