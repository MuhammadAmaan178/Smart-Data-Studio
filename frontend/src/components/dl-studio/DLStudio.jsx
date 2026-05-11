import React, { useState, useMemo } from 'react';
import {
  Network, Play, Loader, AlertCircle, CheckCircle2,
  Plus, Trash2, Cpu
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { trainDL } from '../../api/client';
import InferencePanel from '../shared/InferencePanel';

// ─── Shared dark-aware primitives ────────────────────────────────
const SectionTitle = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{children}</p>
);

const FormLabel = ({ children }) => (
  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{children}</label>
);

const NumberInput = ({ label, value, onChange, min = 1, max }) => (
  <div>
    {label && <FormLabel>{label}</FormLabel>}
    <input
      type="number"
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg p-2
                 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100
                 focus:outline-none focus:ring-2 focus:ring-purple-500"
    />
  </div>
);

// ─── Result card shell ────────────────────────────────────────────
const ResultCard = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
    {children}
  </div>
);

// ─── Learning Curves ──────────────────────────────────────────────
const LearningCurves = ({ history }) => {
  const data = Array.from({ length: history.accuracy.length }, (_, i) => ({
    epoch:        i + 1,
    accuracy:     +(history.accuracy[i] * 100).toFixed(2),
    val_accuracy: +(history.val_accuracy[i] * 100).toFixed(2),
    loss:         +history.loss[i].toFixed(4),
    val_loss:     +history.val_loss[i].toFixed(4),
  }));

  const gridColor   = '#374151'; // gray-700 — readable in both modes
  const tooltipStyle = {
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    color: '#f9fafb',
    fontSize: 11,
    borderRadius: 8,
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Accuracy over Epochs (%)</h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="epoch" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={v => `${v}%`} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="accuracy"     stroke="#8b5cf6" strokeWidth={2} dot={false} name="Train Accuracy" />
            <Line type="monotone" dataKey="val_accuracy" stroke="#06b6d4" strokeWidth={2} dot={false} name="Val Accuracy" strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Loss over Epochs</h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="epoch" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="loss"     stroke="#f59e0b" strokeWidth={2} dot={false} name="Train Loss" />
            <Line type="monotone" dataKey="val_loss" stroke="#ef4444" strokeWidth={2} dot={false} name="Val Loss"   strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─── Architecture Visualiser ──────────────────────────────────────
const ArchitectureViz = ({ architecture, nFeatures }) => {
  const allLayers = [
    { label: 'Input', neurons: nFeatures, color: 'bg-gray-400 dark:bg-gray-600' },
    ...architecture.map((l, i) => ({
      label: `Layer ${i + 1}`,
      neurons: l.neurons,
      activation: l.activation,
      color: i === architecture.length - 1 ? 'bg-purple-500' : 'bg-indigo-500',
    })),
  ];

  return (
    <div className="flex items-center gap-3 overflow-x-auto py-4 px-2">
      {allLayers.map((layer, idx) => (
        <React.Fragment key={idx}>
          <div className="flex flex-col items-center shrink-0">
            <div className={`${layer.color} text-white text-xs font-bold px-3 py-2 rounded-lg min-w-[70px] text-center shadow-sm`}>
              {layer.label}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{layer.neurons}N</p>
            {layer.activation && <p className="text-[10px] text-gray-400 dark:text-gray-500">{layer.activation}</p>}
          </div>
          {idx < allLayers.length - 1 && (
            <div className="flex-1 h-px bg-gradient-to-r from-gray-300 dark:from-gray-600 to-gray-200 dark:to-gray-700 min-w-[20px] mt-[-16px]" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Main DLStudio ────────────────────────────────────────────────
const DLStudio = ({ anomalyReport, config, setConfig }) => {
  const { targetCol, featureCols, hiddenLayers, results } = config;

  const [epochs,       setEpochs]       = useState(50);
  const [batchSize,    setBatchSize]    = useState(32);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState(null);

  const allColumns = useMemo(() =>
    anomalyReport ? Object.keys(anomalyReport.columns) : [], [anomalyReport]);

  const numericColumns = useMemo(() =>
    anomalyReport
      ? Object.entries(anomalyReport.columns)
          .filter(([_, i]) => i.inferred_type.includes('int') || i.inferred_type.includes('float'))
          .map(([c]) => c)
      : [], [anomalyReport]);

  const toggleFeature = (col) =>
    setConfig(prev => ({
      ...prev,
      featureCols: prev.featureCols.includes(col)
        ? prev.featureCols.filter(c => c !== col)
        : [...prev.featureCols, col]
    }));

  const addLayer = () =>
    setConfig(prev => ({
      ...prev,
      hiddenLayers: [...prev.hiddenLayers, { neurons: 16, activation: 'relu' }]
    }));

  const removeLayer = (idx) =>
    setConfig(prev => ({
      ...prev,
      hiddenLayers: prev.hiddenLayers.filter((_, i) => i !== idx)
    }));

  const updateLayer = (idx, field, val) =>
    setConfig(prev => {
      const newLayers = [...prev.hiddenLayers];
      newLayers[idx] = { ...newLayers[idx], [field]: val };
      return { ...prev, hiddenLayers: newLayers };
    });

  const handleTrain = async () => {
    if (featureCols.length === 0) { setError('Please select at least one feature column.'); return; }
    if (!targetCol)                { setError('Please select a target column.'); return; }
    if (hiddenLayers.length === 0) { setError('Add at least one hidden layer.'); return; }

    setIsLoading(true); setError(null);
    try {
      const payload = {
        target_col: targetCol, feature_cols: featureCols,
        epochs: Number(epochs), batch_size: Number(batchSize),
        hidden_layers: hiddenLayers.map(l => ({ neurons: Number(l.neurons), activation: l.activation })),
      };
      const data = await trainDL(payload);
      setConfig(prev => ({ ...prev, results: data }));
    } catch (err) {
      setError(err.response?.data?.error || 'An unexpected error occurred during training.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!anomalyReport) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
      <div className="p-5 bg-purple-50 dark:bg-purple-900/30 rounded-2xl mb-5">
        <Network size={48} className="text-purple-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No Dataset Available</h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 max-w-sm">
        Upload and prepare your dataset in the <strong>Data Prep & Cleaning</strong> tab first.
      </p>
    </div>
  );

  return (
    <div className="flex h-full gap-0 -mx-8 -my-8 overflow-hidden">

      {/* ── Left Config Sidebar ──────────────────────────────── */}
      <aside className="w-80 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto shadow-sm transition-colors">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-2">
            <Network size={20} className="text-purple-600 dark:text-purple-400" />
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Network Configuration</h2>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Build and train a feedforward neural network</p>
        </div>

        <div className="p-5 flex-1 flex flex-col gap-5">

          {/* Feature columns */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionTitle>1. Feature Columns (X)</SectionTitle>
              <button
                onClick={() => {
                  const allSelected = featureCols.length === numericColumns.length;
                  setConfig(prev => ({
                    ...prev,
                    featureCols: allSelected ? [] : numericColumns.filter(c => c !== prev.targetCol),
                    results: null
                  }));
                }}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                {featureCols.length === numericColumns.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
              {numericColumns.length === 0
                ? <p className="text-xs text-gray-400 dark:text-gray-500 p-3">No numeric columns available.</p>
                : numericColumns.map(col => (
                    <label key={col} className="flex items-center gap-2 px-3 py-2 cursor-pointer
                                                hover:bg-gray-50 dark:hover:bg-gray-700/50
                                                border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <input type="checkbox" checked={featureCols.includes(col)} onChange={() => toggleFeature(col)} className="accent-purple-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{col}</span>
                    </label>
                  ))
              }
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{featureCols.length} selected</p>
          </div>

          {/* Target column */}
          <div>
            <SectionTitle>2. Target Column (y — binary)</SectionTitle>
            <select
              value={targetCol}
              onChange={(e) => setConfig(prev => ({ ...prev, targetCol: e.target.value, results: null }))}
              className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg p-2
                         bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select target column...</option>
              {allColumns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Hyperparameters */}
          <div>
            <SectionTitle>3. Hyperparameters</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput label="Epochs"     value={epochs}    onChange={e => setEpochs(e.target.value)}    min={1}  max={500} />
              <NumberInput label="Batch Size" value={batchSize} onChange={e => setBatchSize(e.target.value)} min={1} />
            </div>
          </div>

          {/* Hidden Layers */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <SectionTitle>4. Hidden Layers</SectionTitle>
              <button
                onClick={addLayer}
                className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium cursor-pointer"
              >
                <Plus size={14} /> Add Layer
              </button>
            </div>

            {hiddenLayers.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic py-1">No hidden layers. Add at least one.</p>
            )}

            <div className="space-y-2">
              {hiddenLayers.map((layer, i) => (
                <div key={i} className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </div>
                  <input
                    type="number"
                    value={layer.neurons}
                    min={1}
                    onChange={e => updateLayer(i, 'neurons', e.target.value)}
                    className="w-16 text-xs border border-gray-200 dark:border-gray-600 rounded p-1 text-center
                               bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200
                               focus:outline-none focus:ring-1 focus:ring-purple-400"
                    title="Neurons"
                  />
                  <span className="text-xs text-gray-400 dark:text-gray-500">N</span>
                  <select
                    value={layer.activation}
                    onChange={e => updateLayer(i, 'activation', e.target.value)}
                    className="flex-1 text-xs border border-gray-200 dark:border-gray-600 rounded p-1
                               bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none"
                  >
                    <option value="relu">ReLU</option>
                    <option value="sigmoid">Sigmoid</option>
                    <option value="tanh">Tanh</option>
                  </select>
                  <button
                    onClick={() => removeLayer(i)}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Output layer: 1 neuron · Sigmoid (binary classification)
            </p>
          </div>

          {/* Train Button */}
          <button
            onClick={handleTrain}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 cursor-pointer shadow-sm mt-auto"
          >
            {isLoading
              ? <><Loader size={18} className="animate-spin" /> Training...</>
              : <><Play size={18} /> Train Neural Network</>}
          </button>
        </div>
      </aside>

      {/* ── Results Canvas ────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#121212] p-8 transition-colors">

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl mb-6 text-red-700 dark:text-red-300">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!results && !error && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 inline-block mb-4 shadow-sm">
              <Cpu size={48} className="text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Build your Neural Network</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 max-w-sm">
              Select features, configure hidden layers, and click <strong>Train Neural Network</strong> to see the learning curves.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center gap-4">
            <Loader size={40} className="text-purple-500 animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Training neural network…</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Running {epochs} epochs with backpropagation</p>
          </div>
        )}

        {results && (
          <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-green-500" />
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Training Complete</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {results.epochs_run} epochs · Train {results.train_size} rows · Val {results.val_size} rows · Test {results.test_size} rows
                </p>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-4">
              <ResultCard className="p-6 flex flex-col items-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Test Accuracy</p>
                <p className={`text-6xl font-black font-mono ${
                  results.test_accuracy >= 80 ? 'text-green-500' :
                  results.test_accuracy >= 60 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {results.test_accuracy}%
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {results.test_accuracy >= 80 ? '✅ Strong generalisation' :
                   results.test_accuracy >= 60 ? '⚠️ Try more layers/epochs' :
                   '❌ Consider more features or data'}
                </p>
              </ResultCard>

              <ResultCard className="p-6 flex flex-col items-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Final Test Loss</p>
                <p className="text-6xl font-black font-mono text-purple-600 dark:text-purple-400">
                  {results.test_loss}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Binary Cross-Entropy · lower is better</p>
              </ResultCard>
            </div>

            {/* Architecture */}
            <ResultCard className="p-6">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Network Architecture</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{results.n_features} input features → {results.architecture.length} layers</p>
              <ArchitectureViz architecture={results.architecture} nFeatures={results.n_features} />
            </ResultCard>

            {/* Learning Curves */}
            <ResultCard className="p-6">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Learning Curves</h3>
              <LearningCurves history={results.history} epochs={results.epochs_run} />
            </ResultCard>

            <InferencePanel features={featureCols} featureBounds={results.feature_bounds} />
          </div>
        )}
      </main>
    </div>
  );
};

export default DLStudio;
