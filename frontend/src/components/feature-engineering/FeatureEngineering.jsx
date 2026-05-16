import React, { useState, useEffect } from 'react';
import {
  Wand2, Database, AlertCircle, Plus, Pencil, Trash2, 
  BarChart2, Calendar, Hash, ArrowUpDown, Type, 
  ChevronDown, ChevronRight, CheckCircle2, Clock, RefreshCw
} from 'lucide-react';
import {
  getFeaturesInfo, createFeatureColumn, renameFeatureColumn,
  dropFeatureColumn, binFeatureColumn, extractDateFeature,
  encodeFeatureColumn, scaleFeatureColumn, stringOpsFeature,
  previewFeatures
} from '../../api/client';

const SectionHeader = ({ title, icon: Icon, isOpen, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-black text-white p-3 flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors"
  >
    <div className="flex items-center gap-3">
      <Icon size={18} strokeWidth={2.5} />
      <h3 className="font-black uppercase tracking-wider text-sm">{title}</h3>
    </div>
    <div className="text-[#ffe45e]">
      {isOpen ? <ChevronDown size={20} strokeWidth={3} /> : <ChevronRight size={20} strokeWidth={3} />}
    </div>
  </div>
);

const FeatureEngineering = ({ isDataLoaded }) => {
  const [columns, setColumns] = useState([]);
  const [preview, setPreview] = useState([]);
  const [history, setHistory] = useState([]);
  const [openSection, setOpenSection] = useState('A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Section states
  // A: Create
  const [createName, setCreateName] = useState('');
  const [createFormula, setCreateFormula] = useState('');
  // B: Rename
  const [renameOld, setRenameOld] = useState('');
  const [renameNew, setRenameNew] = useState('');
  // C: Drop
  const [dropCol, setDropCol] = useState('');
  const [dropConfirm, setDropConfirm] = useState(false);
  // D: Bin
  const [binCol, setBinCol] = useState('');
  const [binCount, setBinCount] = useState(3);
  const [binLabels, setBinLabels] = useState(['LOW', 'MEDIUM', 'HIGH']);
  // E: Extract Date
  const [dateCol, setDateCol] = useState('');
  const [dateParts, setDateParts] = useState({ year: false, month: false, day: false, weekday: false, quarter: false });
  // F: Encode
  const [encodeCol, setEncodeCol] = useState('');
  const [encodeMethod, setEncodeMethod] = useState('label'); // label or onehot
  // G: Scale
  const [scaleCols, setScaleCols] = useState([]);
  const [scaleMethod, setScaleMethod] = useState('standard'); // minmax, standard, robust
  // H: String Ops
  const [strCol, setStrCol] = useState('');
  const [strOp, setStrOp] = useState('upper'); // upper, lower, strip, remove_special, extract_numbers

  useEffect(() => {
    if (isDataLoaded) fetchInfo();
  }, [isDataLoaded]);

  const fetchInfo = async () => {
    try {
      const data = await getFeaturesInfo();
      setColumns(data.columns || []);
      setPreview(data.preview || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPreview = async () => {
    try {
      const data = await previewFeatures();
      setPreview(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const addLog = (color, name, col) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setHistory(prev => [{ color, name, col, time }, ...prev]);
  };

  const wrapApiCall = async (apiFunc, payload, successMsg, logDetails) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc(payload);
      await fetchInfo(); // refresh columns and preview
      addLog(logDetails.color, logDetails.name, logDetails.col);
      // Can show success toast here if needed
      return result;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createName || !createFormula) return setError("Name and formula are required");
    await wrapApiCall(
      createFeatureColumn, 
      { name: createName, formula: createFormula },
      "Column created",
      { color: 'bg-[#ffe45e]', name: 'CREATE COLUMN', col: createName }
    );
    setCreateName('');
    setCreateFormula('');
  };

  const handleRename = async () => {
    if (!renameOld || !renameNew) return setError("Select a column and provide a new name");
    await wrapApiCall(
      renameFeatureColumn,
      { old_name: renameOld, new_name: renameNew },
      "Column renamed",
      { color: 'bg-[#00f0ff]', name: 'RENAME COLUMN', col: `${renameOld} → ${renameNew}` }
    );
    setRenameOld('');
    setRenameNew('');
  };

  const handleDrop = async () => {
    if (!dropCol) return setError("Select a column to drop");
    if (!dropConfirm) {
      setDropConfirm(true);
      return;
    }
    await wrapApiCall(
      dropFeatureColumn,
      { column: dropCol },
      "Column dropped",
      { color: 'bg-[#ff499e]', name: 'DROP COLUMN', col: dropCol }
    );
    setDropCol('');
    setDropConfirm(false);
  };

  const handleBin = async () => {
    if (!binCol) return setError("Select a column to bin");
    await wrapApiCall(
      binFeatureColumn,
      { column: binCol, bins: parseInt(binCount), labels: binLabels },
      "Column binned",
      { color: 'bg-[#ffe45e]', name: 'BIN COLUMN', col: binCol }
    );
  };

  const handleDateExtract = async () => {
    if (!dateCol) return setError("Select a column");
    const activeParts = Object.keys(dateParts).filter(k => dateParts[k]);
    if (activeParts.length === 0) return setError("Select at least one part to extract");
    await wrapApiCall(
      extractDateFeature,
      { column: dateCol, parts: activeParts },
      "Date parts extracted",
      { color: 'bg-[#ffe45e]', name: 'EXTRACT DATE', col: dateCol }
    );
  };

  const handleEncode = async () => {
    if (!encodeCol) return setError("Select a column to encode");
    await wrapApiCall(
      encodeFeatureColumn,
      { column: encodeCol, method: encodeMethod },
      "Column encoded",
      { color: 'bg-[#00f0ff]', name: 'ENCODE COLUMN', col: encodeCol }
    );
  };

  const handleScale = async () => {
    if (scaleCols.length === 0) return setError("Select at least one column to scale");
    await wrapApiCall(
      scaleFeatureColumn,
      { columns: scaleCols, method: scaleMethod },
      "Columns scaled",
      { color: 'bg-[#ff8c00]', name: 'SCALE COLUMNS', col: scaleCols.join(', ') }
    );
    setScaleCols([]);
  };

  const handleStringOps = async () => {
    if (!strCol) return setError("Select a column");
    await wrapApiCall(
      stringOpsFeature,
      { column: strCol, operation: strOp },
      "String operation applied",
      { color: 'bg-[#00f0ff]', name: 'STRING OPS', col: strCol }
    );
  };

  if (!isDataLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <Database size={48} className="text-black opacity-30" strokeWidth={1.5} />
        <div>
          <h3 className="text-lg font-black text-black uppercase">No Data Available</h3>
          <p className="text-xs font-bold text-gray-500 uppercase mt-2">
            Please import a dataset from the FILE menu
          </p>
        </div>
      </div>
    );
  }

  const numericCols = columns.filter(c => c.dtype.includes('int') || c.dtype.includes('float'));
  const catCols = columns.filter(c => c.dtype.includes('object') || c.dtype.includes('bool'));

  return (
    <div className="max-w-screen-2xl mx-auto w-full flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300 pb-20">
      
      {/* LEFT COLUMN: Operations (40%) */}
      <div className="w-full lg:w-[40%] space-y-4">
        <h2 className="text-xl font-black uppercase text-black border-b-[3px] border-black pb-2">Operations</h2>
        
        {error && (
          <div className="bg-[#ff499e] text-white p-3 border-[2px] border-black font-bold uppercase text-sm shadow-[4px_4px_0px_#000] flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] flex flex-col divide-y-[2px] divide-black">
          
          {/* SECTION A: CREATE COLUMN */}
          <div>
            <SectionHeader title="Create Column" icon={Plus} isOpen={openSection === 'A'} onClick={() => setOpenSection('A')} />
            {openSection === 'A' && (
              <div className="p-4 bg-[#fef9ef] space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">New Column Name</label>
                  <input type="text" value={createName} onChange={e => setCreateName(e.target.value)} className="w-full bg-white border-[2px] border-black px-3 py-2 uppercase font-bold focus:outline-none focus:bg-[#fff5ba]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">Formula</label>
                  <input type="text" value={createFormula} onChange={e => setCreateFormula(e.target.value)} placeholder="col_a + col_b * 2" className="w-full bg-white border-[2px] border-black px-3 py-2 font-mono text-sm focus:outline-none focus:bg-[#fff5ba]" />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {numericCols.map(c => (
                      <span key={c.name} onClick={() => setCreateFormula(f => f + c.name)} className="text-[9px] font-black px-1.5 py-0.5 border border-black bg-white cursor-pointer hover:bg-[#ffe45e] uppercase truncate max-w-[100px]">{c.name}</span>
                    ))}
                  </div>
                </div>
                <button onClick={handleCreate} disabled={loading} className="w-full bg-[#ffe45e] border-[2px] border-black py-2 font-black uppercase text-sm hover:-translate-y-1 hover:-translate-x-1 shadow-[4px_4px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all">
                  {loading ? 'Processing...' : 'Create Column'}
                </button>
              </div>
            )}
          </div>

          {/* SECTION B: RENAME COLUMN */}
          <div>
            <SectionHeader title="Rename Column" icon={Pencil} isOpen={openSection === 'B'} onClick={() => setOpenSection('B')} />
            {openSection === 'B' && (
              <div className="p-4 bg-[#fef9ef] space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">Select Column</label>
                  <select value={renameOld} onChange={e => setRenameOld(e.target.value)} className="w-full bg-white border-[2px] border-black px-3 py-2 uppercase font-bold focus:outline-none cursor-pointer">
                    <option value="">-- SELECT --</option>
                    {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">New Name</label>
                  <input type="text" value={renameNew} onChange={e => setRenameNew(e.target.value)} className="w-full bg-white border-[2px] border-black px-3 py-2 uppercase font-bold focus:outline-none focus:bg-[#fff5ba]" />
                </div>
                <button onClick={handleRename} disabled={loading} className="w-full bg-[#ffe45e] border-[2px] border-black py-2 font-black uppercase text-sm hover:-translate-y-1 hover:-translate-x-1 shadow-[4px_4px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all">
                  {loading ? 'Processing...' : 'Rename'}
                </button>
              </div>
            )}
          </div>

          {/* SECTION C: DROP COLUMN */}
          <div>
            <SectionHeader title="Drop Column" icon={Trash2} isOpen={openSection === 'C'} onClick={() => { setOpenSection('C'); setDropConfirm(false); }} />
            {openSection === 'C' && (
              <div className="p-4 bg-[#fef9ef] space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">Select Column To Drop</label>
                  <select value={dropCol} onChange={e => { setDropCol(e.target.value); setDropConfirm(false); }} className="w-full bg-white border-[2px] border-black px-3 py-2 uppercase font-bold focus:outline-none cursor-pointer">
                    <option value="">-- SELECT --</option>
                    {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <p className="text-[10px] font-black text-[#ff499e] uppercase">⚠ This action cannot be undone</p>
                <button 
                  onClick={handleDrop} 
                  disabled={loading || !dropCol} 
                  className={`w-full border-[2px] border-black py-2 font-black uppercase text-sm hover:-translate-y-1 hover:-translate-x-1 shadow-[4px_4px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all ${dropConfirm ? 'bg-red-600 text-white' : 'bg-[#ff499e] text-white'}`}
                >
                  {loading ? 'Processing...' : (dropConfirm ? 'Are you sure? Click to confirm' : 'Drop Column')}
                </button>
              </div>
            )}
          </div>

          {/* SECTION D: BIN NUMERIC */}
          <div>
            <SectionHeader title="Bin Numeric Column" icon={BarChart2} isOpen={openSection === 'D'} onClick={() => setOpenSection('D')} />
            {openSection === 'D' && (
              <div className="p-4 bg-[#fef9ef] space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">Select Numeric Column</label>
                  <select value={binCol} onChange={e => setBinCol(e.target.value)} className="w-full bg-white border-[2px] border-black px-3 py-2 uppercase font-bold focus:outline-none cursor-pointer">
                    <option value="">-- SELECT --</option>
                    {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <label className="block text-[10px] font-black uppercase mb-1">Number of Bins</label>
                    <input 
                      type="number" min="2" max="10" 
                      value={binCount} 
                      onChange={e => {
                        const cnt = parseInt(e.target.value) || 2;
                        setBinCount(cnt);
                        setBinLabels(Array(cnt).fill('').map((_, i) => `BIN_${i+1}`));
                      }} 
                      className="w-full bg-white border-[2px] border-black px-3 py-2 font-bold focus:outline-none" 
                    />
                  </div>
                  <div className="w-2/3 space-y-2">
                    <label className="block text-[10px] font-black uppercase mb-1">Bin Labels</label>
                    {binLabels.map((lbl, idx) => (
                      <input 
                        key={idx} type="text" value={lbl} 
                        onChange={e => {
                          const newLabels = [...binLabels];
                          newLabels[idx] = e.target.value;
                          setBinLabels(newLabels);
                        }}
                        className="w-full bg-white border-[2px] border-black px-2 py-1 uppercase text-xs font-bold focus:outline-none" 
                      />
                    ))}
                  </div>
                </div>
                <button onClick={handleBin} disabled={loading} className="w-full bg-[#ffe45e] border-[2px] border-black py-2 font-black uppercase text-sm hover:-translate-y-1 hover:-translate-x-1 shadow-[4px_4px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all">
                  {loading ? 'Processing...' : 'Create Bins'}
                </button>
              </div>
            )}
          </div>

          {/* SECTION E: EXTRACT DATE */}
          <div>
            <SectionHeader title="Extract Date Parts" icon={Calendar} isOpen={openSection === 'E'} onClick={() => setOpenSection('E')} />
            {openSection === 'E' && (
              <div className="p-4 bg-[#fef9ef] space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">Select Object/Date Column</label>
                  <select value={dateCol} onChange={e => setDateCol(e.target.value)} className="w-full bg-white border-[2px] border-black px-3 py-2 uppercase font-bold focus:outline-none cursor-pointer">
                    <option value="">-- SELECT --</option>
                    {catCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase mb-2">Parts to Extract</label>
                  <div className="flex flex-wrap gap-2">
                    {['year', 'month', 'day', 'weekday', 'quarter'].map(part => (
                      <button 
                        key={part}
                        onClick={() => setDateParts(p => ({...p, [part]: !p[part]}))}
                        className={`px-3 py-1 text-xs font-black uppercase border-[2px] border-black ${dateParts[part] ? 'bg-[#ffe45e]' : 'bg-white'}`}
                      >
                        {part}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleDateExtract} disabled={loading} className="w-full bg-[#ffe45e] border-[2px] border-black py-2 font-black uppercase text-sm hover:-translate-y-1 hover:-translate-x-1 shadow-[4px_4px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all">
                  {loading ? 'Processing...' : 'Extract Parts'}
                </button>
              </div>
            )}
          </div>

          {/* SECTION F: ENCODE COLUMN */}
          <div>
            <SectionHeader title="Encode Column" icon={Hash} isOpen={openSection === 'F'} onClick={() => setOpenSection('F')} />
            {openSection === 'F' && (
              <div className="p-4 bg-[#fef9ef] space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">Select Categorical Column</label>
                  <select value={encodeCol} onChange={e => setEncodeCol(e.target.value)} className="w-full bg-white border-[2px] border-black px-3 py-2 uppercase font-bold focus:outline-none cursor-pointer">
                    <option value="">-- SELECT --</option>
                    {catCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEncodeMethod('label')} className={`flex-1 py-3 border-[2px] border-black font-black uppercase text-xs ${encodeMethod === 'label' ? 'bg-black text-white' : 'bg-white text-black'}`}>
                    Label Encoding
                  </button>
                  <button onClick={() => setEncodeMethod('onehot')} className={`flex-1 py-3 border-[2px] border-black font-black uppercase text-xs ${encodeMethod === 'onehot' ? 'bg-black text-white' : 'bg-white text-black'}`}>
                    One-Hot Encoding
                  </button>
                </div>
                <p className="text-xs font-bold text-gray-600">
                  {encodeMethod === 'label' ? "Replaces categories with numbers (0, 1, 2...)" : "Creates one new column per category"}
                </p>
                <button onClick={handleEncode} disabled={loading} className="w-full bg-[#00f0ff] border-[2px] border-black py-2 font-black uppercase text-sm hover:-translate-y-1 hover:-translate-x-1 shadow-[4px_4px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all">
                  {loading ? 'Processing...' : 'Encode'}
                </button>
              </div>
            )}
          </div>

          {/* SECTION G: SCALE COLUMNS */}
          <div>
            <SectionHeader title="Scale Columns" icon={ArrowUpDown} isOpen={openSection === 'G'} onClick={() => setOpenSection('G')} />
            {openSection === 'G' && (
              <div className="p-4 bg-[#fef9ef] space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-2">Select Numeric Columns</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border-[2px] border-black bg-white">
                    {numericCols.map(c => {
                      const isSelected = scaleCols.includes(c.name);
                      return (
                        <button 
                          key={c.name}
                          onClick={() => {
                            if (isSelected) setScaleCols(scaleCols.filter(x => x !== c.name));
                            else setScaleCols([...scaleCols, c.name]);
                          }}
                          className={`px-2 py-1 text-[10px] font-black uppercase border-[2px] border-black ${isSelected ? 'bg-[#ffe45e]' : 'bg-white'} truncate max-w-[120px]`}
                          title={c.name}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="block text-[10px] font-black uppercase mb-1">Method</label>
                  <div className="flex text-xs font-black border-[2px] border-black">
                    {['minmax', 'standard', 'robust'].map(m => (
                      <button 
                        key={m} onClick={() => setScaleMethod(m)} 
                        className={`flex-1 py-1.5 uppercase border-r-[2px] border-black last:border-r-0 ${scaleMethod === m ? 'bg-black text-white' : 'bg-white text-black'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-gray-600 mt-1 uppercase">
                    {scaleMethod === 'minmax' && "Scales to range [0, 1]"}
                    {scaleMethod === 'standard' && "Mean=0, Std=1 (Z-score)"}
                    {scaleMethod === 'robust' && "Uses median and IQR, outlier resistant"}
                  </p>
                </div>
                <button onClick={handleScale} disabled={loading} className="w-full bg-[#ff8c00] text-white border-[2px] border-black py-2 font-black uppercase text-sm hover:-translate-y-1 hover:-translate-x-1 shadow-[4px_4px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all">
                  {loading ? 'Processing...' : 'Scale Columns'}
                </button>
              </div>
            )}
          </div>

          {/* SECTION H: STRING OPERATIONS */}
          <div>
            <SectionHeader title="String Operations" icon={Type} isOpen={openSection === 'H'} onClick={() => setOpenSection('H')} />
            {openSection === 'H' && (
              <div className="p-4 bg-[#fef9ef] space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">Select Text Column</label>
                  <select value={strCol} onChange={e => setStrCol(e.target.value)} className="w-full bg-white border-[2px] border-black px-3 py-2 uppercase font-bold focus:outline-none cursor-pointer">
                    <option value="">-- SELECT --</option>
                    {catCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase mb-2">Operation</label>
                  <div className="flex flex-wrap gap-2">
                    {['upper', 'lower', 'strip', 'remove_special', 'extract_numbers'].map(op => (
                      <button 
                        key={op} onClick={() => setStrOp(op)} 
                        className={`px-3 py-1.5 text-[10px] font-black uppercase border-[2px] border-black ${strOp === op ? 'bg-[#00f0ff]' : 'bg-white'}`}
                      >
                        {op.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleStringOps} disabled={loading} className="w-full bg-[#00f0ff] border-[2px] border-black py-2 font-black uppercase text-sm hover:-translate-y-1 hover:-translate-x-1 shadow-[4px_4px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all">
                  {loading ? 'Processing...' : 'Apply Operation'}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: Preview & History (60%) */}
      <div className="w-full lg:w-[60%] space-y-6">
        
        {/* LIVE PREVIEW */}
        <div>
          <div className="flex justify-between items-center border-b-[3px] border-black pb-2 mb-4">
            <h2 className="text-xl font-black uppercase text-black">Live Preview</h2>
            <div className="flex items-center gap-4">
              {columns.length > 0 && <span className="text-xs font-black bg-black text-white px-2 py-1">{columns.length} COLS</span>}
              <button onClick={fetchPreview} className="p-1 border-[2px] border-black bg-white hover:bg-[#ffe45e] transition-colors shadow-[2px_2px_0px_#000] active:translate-y-px active:shadow-none">
                <RefreshCw size={16} strokeWidth={3} />
              </button>
            </div>
          </div>
          
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] overflow-x-auto">
            {preview.length === 0 ? (
              <div className="p-8 text-center font-black uppercase text-gray-400">No Data</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-black text-white">
                    {columns.map((c, i) => (
                      <th key={i} className="px-4 py-2 border-r-[2px] border-gray-800 last:border-r-0 font-black uppercase text-[10px] tracking-wider" title={c.name}>
                        {c.name}
                        <span className="block text-[8px] text-gray-400 mt-0.5">{c.dtype}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {preview.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b-[2px] border-gray-200 last:border-b-0 hover:bg-gray-50">
                      {columns.map((c, cIdx) => (
                        <td key={cIdx} className="px-4 py-2 border-r-[2px] border-gray-200 last:border-r-0">
                          {row[c.name] === null ? <span className="text-gray-400">NaN</span> : row[c.name]?.toString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* OPERATION HISTORY */}
        <div>
          <h2 className="text-xl font-black uppercase text-black border-b-[3px] border-black pb-2 mb-4">Operation History</h2>
          
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] h-[300px] overflow-y-auto">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                <Clock size={32} strokeWidth={2} className="opacity-50" />
                <p className="font-black uppercase text-sm">No Operations Yet</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {history.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border-b-[2px] border-black last:border-b-0 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 border-[2px] border-black ${item.color}`} />
                      <div>
                        <p className="font-black text-sm uppercase text-black leading-none">{item.name}</p>
                        <p className="font-bold text-[10px] text-gray-500 mt-1 uppercase max-w-[300px] truncate">{item.col}</p>
                      </div>
                    </div>
                    <span className="font-black text-[10px] text-gray-400 border-[2px] border-gray-200 px-2 py-0.5">{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FeatureEngineering;
