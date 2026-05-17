import React, { useState, useEffect, useContext } from 'react';
import { 
  Database, CheckCircle, AlertTriangle, X, Search, Sparkles, LayoutDashboard
} from 'lucide-react';
import { 
  getMissingInfo, handleMissing, stringClean, outlierDetect, outlierHandle, 
  getCleanReport, clearCleanLog, cleanData, getFullDataset 
} from '../../api/client';
import AddColumnModal from './AddColumnModal';
import QueueDrawer from './QueueDrawer';
import Toast from '../ui/Toast';

const DataPrep = ({ 
  dataPreview, isDataLoaded, anomalyReport, onOpenDemoModal,
  setDataPreview, setAnomalyReport 
}) => {
  // ── State ─────────────────────────────────────────────────────────────
  const [missingInfo, setMissingInfo] = useState([]);
  const [stringColumns, setStringColumns] = useState([]);
  const [numericColumns, setNumericColumns] = useState([]);
  const [outlierResults, setOutlierResults] = useState({});
  const [stringCheckboxes, setStringCheckboxes] = useState({});
  const [missingCustomValues, setMissingCustomValues] = useState({});
  const [missingStrategies, setMissingStrategies] = useState({});
  
  const [actionQueue, setActionQueue] = useState([]);
  const [isApplying, setIsApplying] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [cleanLog, setCleanLog] = useState([]);
  const [previewRows, setPreviewRows] = useState('first'); // 'first' or 'last'
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [fullDataset, setFullDataset] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2500);
  };

  // Initialize data from backend on mount/data load
  useEffect(() => {
    if (isDataLoaded) {
      fetchColumnInfo();
      fetchFullDataset();
    }
  }, [isDataLoaded, anomalyReport]);

  const fetchFullDataset = async () => {
    try {
      const res = await getFullDataset();
      if (res && res.data) {
        setFullDataset(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch full dataset:", err);
    }
  };

  const fetchColumnInfo = async () => {
    try {
      const info = await getMissingInfo();
      setMissingInfo(info);
      
      const strCols = info.filter(c => c.dtype === 'object' || c.dtype.startsWith('str'));
      setStringColumns(strCols);
      
      const numCols = info.filter(c => c.dtype.startsWith('int') || c.dtype.startsWith('float'));
      setNumericColumns(numCols);
    } catch (err) {
      console.error("Failed to fetch column info:", err);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────
  const queueAction = (action) => {
    if (action.type === 'duplicates') {
      const alreadyQueued = actionQueue.some(a => a.type === 'duplicates');
      if (alreadyQueued) {
        showToast('Drop duplicates already in queue', 'error');
        return;
      }
    }

    if (action.type === 'missing') {
      const alreadyQueued = actionQueue.some(a => a.type === 'missing' && a.column === action.column);
      if (alreadyQueued) {
        showToast(`${action.column} already queued`, 'error');
        return;
      }
    }

    if (action.type === 'string') {
      const alreadyQueued = actionQueue.some(a => a.type === 'string' && a.column === action.column);
      if (alreadyQueued) {
        showToast(`${action.column} already queued`, 'error');
        return;
      }
    }

    if (action.type === 'outlier') {
      const alreadyQueued = actionQueue.some(a => a.type === 'outlier' && a.column === action.column);
      if (alreadyQueued) {
        showToast(`${action.column} already queued`, 'error');
        return;
      }
    }

    setActionQueue(prev => [...prev, { id: Date.now().toString(), ...action }]);
    if (action.type === 'duplicates') {
      showToast('Duplicates queued for removal');
    } else if (action.type === 'missing') {
      showToast(`Missing values queued — ${action.column} · ${action.strategy}`);
    } else if (action.type === 'string') {
      showToast(`String cleaning queued — ${action.column}`);
    } else if (action.type === 'outlier') {
      showToast(`Outlier handling queued — ${action.column}`);
    }
  };

  const removeQueuedAction = (id) => {
    setActionQueue(prev => prev.filter(a => a.id !== id));
    showToast('Action removed from queue', 'error');
  };

  const clearQueue = () => {
    setActionQueue([]);
    showToast('Queue cleared', 'error');
  };

  const handleSchemaChange = async (col, newType) => {
    try {
      const data = await cleanData([{ action: 'change_dtype', column: col, new_type: newType }]);
      setDataPreview(data.data_preview);
      setAnomalyReport(data.anomaly_report);
    } catch (err) {
      alert("Failed to change schema: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDropColumn = async (col) => {
    try {
      const data = await cleanData([{ action: 'drop_column', column: col }]);
      setDataPreview(data.data_preview);
      setAnomalyReport(data.anomaly_report);
    } catch (err) {
      alert("Failed to drop column: " + (err.response?.data?.error || err.message));
    }
  };

  const scanOutliers = async (col) => {
    try {
      const res = await outlierDetect({ column: col });
      setOutlierResults(prev => ({ ...prev, [col]: res }));
    } catch (err) {
      alert("Failed to scan outliers: " + (err.response?.data?.error || err.message));
    }
  };

  const toggleStringCheckbox = (col, op) => {
    setStringCheckboxes(prev => {
      const colOps = prev[col] || [];
      let newOps = [...colOps];
      
      if (newOps.includes(op)) {
        newOps = newOps.filter(o => o !== op);
      } else {
        newOps.push(op);
      }
      
      // Mutually exclusive lowercase/uppercase
      if (op === 'lowercase') newOps = newOps.filter(o => o !== 'uppercase');
      if (op === 'uppercase') newOps = newOps.filter(o => o !== 'lowercase');
      
      return { ...prev, [col]: newOps };
    });
  };

  const applyAllChanges = async () => {
    setIsApplying(true);
    try {
      await clearCleanLog(); // Reset log for this batch
      
      // Execute sequentially
      for (const action of actionQueue) {
        try {
          if (action.type === 'missing') {
            await handleMissing({ column: action.column, strategy: action.strategy, custom_value: action.customValue });
          } else if (action.type === 'string') {
            await stringClean({ column: action.column, operations: action.operations });
          } else if (action.type === 'outlier') {
            await outlierHandle({ column: action.column, strategy: action.strategy });
          } else if (action.type === 'duplicates') {
            await cleanData([{ action: 'drop_duplicates' }]); // fallback to existing route for duplicates
          }
        } catch (err) {
          const errMsg = err.response?.data?.error || err.message;
          throw new Error(`Failed on ${action.type.toUpperCase()} action${action.column ? ` for column ${action.column}` : ''}: ${errMsg}`);
        }
      }
      
      // Refresh UI state
      const updatedData = await cleanData([{ action: 'refresh_ui_dummy' }]); 
      setDataPreview(updatedData.data_preview);
      setAnomalyReport(updatedData.anomaly_report);
      
      const log = await getCleanReport();
      setCleanLog(log);
      setActionQueue([]);
      setShowReportModal(true);
      return true;
    } catch (err) {
      alert("Error applying changes: " + err.message);
      return false;
    } finally {
      setIsApplying(false);
    }
  };

  // Calculate Health Score
  const getHealthScore = () => {
    if (!anomalyReport) return 100;
    
    // Sum missing cells from anomalyReport
    let missing_cells = 0;
    Object.values(anomalyReport.columns || {}).forEach(info => {
      missing_cells += info.missing_values || 0;
    });
    
    const duplicate_rows = anomalyReport.total_duplicates || 0;
    
    // Sum outliers from scanned results
    let outlier_count = 0;
    Object.values(outlierResults).forEach(res => {
      outlier_count += res.outlier_count || 0;
    });
    
    let score = 100 - (missing_cells * 2) - (duplicate_rows * 5) - (outlier_count * 1);
    return Math.max(0, Math.min(100, score));
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (!isDataLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full text-center space-y-6 bg-[#fef9ef]">
        <div className="p-8 border-[3px] border-black bg-white shadow-[4px_4px_0px_#000]">
          <LayoutDashboard size={80} className="text-black mx-auto mb-2" strokeWidth={2} />
          <Database size={64} className="text-black mx-auto" strokeWidth={2} />
        </div>
        <h2 className="text-4xl font-black text-black uppercase">Welcome to Smart DataStudio</h2>
        <p className="text-black font-bold max-w-md mx-auto text-sm leading-relaxed border-[3px] border-black p-3 bg-white shadow-[4px_4px_0px_#000]">
          Your end-to-end workspace for data analysis and machine learning. 
          Import a dataset from the <strong className="underline">File</strong> menu to begin.
        </p>
        <button onClick={onOpenDemoModal} className="flex items-center gap-2 px-6 py-3 font-black uppercase text-black bg-[#ffe45e] border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
          <Sparkles size={20} strokeWidth={3} />
          Try Demo Dataset
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-[#fef9ef] min-h-screen pb-32">
      <div className="p-6 space-y-10 max-w-6xl mx-auto w-full">

        {/* ── SECTION 1: DATASET PREVIEW ── */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_#000]">
          <div className="flex items-center justify-between border-b-[3px] border-black p-4 bg-[#fef9ef]">
            <h2 className="text-xl font-black text-black uppercase tracking-tight">Dataset Preview</h2>
            <div className="flex border-[3px] border-black bg-white">
              <button 
                onClick={() => setPreviewRows('first')}
                className={`px-4 py-1.5 text-xs font-black uppercase border-r-[3px] border-black cursor-pointer ${previewRows === 'first' ? 'bg-[#ffe45e]' : 'hover:bg-gray-100'}`}
              >
                First 10 Rows
              </button>
              <button 
                onClick={() => setPreviewRows('last')}
                className={`px-4 py-1.5 text-xs font-black uppercase cursor-pointer ${previewRows === 'last' ? 'bg-[#ffe45e]' : 'hover:bg-gray-100'}`}
              >
                Last 10 Rows
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-black text-white">
                  {Object.keys(dataPreview?.[0] || {}).map(k => (
                    <th key={k} className="py-2 px-4 text-left text-xs font-black uppercase tracking-widest border-r-[3px] border-black last:border-r-0">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(fullDataset.length > 0 ? (previewRows === 'first' ? fullDataset.slice(0, 10) : fullDataset.slice(-10)) : (dataPreview || [])).map((row, i) => (
                  <tr key={i} className={`border-b-[3px] border-black last:border-b-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafaf0]'}`}>
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="py-2 px-4 text-black font-bold border-r-[3px] border-black last:border-r-0 whitespace-nowrap">
                        {v !== null ? v.toString() : <span className="text-[#ff499e] font-black">NaN</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t-[3px] border-black bg-gray-50 flex items-center">
            <span className="text-[10px] font-black uppercase bg-[#00f0ff] border-[2px] border-black px-2 py-0.5 shadow-[2px_2px_0px_#000]">
              {anomalyReport?.total_rows || 0} ROWS × {Object.keys(anomalyReport?.columns || {}).length} COLUMNS
            </span>
          </div>
        </div>

        {/* ── SECTION 2: SCHEMA MANAGEMENT ── */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_#000]">
          <div className="border-b-[3px] border-black p-4 bg-[#fef9ef] flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-black uppercase tracking-tight">Schema Management</h2>
              <p className="text-xs font-bold text-gray-500 uppercase mt-1">Review and fix column data types</p>
            </div>
            <button
              onClick={() => setIsAddColumnModalOpen(true)}
              className="bg-[#00f0ff] border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all px-4 py-2 font-black uppercase text-black flex items-center gap-2 cursor-pointer"
            >
              + Add Column
            </button>
          </div>
          
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-black text-white border-b-[3px] border-black">
                  <th className="py-2 px-4 text-left text-xs font-black uppercase tracking-widest border-r-[3px] border-black">Column</th>
                  <th className="py-2 px-4 text-left text-xs font-black uppercase tracking-widest border-r-[3px] border-black">Inferred Type</th>
                  <th className="py-2 px-4 text-left text-xs font-black uppercase tracking-widest border-r-[3px] border-black">Change Type</th>
                  <th className="py-2 px-4 text-center text-xs font-black uppercase tracking-widest">Delete</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(anomalyReport?.columns || {}).map(([col, info]) => (
                  <tr key={col} className="border-b-[3px] border-black last:border-b-0 hover:bg-yellow-50">
                    <td className="py-2 px-4 font-bold text-black border-r-[3px] border-black">{col}</td>
                    <td className="py-2 px-4 font-bold text-black border-r-[3px] border-black">{info.inferred_type}</td>
                    <td className="py-2 px-4 border-r-[3px] border-black">
                      <select
                        className="bg-[#fef9ef] border-[2px] border-black text-black font-bold p-1 text-xs w-full cursor-pointer outline-none"
                        onChange={(e) => handleSchemaChange(col, e.target.value)}
                        defaultValue={
                          info.inferred_type.includes('int')   ? 'int'     :
                          info.inferred_type.includes('float') ? 'float'   :
                          info.inferred_type.includes('bool')  ? 'boolean' : 'string'
                        }
                      >
                        <option value="string">string</option>
                        <option value="int">int</option>
                        <option value="float">float</option>
                        <option value="boolean">boolean</option>
                        <option value="datetime">datetime</option>
                      </select>
                    </td>
                    <td className="py-2 px-4 text-center">
                      <button
                        onClick={() => handleDropColumn(col)}
                        className="bg-[#ff499e] border-[2px] border-black p-1.5 shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer inline-flex items-center justify-center transition-all"
                        title="Delete Column"
                      >
                        <X size={14} strokeWidth={3} className="text-black" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <AddColumnModal
          isOpen={isAddColumnModalOpen}
          onClose={() => setIsAddColumnModalOpen(false)}
          columns={Object.keys(anomalyReport?.columns || {})}
          onApply={async (action) => {
            try {
              const data = await cleanData([action]);
              setDataPreview(data.data_preview);
              setAnomalyReport(data.anomaly_report);
              setIsAddColumnModalOpen(false);
            } catch (err) {
              alert("Failed to add column: " + (err.response?.data?.error || err.message));
            }
          }}
        />

        {/* ── SECTION 3: MISSING VALUES ── */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_#000]">
          <div className="border-b-[3px] border-black p-4 bg-[#fef9ef]">
            <h2 className="text-xl font-black text-black uppercase tracking-tight">Missing Values</h2>
            <p className="text-xs font-bold text-gray-500 uppercase mt-1">Handle null and empty cells per column</p>
          </div>
          
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
            {missingInfo.filter(c => c.missing_count > 0).length === 0 ? (
              <div className="col-span-full p-4 border-[3px] border-black bg-[#fef9ef] flex items-center gap-3">
                <CheckCircle size={24} className="text-lime-500" />
                <span className="font-black text-black uppercase">NO MISSING VALUES DETECTED</span>
              </div>
            ) : (
              missingInfo.filter(c => c.missing_count > 0).map(c => (
                <div key={c.column_name} className="border-[3px] border-black p-4 bg-white flex flex-col gap-3 shadow-[2px_2px_0px_#000]">
                  <div className="flex justify-between items-center">
                    <span className="font-black uppercase text-black">{c.column_name}</span>
                    <span className="text-[10px] font-black border-[2px] border-black px-1.5 uppercase">{c.dtype}</span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase text-black mb-1">
                      <span>{c.missing_count} MISSING</span>
                      <span>{c.missing_percent}%</span>
                    </div>
                    <div className="h-3 w-full border-[2px] border-black bg-gray-100">
                      <div className="h-full bg-[#ffe45e] border-r-[2px] border-black" style={{ width: `${c.missing_percent}%` }} />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <select
                      className="bg-[#fef9ef] border-[2px] border-black text-black font-bold p-1.5 text-xs w-full outline-none"
                      value={missingStrategies[c.column_name] || ''}
                      onChange={(e) => setMissingStrategies({...missingStrategies, [c.column_name]: e.target.value})}
                    >
                      <option value="">Select Strategy...</option>
                      <option value="drop_rows">Drop Rows</option>
                      <option value="fill_mean">Fill Mean</option>
                      <option value="fill_median">Fill Median</option>
                      <option value="fill_mode">Fill Mode</option>
                      <option value="fill_custom">Fill Custom Value</option>
                    </select>
                    
                    {missingStrategies[c.column_name] === 'fill_custom' && (
                      <input 
                        type="text" 
                        placeholder="Custom value..." 
                        className="border-[2px] border-black p-1.5 text-xs font-bold w-full bg-[#fef9ef]"
                        value={missingCustomValues[c.column_name] || ''}
                        onChange={(e) => setMissingCustomValues({...missingCustomValues, [c.column_name]: e.target.value})}
                      />
                    )}
                    
                    <button
                      onClick={() => queueAction({
                        type: 'missing', column: c.column_name, strategy: missingStrategies[c.column_name], customValue: missingCustomValues[c.column_name]
                      })}
                      disabled={!missingStrategies[c.column_name]}
                      className="mt-1 py-1.5 bg-[#ffe45e] text-black text-xs font-black uppercase border-[2px] border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
                    >
                      Queue Action
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── SECTION 4: DUPLICATE ROWS ── */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_#000]">
          <div className="border-b-[3px] border-black p-4 bg-[#fef9ef]">
            <h2 className="text-xl font-black text-black uppercase tracking-tight">Duplicate Rows</h2>
            <p className="text-xs font-bold text-gray-500 uppercase mt-1">Detect and remove exact duplicate entries</p>
          </div>
          <div className="p-4 bg-white">
            {anomalyReport?.total_duplicates > 0 ? (
              <div className="border-[3px] border-black p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-[#ff499e] text-black font-black px-3 py-1 border-[2px] border-black text-lg shadow-[2px_2px_0px_#000]">
                    {anomalyReport.total_duplicates}
                  </span>
                  <span className="font-black text-black uppercase">DUPLICATE ROWS FOUND</span>
                </div>
                <button
                  onClick={() => queueAction({ type: 'duplicates', strategy: 'drop' })}
                  className="px-4 py-2 bg-[#ffe45e] border-[2px] border-black font-black uppercase text-xs shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                >
                  Queue Drop Duplicates
                </button>
              </div>
            ) : (
              <div className="p-4 border-[3px] border-black bg-[#fef9ef] flex items-center gap-3">
                <CheckCircle size={24} className="text-lime-500" />
                <span className="font-black text-black uppercase">NO DUPLICATES DETECTED</span>
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 5: STRING CLEANING ── */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_#000]">
          <div className="border-b-[3px] border-black p-4 bg-[#fef9ef]">
            <h2 className="text-xl font-black text-black uppercase tracking-tight">String Cleaning</h2>
            <p className="text-xs font-bold text-gray-500 uppercase mt-1">Clean text columns only</p>
          </div>
          <div className="p-4 bg-white">
            {stringColumns.length === 0 ? (
              <div className="p-4 border-[3px] border-black bg-[#fef9ef] flex items-center gap-3">
                <span className="font-black text-black uppercase">NO TEXT COLUMNS IN THIS DATASET</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stringColumns.map(c => {
                  const ops = stringCheckboxes[c.column_name] || [];
                  return (
                    <div key={c.column_name} className="border-[3px] border-black p-4 bg-white shadow-[2px_2px_0px_#000]">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-black uppercase text-black">{c.column_name}</span>
                        <span className="text-[10px] font-black border-[2px] border-black px-1.5 uppercase bg-white">TEXT</span>
                      </div>
                      <div className="space-y-2 mb-4">
                        {['strip', 'lowercase', 'uppercase', 'remove_special'].map(op => {
                          const isActive = ops.includes(op);
                          return (
                            <button
                              key={op}
                              onClick={() => toggleStringCheckbox(c.column_name, op)}
                              className={`w-full flex items-center gap-2 border-[2px] border-black p-1.5 text-xs font-black uppercase text-left transition-colors ${isActive ? 'bg-[#ffe45e]' : 'bg-white'}`}
                            >
                              <div className={`w-3 h-3 border-[2px] border-black ${isActive ? 'bg-black' : 'bg-white'}`} />
                              {op.replace('_', ' ')}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => queueAction({ type: 'string', column: c.column_name, operations: ops })}
                        disabled={ops.length === 0}
                        className="w-full py-1.5 bg-[#ffe45e] text-black text-xs font-black uppercase border-[2px] border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
                      >
                        Queue Action
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 6: OUTLIER DETECTION ── */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_#000]">
          <div className="border-b-[3px] border-black p-4 bg-[#fef9ef]">
            <h2 className="text-xl font-black text-black uppercase tracking-tight">Outlier Detection</h2>
            <p className="text-xs font-bold text-gray-500 uppercase mt-1">Find extreme values using IQR method</p>
          </div>
          <div className="p-4 bg-white grid grid-cols-1 gap-4">
            {numericColumns.length === 0 ? (
              <div className="p-4 border-[3px] border-black bg-[#fef9ef]">
                <span className="font-black text-black uppercase">NO NUMERIC COLUMNS AVAILABLE</span>
              </div>
            ) : (
              numericColumns.map(c => {
                const res = outlierResults[c.column_name];
                return (
                  <div key={c.column_name} className="border-[3px] border-black p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-black uppercase text-black">{c.column_name}</span>
                      <span className="text-[10px] font-black border-[2px] border-black px-1.5 uppercase">{c.dtype}</span>
                    </div>
                    
                    {!res ? (
                      <button
                        onClick={() => scanOutliers(c.column_name)}
                        className="px-4 py-2 bg-black text-white text-xs font-black uppercase border-[2px] border-black shadow-[3px_3px_0px_#ffe45e] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                      >
                        Scan For Outliers
                      </button>
                    ) : res.outlier_count === 0 ? (
                      <span className="text-lime-600 font-black uppercase">✓ NO OUTLIERS</span>
                    ) : (
                      <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <span className="text-xs font-black uppercase text-black">
                          {res.outlier_count} OUTLIERS FOUND · RANGE: [{res.lower_bound.toFixed(2)} TO {res.upper_bound.toFixed(2)}]
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => queueAction({ type: 'outlier', column: c.column_name, strategy: 'remove' })}
                            className="px-3 py-1.5 bg-[#ff499e] text-black text-[10px] font-black uppercase border-[2px] border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                          >
                            Queue Remove
                          </button>
                          <button
                            onClick={() => queueAction({ type: 'outlier', column: c.column_name, strategy: 'cap' })}
                            className="px-3 py-1.5 bg-[#ffe45e] text-black text-[10px] font-black uppercase border-[2px] border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                          >
                            Queue Cap
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ── QUEUE DRAWER ── */}
      <QueueDrawer 
        queue={actionQueue}
        onRemove={removeQueuedAction}
        onClearAll={clearQueue}
        onApplyAll={applyAllChanges}
        isApplying={isApplying}
      />

      {/* ── SECTION 8: CLEAN REPORT MODAL ── */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_#000] max-w-xl w-full max-h-[90vh] flex flex-col">
            <div className="border-b-[4px] border-black p-4 bg-[#fef9ef] flex items-center justify-between">
              <h2 className="text-2xl font-black text-black uppercase">Clean Report</h2>
              <button onClick={() => setShowReportModal(false)} className="text-black hover:text-red-500">
                <X size={24} strokeWidth={3} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="border-[3px] border-black p-6 bg-[#00f0ff] flex flex-col items-center justify-center text-center shadow-[4px_4px_0px_#000]">
                <div className="text-5xl font-black text-black">{getHealthScore()}%</div>
                <div className="text-xs font-black text-black uppercase mt-2">Data Health Score</div>
              </div>
              
              <div>
                <h3 className="font-black text-black uppercase border-b-[2px] border-black pb-2 mb-4">Applied Actions ({cleanLog.length})</h3>
                <div className="space-y-3">
                  {cleanLog.length === 0 ? (
                    <p className="text-sm font-bold text-gray-500 uppercase">No actions recorded.</p>
                  ) : (
                    cleanLog.map((log, i) => (
                      <div key={i} className="border-[2px] border-black p-3 flex flex-col gap-1 bg-[#fef9ef]">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs uppercase bg-[#ffe45e] border-[2px] border-black px-1.5">{log.action}</span>
                          <span className="text-[10px] font-black uppercase text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <span className="font-black text-sm uppercase text-black">{log.column || 'GLOBAL'}</span>
                        <span className="text-xs font-bold text-gray-700">{log.detail}</span>
                        <span className="text-[10px] font-black uppercase text-lime-600 mt-1">Rows Affected: {log.rows_affected}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t-[4px] border-black bg-gray-50">
              <button 
                onClick={() => setShowReportModal(false)}
                className="w-full py-3 bg-[#ffe45e] text-black border-[3px] border-black font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast 
        message={toast.message} 
        type={toast.type}
        visible={toast.visible} 
      />
    </div>
  );
};

export default DataPrep;
