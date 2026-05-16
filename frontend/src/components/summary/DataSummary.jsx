import React, { useEffect, useState } from 'react';
import { FileText, AlertCircle, Loader, Hash, Type, TrendingUp, AlertTriangle, Database } from 'lucide-react';
import { getSummary, getCorrelationMatrix } from '../../api/client';

// ─── Helpers ─────────────────────────────────────────────────────
const fmt = (val) => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return val;
};

// ─── Dtype badge colours ─────────────────────────────────────────
const DtypeBadge = ({ dtype }) => {
  return (
    <span className="text-[10px] font-black px-2 py-0.5 uppercase border-[2px] border-black bg-white text-black">
      {dtype}
    </span>
  );
};

// ─── Overview metric card ─────────────────────────────────────────
const OverviewCard = ({ label, value, icon: Icon }) => (
  <div className="bg-white border-[2px] border-black shadow-[4px_4px_0px_#000] p-4 flex items-center gap-4 transition-all duration-200 hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-[6px_6px_0px_#000]">
    <div className="p-3 border-[2px] border-black bg-[#ffe45e]">
      <Icon size={24} className="text-black" strokeWidth={2.5} />
    </div>
    <div>
      <p className="text-3xl font-black text-black leading-none mb-1">{fmt(value)}</p>
      <p className="text-[10px] font-black text-gray-600 uppercase tracking-wider">{label}</p>
    </div>
  </div>
);

// ─── Stat row inside a column card ───────────────────────────────
const StatRow = ({ label, value, isMeanMedian }) => (
  <div className={`flex justify-between items-center py-1.5 px-2 ${isMeanMedian ? 'border-l-[4px] border-[#ffe45e]' : ''}`}>
    <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">{label}</span>
    <span className="text-xs font-black text-black text-right">{fmt(value)}</span>
  </div>
);

