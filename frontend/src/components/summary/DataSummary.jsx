import React, { useEffect, useState } from 'react';
import { FileText, AlertCircle, Loader, Hash, Type, TrendingUp, AlertTriangle, Database } from 'lucide-react';
import { getSummary } from '../../api/client';

// ─── Helpers ─────────────────────────────────────────────────────
const fmt = (val) => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return val;
};

// ─── Dtype badge colours (light + dark variants) ──────────────────
const DTYPE_COLORS = {
  int:     'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  float:   'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  object:  'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  bool:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  default: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const DtypeBadge = ({ dtype }) => {
  const key = Object.keys(DTYPE_COLORS).find(k => dtype.includes(k)) ?? 'default';
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DTYPE_COLORS[key]}`}>
      {dtype}
    </span>
  );
};

// ─── Overview metric card ─────────────────────────────────────────
const OverviewCard = ({ label, value, icon: Icon, accent }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4 transition-colors">
    <div className={`p-3 rounded-xl ${accent}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-2xl font-black text-gray-800 dark:text-gray-100 font-mono">{fmt(value)}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</p>
    </div>
  </div>
);

// ─── Stat row inside a column card ───────────────────────────────
const StatRow = ({ label, value, highlight }) => (
  <div className={`flex justify-between items-center py-1 ${
    highlight
      ? 'text-indigo-700 dark:text-indigo-400 font-semibold'
      : 'text-gray-600 dark:text-gray-400'
  }`}>
    <span className="text-xs">{label}</span>
    <span className="text-xs font-mono">{fmt(value)}</span>
  </div>
);

// ─── Column Profile Card ──────────────────────────────────────────
const ColumnCard = ({ col }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 min-w-0">
        {col.is_numeric
          ? <TrendingUp size={14} className="text-indigo-500 shrink-0" />
          : <Type size={14} className="text-green-500 shrink-0" />
        }
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate" title={col.name}>
          {col.name}
        </p>
      </div>
      <DtypeBadge dtype={col.dtype} />
    </div>

    {/* Body */}
    <div className="px-4 py-3 space-y-0.5">
      <StatRow label="Unique values" value={col.unique_count} />
      <StatRow label="Missing"       value={col.missing_count} />

      {col.is_numeric ? (
        <>
          <div className="border-t border-dashed border-gray-100 dark:border-gray-700 my-1" />
          <StatRow label="Mean"   value={col.mean}  highlight />
          <StatRow label="Std"    value={col.std} />
          <StatRow label="Min"    value={col.min} />
          <StatRow label="25%"    value={col.q25} />
          <StatRow label="Median" value={col.q50}   highlight />
          <StatRow label="75%"    value={col.q75} />
          <StatRow label="Max"    value={col.max} />
        </>
      ) : (
        <>
          <div className="border-t border-dashed border-gray-100 dark:border-gray-700 my-1" />
          <div className="flex justify-between items-start py-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">Most frequent</span>
            <span className="text-xs font-mono text-indigo-700 dark:text-indigo-400 font-semibold max-w-[55%] text-right break-words">
              {col.top_value ?? '—'}
            </span>
          </div>
          <StatRow label="Frequency" value={col.top_value_frequency} />
        </>
      )}
    </div>
  </div>
);

// ─── Health bar ───────────────────────────────────────────────────
const HealthBar = ({ missing, total }) => {
  const pct   = total > 0 ? Math.round((missing / total) * 100) : 0;
  const color = pct === 0 ? 'bg-green-500' : pct < 5 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{pct}%</span>
    </div>
  );
};

// ─── Main DataSummary Component ───────────────────────────────────
const DataSummary = ({ isDataLoaded }) => {
  const [summary,   setSummary]   = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');

  useEffect(() => {
    if (!isDataLoaded) {
      setIsLoading(false);
      return;
    }

    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const data = await getSummary();
        setSummary(data);
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
        <Database size={48} className="text-gray-300 dark:text-gray-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Data Profile Available</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
            Please import a dataset from the <strong>File</strong> menu to view its statistical profile.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader size={36} className="text-blue-500 animate-spin" />
      <p className="text-gray-500 dark:text-gray-400">Profiling your dataset…</p>
    </div>
  );

  if (error) return (
    <div className="max-w-lg mx-auto mt-16 flex items-start gap-3 p-5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300">
      <AlertCircle size={22} className="shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">Could not load profile</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    </div>
  );

  if (!summary) return null;

  const { overview, columns } = summary;
  const totalCells      = overview.total_rows * overview.total_cols;
  const numericCount    = columns.filter(c =>  c.is_numeric).length;
  const categoricalCount = columns.filter(c => !c.is_numeric).length;

  const visibleCols = columns
    .filter(c => filter === 'all' || (filter === 'numeric' ? c.is_numeric : !c.is_numeric))
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
          <FileText size={24} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dataset Profile</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {overview.total_cols} columns · {overview.total_rows.toLocaleString()} rows
          </p>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <OverviewCard label="Total Rows"     value={overview.total_rows}     icon={Hash}          accent="bg-blue-500" />
        <OverviewCard label="Total Columns"  value={overview.total_cols}     icon={FileText}      accent="bg-indigo-500" />
        <OverviewCard label="Missing Cells"  value={overview.missing_cells}  icon={AlertTriangle} accent={overview.missing_cells  === 0 ? 'bg-green-500' : 'bg-orange-500'} />
        <OverviewCard label="Duplicate Rows" value={overview.duplicate_rows} icon={AlertCircle}   accent={overview.duplicate_rows === 0 ? 'bg-green-500' : 'bg-red-500'} />
        <OverviewCard label="Memory (KB)"    value={overview.memory_kb}      icon={TrendingUp}    accent="bg-purple-500" />
      </div>

      {/* Dataset Health */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Dataset Health</h2>
          <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> {numericCount} numeric</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {categoricalCount} categorical</span>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Data Completeness</span>
              <span>{overview.missing_cells === 0 ? '100% — No missing values' : `${overview.missing_cells} missing of ${totalCells.toLocaleString()} cells`}</span>
            </div>
            <HealthBar missing={overview.missing_cells} total={totalCells} />
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Row Uniqueness</span>
              <span>{overview.duplicate_rows === 0 ? '100% unique rows' : `${overview.duplicate_rows} duplicate rows`}</span>
            </div>
            <HealthBar missing={overview.duplicate_rows} total={overview.total_rows} />
          </div>
        </div>
      </div>

      {/* Column Grid */}
      <div>
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            Column Profiles
            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">({visibleCols.length} of {columns.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            {/* Type filter toggle */}
            <div className="flex text-xs rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              {['all', 'numeric', 'categorical'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 capitalize cursor-pointer transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            {/* Search */}
            <input
              type="text"
              placeholder="Search columns…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5
                         bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-400 w-44"
            />
          </div>
        </div>

        {visibleCols.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No columns match your filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleCols.map(col => <ColumnCard key={col.name} col={col} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSummary;
