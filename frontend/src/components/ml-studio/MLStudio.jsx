import React, { useState, useMemo } from 'react';
import { BrainCircuit, Play, Loader, AlertCircle, CheckCircle2 } from 'lucide-react';
import { runML } from '../../api/client';
import InferencePanel from '../shared/InferencePanel';

// ─── Shared dark-aware primitives ────────────────────────────────
const Section = ({ title, children }) => (
  <div className="mb-5">
    <p className="text-sm font-black uppercase tracking-wider text-black mb-2">{title}</p>
    {children}
  </div>
);

const Label = ({ children }) => (
  <label className="block text-xs font-black text-black mb-1 uppercase">{children}</label>
);

const Select = ({ value, onChange, children, disabled }) => (
  <select
    value={value}
    onChange={onChange}
    disabled={disabled}
    className="neo-input p-2 w-full disabled:opacity-50 cursor-pointer"
  >
    {children}
  </select>
);

const Input = ({ label, value, onChange, type = 'number', min, placeholder }) => (
  <div>
    <Label>{label}</Label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      min={min}
      placeholder={placeholder}
      className="neo-input p-2 w-full"
    />
  </div>
);

// ─── Confusion Matrix ─────────────────────────────────────────────
const ConfusionMatrix = ({ matrix, labels }) => (
  <div className="overflow-x-auto">
    <table className="text-sm border-collapse w-full">
      <thead>
        <tr>
          <th className="p-2 text-xs text-gray-400 dark:text-gray-500 font-normal text-right">
            Actual \ Predicted
          </th>
          {labels.map(l => (
            <th key={l} className="p-2 text-xs font-semibold text-center
                                   bg-blue-50 dark:bg-blue-900/40
                                   text-blue-700 dark:text-blue-300
                                   border border-gray-200 dark:border-gray-700 rounded">
              {String(l)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {matrix.map((row, i) => (
          <tr key={i}>
            <td className="p-2 text-xs font-semibold text-right
                           text-blue-700 dark:text-blue-300
                           bg-blue-50 dark:bg-blue-900/40
                           border border-gray-200 dark:border-gray-700">
              {String(labels[i] ?? i)}
            </td>
            {row.map((cell, j) => (
              <td
                key={j}
                className={`p-2 text-sm text-center border border-gray-200 dark:border-gray-700 font-mono font-medium ${
                  i === j
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                    : cell > 0
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
      <span className="inline-block w-3 h-3 bg-green-100 dark:bg-green-900/40 border rounded mr-1" />Correct &nbsp;
      <span className="inline-block w-3 h-3 bg-red-50 dark:bg-red-900/30 border rounded mr-1 ml-2" />Misclassifications
    </p>
  </div>
);

// ─── Cluster Preview ──────────────────────────────────────────────
const ClusterPreview = ({ labels, nClusters }) => {
  const COLORS = ['bg-blue-500','bg-purple-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-yellow-500','bg-cyan-500','bg-indigo-500'];
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        First {labels.length} rows — cluster assignment preview
      </p>
      <div className="flex flex-wrap gap-1">
        {labels.map((cl, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${COLORS[cl % COLORS.length]}`}
            title={`Row ${idx + 1} → Cluster ${cl}`}
          >
            {cl}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: nClusters }, (_, i) => (
          <span key={i} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
            <span className={`w-3 h-3 rounded-full ${COLORS[i % COLORS.length]}`} />
            Cluster {i}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── Result card reusable shell ───────────────────────────────────
const ResultCard = ({ children, className = '' }) => (
  <div className={`neo-card ${className}`}>
    {children}
  </div>
);

// ─── Main MLStudio ────────────────────────────────────────────────
const MLStudio = ({ anomalyReport, config, setConfig }) => {
  const { task, algorithm, targetCol, featureCols, results } = config;

  const [kNeighbors,       setKNeighbors]      = useState(3);
  const [maxDepth,         setMaxDepth]        = useState('');
  const [maxIter,          setMaxIter]         = useState(1000);
  const [nEstimators,      setNEstimators]     = useState(100);
  const [svmKernel,        setSvmKernel]       = useState('rbf');
  const [nClusters,        setNClusters]       = useState(3);
  const [dbscanEps,        setDbscanEps]       = useState(0.5);
  const [dbscanMinSamples, setDbscanMinSamples] = useState(5);
  const [isLoading,        setIsLoading]       = useState(false);
  const [error,            setError]           = useState(null);

  const allColumns = useMemo(() =>
    anomalyReport ? Object.keys(anomalyReport.columns) : [], [anomalyReport]);

  const numericColumns = useMemo(() =>
    anomalyReport
      ? Object.entries(anomalyReport.columns)
          .filter(([_, i]) => i.inferred_type.includes('int') || i.inferred_type.includes('float'))
          .map(([c]) => c)
      : [], [anomalyReport]);

  const handleTaskChange = (t) => {
    setConfig(prev => ({
      ...prev,
      task: t,
      algorithm: t === 'clustering' ? 'kmeans' : 'knn',
      results: null
    }));
    setError(null);
  };

  const toggleFeature = (col) =>
    setConfig(prev => ({
      ...prev,
      featureCols: prev.featureCols.includes(col) 
        ? prev.featureCols.filter(c => c !== col) 
        : [...prev.featureCols, col]
    }));

  const handleRun = async () => {
    if (featureCols.length === 0) { setError('Please select at least one feature column.'); return; }
    if (task === 'classification' && !targetCol) { setError('Please select a target column for classification.'); return; }

    const params = {};
    if (algorithm === 'knn')                 params.k           = Number(kNeighbors);
    if (algorithm === 'decision_tree')       params.max_depth   = maxDepth ? Number(maxDepth) : null;
    if (algorithm === 'logistic_regression') params.max_iter    = Number(maxIter);
    if (algorithm === 'random_forest')       params.n_estimators = Number(nEstimators);
    if (algorithm === 'svm')                 params.kernel      = svmKernel;
    if (algorithm === 'kmeans')              params.clusters    = Number(nClusters);
    if (algorithm === 'dbscan')            { params.eps = Number(dbscanEps); params.min_samples = Number(dbscanMinSamples); }

    setIsLoading(true); setError(null);
    try {
      const data = await runML({ task, algorithm, target_col: targetCol, feature_cols: featureCols, params });
      setConfig(prev => ({ ...prev, results: data }));
    } catch (err) {
      setError(err.response?.data?.error || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!anomalyReport) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
      <div className="p-5 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl mb-5 inline-block">
        <BrainCircuit size={48} className="text-indigo-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No Dataset Available</h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 max-w-sm">
        Please upload and prepare your dataset in the <strong>Data Prep & Cleaning</strong> tab first.
      </p>
    </div>
  );

  return (
    <div className="flex h-full gap-0 -mx-8 -my-8 overflow-hidden">

      {/* ── Left Config Sidebar ──────────────────────────────── */}
      <aside className="w-80 shrink-0 bg-[#ffe45e] border-r-[3px] border-black flex flex-col overflow-y-auto transition-none">
        <div className="p-5 border-b-[3px] border-black bg-white">
          <div className="flex items-center gap-2">
            <BrainCircuit size={24} className="text-black" strokeWidth={2.5} />
            <h2 className="font-black text-black uppercase tracking-tight text-lg">Model Configuration</h2>
          </div>
          <p className="text-xs font-bold text-gray-700 mt-1 uppercase">Configure and run your ML pipeline</p>
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <Section title="1. Task Type">
            <Select value={task} onChange={e => handleTaskChange(e.target.value)}>
              <option value="classification">Classification</option>
              <option value="clustering">Clustering</option>
            </Select>
          </Section>

          <Section title="2. Algorithm">
            <Select 
              value={algorithm} 
              onChange={(e) => setConfig(prev => ({ ...prev, algorithm: e.target.value, results: null }))}
            >
              {task === 'classification' ? (
                <>
                  <option value="knn">K-Nearest Neighbors (KNN)</option>
                  <option value="decision_tree">Decision Tree</option>
                  <option value="logistic_regression">Logistic Regression</option>
                  <option value="random_forest">Random Forest</option>
                  <option value="svm">Support Vector Machine (SVM)</option>
                  <option value="naive_bayes">Naive Bayes (Gaussian)</option>
                </>
              ) : (
                <>
                  <option value="kmeans">K-Means Clustering</option>
                  <option value="dbscan">DBSCAN</option>
                </>
              )}
            </Select>
          </Section>

          <Section title="3. Hyperparameters">
            {algorithm === 'knn'                 && <Input label="K (Neighbors)"                  value={kNeighbors}      onChange={e => setKNeighbors(e.target.value)}      min={1}    placeholder="e.g. 3" />}
            {algorithm === 'decision_tree'       && <Input label="Max Depth (blank = unlimited)"   value={maxDepth}        onChange={e => setMaxDepth(e.target.value)}        min={1}    placeholder="e.g. 5" />}
            {algorithm === 'logistic_regression' && <Input label="Max Iterations"                  value={maxIter}         onChange={e => setMaxIter(e.target.value)}         min={100}  placeholder="e.g. 1000" />}
            {algorithm === 'random_forest'       && <Input label="Number of Estimators (Trees)"   value={nEstimators}     onChange={e => setNEstimators(e.target.value)}     min={1}    placeholder="e.g. 100" />}
            {algorithm === 'svm'                 && (
              <div><Label>Kernel</Label>
                <Select value={svmKernel} onChange={e => setSvmKernel(e.target.value)}>
                  <option value="rbf">RBF (Radial Basis Function)</option>
                  <option value="linear">Linear</option>
                  <option value="poly">Polynomial</option>
                </Select>
              </div>
            )}
            {algorithm === 'naive_bayes'         && <p className="text-xs text-gray-400 dark:text-gray-500 italic py-1">No hyperparameters required for Gaussian Naive Bayes.</p>}
            {algorithm === 'kmeans'              && <Input label="Number of Clusters (K)"          value={nClusters}       onChange={e => setNClusters(e.target.value)}       min={2}    placeholder="e.g. 3" />}
            {algorithm === 'dbscan'              && (
              <div className="space-y-3">
                <Input label="Epsilon (eps) — neighborhood radius" value={dbscanEps}        onChange={e => setDbscanEps(e.target.value)}        min={0.01} placeholder="e.g. 0.5" />
                <Input label="Min Samples — core point threshold"  value={dbscanMinSamples} onChange={e => setDbscanMinSamples(e.target.value)} min={1}    placeholder="e.g. 5" />
              </div>
            )}
          </Section>

          <Section title="4. Feature Columns (X)">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                {featureCols.length} Selected
              </span>
              <button
                onClick={() => {
                  if (featureCols.length === numericColumns.length) {
                    setConfig(prev => ({ ...prev, featureCols: [] }));
                  } else {
                    setConfig(prev => ({ ...prev, featureCols: numericColumns.filter(c => c !== targetCol) }));
                  }
                }}
                className="text-[11px] font-black text-black hover:underline cursor-pointer uppercase"
              >
                {featureCols.length === numericColumns.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="border-[3px] border-black bg-white max-h-44 overflow-y-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {numericColumns.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 p-3">No numeric columns available.</p>
              ) : numericColumns.map(col => (
                <label key={col} className="flex items-center gap-2 px-3 py-2 cursor-pointer
                                            hover:bg-cyan-300 border-b-[3px] border-black last:border-0 transition-none">
                  <input type="checkbox" checked={featureCols.includes(col)} onChange={() => toggleFeature(col)} className="w-4 h-4 border-2 border-black accent-black cursor-pointer" />
                  <span className="text-sm font-bold text-black truncate">{col}</span>
                </label>
              ))}
            </div>
            <p className="text-xs font-bold text-black mt-2 uppercase">{featureCols.length} column{featureCols.length !== 1 ? 's' : ''} selected</p>
          </Section>

          {task === 'classification' && (
            <Section title="5. Target Column (y)">
              <Select 
                value={targetCol} 
                onChange={(e) => setConfig(prev => ({ ...prev, targetCol: e.target.value, results: null }))}
              >
                <option value="">Select target column...</option>
                {allColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </Select>
            </Section>
          )}

          <div className="mt-auto pt-4">
            <button
              onClick={handleRun}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 neo-btn neo-btn-danger py-4 text-xl"
            >
              {isLoading ? <><Loader size={24} className="animate-spin" /> RUNNING...</> : <><Play size={24} /> RUN MODEL</>}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Results Canvas ────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-white dot-grid p-8 transition-none">

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl mb-6 text-red-700 dark:text-red-300">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!results && !error && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 inline-block mb-4 shadow-sm">
              <BrainCircuit size={48} className="text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Configure and Run a Model</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 max-w-sm">
              Select your task, algorithm, and columns in the panel on the left, then hit <strong>Run Model</strong>.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center gap-4">
            <Loader size={40} className="text-indigo-500 animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Training model, please wait…</p>
          </div>
        )}

        {/* Classification Results */}
        {results && results.task === 'classification' && (
          <div className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-green-500" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {{ knn: 'K-Nearest Neighbors', decision_tree: 'Decision Tree', logistic_regression: 'Logistic Regression', random_forest: 'Random Forest', svm: 'Support Vector Machine', naive_bayes: 'Naive Bayes' }[results.algorithm] ?? results.algorithm} — Classification Results
              </h2>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Trained on {results.train_size} rows · Tested on {results.test_size} rows · 80/20 split
            </p>

            <ResultCard className="p-8 flex flex-col items-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Model Accuracy</p>
              <p className={`text-7xl font-black font-mono ${results.accuracy >= 80 ? 'text-green-500' : results.accuracy >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                {results.accuracy}%
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                {results.accuracy >= 80 ? '✅ Great performance' : results.accuracy >= 60 ? '⚠️ Moderate — consider more features' : '❌ Low accuracy — try tuning hyperparameters'}
              </p>
            </ResultCard>

            <ResultCard className="p-6">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Confusion Matrix</h3>
              {results.confusion_matrix && results.class_labels
                ? <ConfusionMatrix matrix={results.confusion_matrix} labels={results.class_labels} />
                : <p className="text-sm text-gray-400 dark:text-gray-500">Matrix not available.</p>
              }
            </ResultCard>

            {/* LIVE PREDICTION PANEL */}
            <InferencePanel features={featureCols} featureBounds={results.feature_bounds} />
          </div>
        )}

        {/* Clustering Results */}
        {results && results.task === 'clustering' && (
          <div className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-green-500" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {results.algorithm === 'dbscan' ? 'DBSCAN' : 'K-Means'} Clustering — {results.n_clusters} Cluster{results.n_clusters !== 1 ? 's' : ''} Found
              </h2>
            </div>

            {results.algorithm === 'dbscan' && (
              <div className="flex gap-4">
                <ResultCard className="p-4 flex-1 text-center">
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Clusters Found</p>
                  <p className="text-4xl font-black font-mono text-indigo-600 dark:text-indigo-400">{results.n_clusters}</p>
                </ResultCard>
                <ResultCard className="p-4 flex-1 text-center">
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Noise Points</p>
                  <p className="text-4xl font-black font-mono text-red-500">{results.noise_points}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Label = -1</p>
                </ResultCard>
              </div>
            )}

            {results.algorithm === 'kmeans' && (
              <ResultCard className="p-8 flex flex-col items-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">WCSS (Inertia)</p>
                <p className="text-7xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {results.inertia?.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 max-w-xs text-center">
                  Within-Cluster Sum of Squares. Lower = tighter clusters.
                </p>
              </ResultCard>
            )}

            <ResultCard className="p-6">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Cluster Assignment Preview
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">(first {results.labels_preview.length} of {results.total_rows} rows)</span>
              </h3>
              <ClusterPreview labels={results.labels_preview} nClusters={results.n_clusters} />
            </ResultCard>

            {/* LIVE PREDICTION PANEL */}
            <InferencePanel features={featureCols} featureBounds={results.feature_bounds} />
          </div>
        )}
      </main>
    </div>
  );
};

export default MLStudio;