// ─── Column Profile Card ──────────────────────────────────────────
const ColumnCard = ({ col }) => {
  const hasOutliers = col.outlier_count && col.outlier_count > 0;
  
  return (
    <div className="bg-white border-[2px] border-black shadow-[4px_4px_0px_#000] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b-[2px] border-black bg-black">
        <div className="flex items-center gap-2 min-w-0">
          {col.is_numeric
            ? <TrendingUp size={16} className="text-white shrink-0" strokeWidth={2.5} />
            : <Type size={16} className="text-white shrink-0" strokeWidth={2.5} />
          }
          <p className="text-[13px] font-black text-white uppercase tracking-wider break-words leading-tight" title={col.name}>
            {col.name}
          </p>
        </div>
        <DtypeBadge dtype={col.dtype} />
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1">
        <div className="space-y-0.5 mb-4">
          <StatRow label="Unique Values" value={col.unique_count} />
          <StatRow label="Missing"       value={col.missing_count} />

          {col.is_numeric ? (
            <>
              <StatRow label="Mean"   value={col.mean}  isMeanMedian={true} />
              <StatRow label="Std"    value={col.std} />
              <StatRow label="Min"    value={col.min} />
              <StatRow label="25%"    value={col.q25} />
              <StatRow label="Median" value={col.q50}   isMeanMedian={true} />
              <StatRow label="75%"    value={col.q75} />
              <StatRow label="Max"    value={col.max} />
            </>
          ) : (
            <>
              <div className="flex justify-between items-start py-1.5 px-2 mt-2">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">Most freq</span>
                <span className="text-xs font-black text-black text-right max-w-[55%] break-words">
                  {col.top_value ?? '—'}
                </span>
              </div>
              <StatRow label="Frequency" value={col.top_value_frequency} />
            </>
          )}
        </div>
        
        {/* Spacer to push badge to bottom */}
        <div className="mt-auto pt-2 border-t-[2px] border-dashed border-gray-200">
          {hasOutliers ? (
            <div className="bg-[#ff499e] border-[2px] border-black text-white text-[10px] font-black uppercase text-center py-1.5 w-full">
              ⚠ {col.outlier_count} OUTLIERS DETECTED
            </div>
          ) : (
            <div className="bg-[#22c55e] border-[2px] border-black text-white text-[10px] font-black uppercase text-center py-1.5 w-full">
              ✓ CLEAN
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main DataSummary Component ───────────────────────────────────
const DataSummary = ({ isDataLoaded }) => {
  const [summary, setSummary] = useState(null);
  const [correlation, setCorrelation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isDataLoaded) {
      setIsLoading(false);
      return;
    }

    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const [sumData, corrData] = await Promise.all([
          getSummary(),
          getCorrelationMatrix().catch(() => null) // fail gracefully if error
        ]);
        setSummary(sumData);
        if (corrData && corrData.columns) {
          setCorrelation(corrData);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load data summary.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, [isDataLoaded]);

  if (!isDataLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <Database size={48} className="text-black opacity-30" strokeWidth={1.5} />
        <div>
          <h3 className="text-lg font-black text-black uppercase">No Data Profile Available</h3>
          <p className="text-xs font-bold text-gray-500 uppercase mt-2">
            Please import a dataset from the FILE menu
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader size={36} className="text-black animate-spin" strokeWidth={3} />
      <p className="text-black font-black uppercase text-sm tracking-wider">Profiling your dataset…</p>
    </div>
  );

  if (error) return (
    <div className="max-w-lg mx-auto mt-16 p-5 bg-[#ff499e] border-[3px] border-black shadow-[6px_6px_0px_#000] text-white flex gap-4">
      <AlertCircle size={24} className="shrink-0" strokeWidth={3} />
      <div>
        <p className="font-black uppercase text-lg">Could not load profile</p>
        <p className="text-sm font-bold mt-1">{error}</p>
      </div>
    </div>
  );

  if (!summary) return null;

  const { overview, columns } = summary;
  const totalCells = overview.total_rows * overview.total_cols;
  const missingPercent = totalCells > 0 ? (overview.missing_cells / totalCells) * 100 : 0;
  const duplicatePercent = overview.total_rows > 0 ? (overview.duplicate_rows / overview.total_rows) * 100 : 0;
  
  // Calculate health score: 100 - (missing_percent * 2) - (duplicate_percent * 5) clamped 0-100
  let healthScore = 100 - (missingPercent * 2) - (duplicatePercent * 5);
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
  
  const getHealthLabel = (score) => {
    if (score >= 90) return { label: 'EXCELLENT', color: 'text-[#22c55e]' };
    if (score >= 70) return { label: 'GOOD', color: 'text-[#ffe45e]' };
    if (score >= 50) return { label: 'FAIR', color: 'text-[#ff8c00]' };
    return { label: 'NEEDS ATTENTION', color: 'text-[#ff499e]' };
  };
  
  const healthStatus = getHealthLabel(healthScore);
  const completenessPercent = Math.max(0, 100 - missingPercent).toFixed(1);
  const uniquenessPercent = Math.max(0, 100 - duplicatePercent).toFixed(1);

  const visibleCols = columns
    .filter(c => filter === 'all' || (filter === 'numeric' ? c.is_numeric : !c.is_numeric))
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  // Correlation Matrix Cell Color
  const getCorrColor = (val) => {
    if (val === null || val === undefined) return 'bg-gray-200';
    if (val === 1.0) return 'bg-[#ffe45e]';
    if (val >= 0.5) return 'bg-[#fff5ba]';
    if (val > -0.5) return 'bg-white';
    if (val > -1.0) return 'bg-[#ffb6db]';
    return 'bg-[#ff499e]';
  };

  return (
    <div className="w-full space-y-12 animate-in fade-in duration-300 pb-20">

      {/* SECTION 1 — DATASET OVERVIEW */}
      <section>
        <div className="border-b-[2px] border-black pb-2 mb-6">
          <h2 className="text-xl font-black text-black uppercase tracking-wider">Dataset Overview</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <OverviewCard label="Total Rows"     value={overview.total_rows}     icon={Hash} />
          <OverviewCard label="Total Columns"  value={overview.total_cols}     icon={FileText} />
          <OverviewCard label="Missing Cells"  value={overview.missing_cells}  icon={AlertTriangle} />
          <OverviewCard label="Duplicate Rows" value={overview.duplicate_rows} icon={AlertCircle} />
          <OverviewCard label="Memory (KB)"    value={overview.memory_kb}      icon={TrendingUp} />
        </div>
      </section>

      {/* SECTION 2 — DATA HEALTH SCORE */}
      <section>
        <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] w-full flex flex-col md:flex-row">
          {/* Left Side: Score */}
          <div className="p-8 md:w-1/3 border-b-[3px] md:border-b-0 md:border-r-[3px] border-black flex flex-col items-center justify-center bg-[#111] text-white">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-300 mb-2">Data Health Score</h3>
            <div className="text-7xl font-black leading-none mb-2">{healthScore}</div>
            <div className={`text-xl font-black uppercase ${healthStatus.color} drop-shadow-md`}>
              {healthStatus.label}
            </div>
          </div>
          
          {/* Right Side: Progress Bars */}
          <div className="p-8 md:w-2/3 flex flex-col justify-center gap-8 bg-[#fef9ef]">
            {/* Completeness Bar */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="font-black text-black uppercase text-sm">Data Completeness</span>
                <span className="font-bold text-gray-600 text-xs uppercase">{completenessPercent}% — {overview.missing_cells.toLocaleString()} missing values</span>
              </div>
              <div className="h-4 w-full border-[2px] border-black bg-white">
                <div 
                  className="h-full bg-[#ffe45e] border-r-[2px] border-black" 
                  style={{ width: `${completenessPercent}%` }} 
                />
              </div>
            </div>
            
            {/* Uniqueness Bar */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="font-black text-black uppercase text-sm">Row Uniqueness</span>
                <span className="font-bold text-gray-600 text-xs uppercase">{uniquenessPercent}% — {overview.duplicate_rows.toLocaleString()} duplicate rows</span>
              </div>
              <div className="h-4 w-full border-[2px] border-black bg-white">
                <div 
                  className="h-full bg-[#00f0ff] border-r-[2px] border-black" 
                  style={{ width: `${uniquenessPercent}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — COLUMN PROFILES */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-[2px] border-black pb-4 mb-6">
          <h2 className="text-xl font-black text-black uppercase tracking-wider">
            Column Profiles <span className="text-gray-500 text-sm ml-2">({visibleCols.length} OF {columns.length})</span>
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            {/* Filter Tabs */}
            <div className="flex border-[2px] border-black text-xs font-black uppercase bg-white">
              {['all', 'numeric', 'categorical'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 border-r-[2px] border-black last:border-r-0 hover:bg-gray-100 transition-colors ${
                    filter === f ? 'bg-black text-white hover:bg-black' : ''
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            {/* Search Input */}
            <input
              type="text"
              placeholder="SEARCH COLUMNS..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3 py-2 border-[2px] border-black bg-[#fef9ef] text-black font-bold uppercase placeholder:text-gray-500 placeholder:font-black focus:outline-none focus:bg-white w-48 sm:w-64"
            />
          </div>
        </div>

        {visibleCols.length === 0 ? (
          <div className="bg-white border-[2px] border-black p-12 text-center shadow-[4px_4px_0px_#000]">
            <p className="text-xl font-black uppercase text-black">No columns match filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {visibleCols.map(col => <ColumnCard key={col.name} col={col} />)}
          </div>
        )}
      </section>

      {/* SECTION 4 — CORRELATION HEATMAP */}
      <section>
        <div className="border-b-[2px] border-black pb-2 mb-6">
          <h2 className="text-xl font-black text-black uppercase tracking-wider">Correlation Matrix</h2>
        </div>
        
        {(!correlation || correlation.columns.length < 2) ? (
          <div className="bg-white border-[2px] border-black p-8 shadow-[4px_4px_0px_#000] inline-block">
            <p className="font-black text-black uppercase text-sm">Need at least 2 numeric columns to generate correlation matrix</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="inline-block border-[2px] border-black shadow-[4px_4px_0px_#000] bg-white">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 bg-black border-[2px] border-black"></th>
                    {correlation.columns.map((col, idx) => (
                      <th key={idx} className="p-2 bg-black text-white border-[2px] border-black text-[10px] font-black uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]" title={col}>
                        {col.length > 8 ? col.substring(0, 8) + '…' : col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlation.matrix.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <th className="p-2 bg-black text-white border-[2px] border-black text-[10px] font-black uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px] text-right" title={correlation.columns[rIdx]}>
                        {correlation.columns[rIdx].length > 8 ? correlation.columns[rIdx].substring(0, 8) + '…' : correlation.columns[rIdx]}
                      </th>
                      {row.map((val, cIdx) => {
                        const isDiagonal = rIdx === cIdx;
                        return (
                          <td 
                            key={cIdx} 
                            className={`p-3 border-[2px] border-black text-center text-[11px] font-black w-14 h-14 ${isDiagonal ? 'bg-black text-white' : getCorrColor(val)}`}
                          >
                            {isDiagonal ? '1.00' : (val !== null ? val.toFixed(2) : '—')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

    </div>
  );
};

export default DataSummary;
