import React, { useState, useEffect, useMemo } from 'react';
import { 
  BrainCircuit, Play, Loader, AlertCircle, CheckCircle2,
  Target, TrendingUp, Share2, Brain, Cpu, Layers, Sparkles, Database
} from 'lucide-react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell
} from 'recharts';
import { runML } from '../../api/client';

const MLStudio = ({ anomalyReport, config = {}, setConfig }) => {
  const formatPct = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return (val * 100).toFixed(1) + '%';
  };

  // Ensure config has all safe defaults
  const task = config.task || 'classification';
  const algorithm = config.algorithm || 'knn';
  const targetCol = config.targetCol || '';
  const featureCols = config.featureCols || [];
  const results = config.results || null;

  // Hyperparameter states
  const [kNeighbors, setKNeighbors] = useState(5);
  const [weights, setWeights] = useState('uniform');
  const [maxDepth, setMaxDepth] = useState(5);
  const [minSamplesSplit, setMinSamplesSplit] = useState(2);
  const [criterion, setCriterion] = useState('gini');
  const [nEstimators, setNEstimators] = useState(100);
  const [svmC, setSvmC] = useState(1.0);
  const [svmKernel, setSvmKernel] = useState('rbf');
  const [logRegC, setLogRegC] = useState(1.0);
  const [maxIter, setMaxIter] = useState(100);
  const [fitIntercept, setFitIntercept] = useState(true);
  const [ridgeAlpha, setRidgeAlpha] = useState(1.0);
  const [lassoAlpha, setLassoAlpha] = useState(1.0);
  const [nClusters, setNClusters] = useState(3);
  const [dbscanEps, setDbscanEps] = useState(0.5);
  const [dbscanMinSamples, setDbscanMinSamples] = useState(5);
  const [kmeansInit, setKmeansInit] = useState('k-means++');
  const [aggLinkage, setAggLinkage] = useState('ward');

  // Slider train/test split percentage
  const [splitVal, setSplitVal] = useState(80);

  // Inference states
  const [predictionInputs, setPredictionInputs] = useState({});
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictError, setPredictError] = useState(null);
  const [storedBounds, setStoredBounds] = useState({});

  // Loading & Error UI States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Extract all columns
  const allColumns = useMemo(() => {
    return anomalyReport ? Object.keys(anomalyReport.columns) : [];
  }, [anomalyReport]);

  // Extract numeric columns
  const numericColumns = useMemo(() => {
    if (!anomalyReport) return [];
    return Object.entries(anomalyReport.columns)
      .filter(([_, i]) => i.inferred_type.includes('int') || i.inferred_type.includes('float'))
      .map(([c]) => c);
  }, [anomalyReport]);

  // Sync stored bounds from results if available
  useEffect(() => {
    if (results && results.feature_bounds) {
      setStoredBounds(results.feature_bounds);
    }
  }, [results]);

  // Handle task switching
  const handleTaskChange = (selectedTask) => {
    let defaultAlgo = 'knn';
    if (selectedTask === 'regression') defaultAlgo = 'linear_regression';
    if (selectedTask === 'clustering') defaultAlgo = 'kmeans';

    setConfig(prev => ({
      ...prev,
      task: selectedTask,
      algorithm: defaultAlgo,
      results: null
    }));
    setError(null);
    setPredictionResult(null);
  };

  // Handle algorithm switching
  const handleAlgorithmChange = (e) => {
    setConfig(prev => ({
      ...prev,
      algorithm: e.target.value,
      results: null
    }));
    setError(null);
    setPredictionResult(null);
  };

  // Toggle features in Step 4
  const toggleFeature = (col) => {
    setConfig(prev => {
      const activeFeatures = prev.featureCols || [];
      const updatedFeatures = activeFeatures.includes(col)
        ? activeFeatures.filter(c => c !== col)
        : [...activeFeatures, col];
      return {
        ...prev,
        featureCols: updatedFeatures
      };
    });
  };

  // Select all features except target
  const handleSelectAllFeatures = () => {
    const featuresToSelect = numericColumns.filter(c => c !== targetCol);
    setConfig(prev => ({
      ...prev,
      featureCols: featuresToSelect
    }));
  };

  // Target Column selector logic
  const handleTargetChange = (e) => {
    const newTarget = e.target.value;
    setConfig(prev => {
      const activeFeatures = prev.featureCols || [];
      const updatedFeatures = activeFeatures.filter(c => c !== newTarget);
      return {
        ...prev,
        targetCol: newTarget,
        featureCols: updatedFeatures,
        results: null
      };
    });
  };

  // Trigger Model Training
  const handleRunModel = async () => {
    setError(null);
    setPredictionResult(null);

    const activeFeatures = task === 'clustering' ? numericColumns : featureCols;

    if (activeFeatures.length === 0) {
      setError('PLEASE SELECT AT LEAST ONE FEATURE COLUMN (X) FOR TRAINING.');
      return;
    }
    if (task !== 'clustering' && !targetCol) {
      setError('PLEASE CHOOSE A TARGET COLUMN (Y) FOR SUPERVISED TRAINING.');
      return;
    }

    // Build hyperparameters depending on algorithm
    const params = {};
    if (algorithm === 'knn') {
      params.k = Number(kNeighbors);
      params.weights = weights;
    } else if (algorithm === 'decision_tree') {
      params.max_depth = maxDepth ? Number(maxDepth) : null;
      params.min_samples_split = Number(minSamplesSplit);
      params.criterion = criterion;
    } else if (algorithm === 'random_forest') {
      params.n_estimators = Number(nEstimators);
      params.max_depth = maxDepth ? Number(maxDepth) : null;
    } else if (algorithm === 'svm') {
      params.C = Number(svmC);
      params.kernel = svmKernel;
    } else if (algorithm === 'logistic_regression') {
      params.C = Number(logRegC);
      params.max_iterations = Number(maxIter);
    } else if (algorithm === 'linear_regression') {
      params.fit_intercept = fitIntercept;
    } else if (algorithm === 'ridge_regression') {
      params.alpha = Number(ridgeAlpha);
    } else if (algorithm === 'lasso_regression') {
      params.alpha = Number(lassoAlpha);
    } else if (algorithm === 'decision_tree_regressor') {
      params.max_depth = maxDepth ? Number(maxDepth) : null;
      params.min_samples_split = Number(minSamplesSplit);
      params.criterion = criterion;
    } else if (algorithm === 'random_forest_regressor') {
      params.n_estimators = Number(nEstimators);
      params.max_depth = maxDepth ? Number(maxDepth) : null;
    } else if (algorithm === 'kmeans') {
      params.n_clusters = Number(nClusters);
      params.max_iterations = Number(maxIter);
      params.init = kmeansInit;
    } else if (algorithm === 'dbscan') {
      params.eps = Number(dbscanEps);
      params.min_samples = Number(dbscanMinSamples);
    } else if (algorithm === 'agglomerative_clustering') {
      params.n_clusters = Number(nClusters);
      params.linkage = aggLinkage;
    }

    setIsLoading(true);
    try {
      const response = await runML({
        task_type: task,
        algorithm,
        hyperparameters: params,
        feature_columns: activeFeatures,
        target_column: targetCol,
        test_size: splitVal
      });

      setConfig(prev => ({
        ...prev,
        results: response
      }));

      // Pre-fill prediction inputs empty
      const freshInputs = {};
      activeFeatures.forEach(c => {
        freshInputs[c] = '';
      });
      setPredictionInputs(freshInputs);

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'AN UNEXPECTED SERVER TRAINING ERROR OCCURRED.');
    } finally {
      setIsLoading(false);
    }
  };

  // Smart Autofill values for inputs
  const handleAutofill = () => {
    if (!storedBounds) return;
    const activeFeatures = task === 'clustering' ? numericColumns : featureCols;
    const filled = {};
    activeFeatures.forEach(col => {
      const bounds = storedBounds[col];
      if (bounds) {
        const { min, max } = bounds;
        const randomVal = Math.random() * (max - min) + min;
        filled[col] = randomVal.toFixed(4);
      } else {
        filled[col] = '0';
      }
    });
    setPredictionInputs(filled);
  };

  // Run Inference Prediction
  const handlePredict = async () => {
    setPredictLoading(true);
    setPredictError(null);
    setPredictionResult(null);

    const activeFeatures = task === 'clustering' ? numericColumns : featureCols;
    const payloadInputs = {};
    activeFeatures.forEach(col => {
      const val = predictionInputs[col];
      payloadInputs[col] = val === undefined || val === '' ? 0.0 : parseFloat(val);
    });

    try {
      const response = await fetch('https://amaan909-smart-datastudio-backend.hf.space/api/predict/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: payloadInputs }),
      });

      const data = await response.json();
      if (response.ok) {
        setPredictionResult(data);
      } else {
        setPredictError(data.error || 'PREDICTION FAILED');
      }
    } catch (err) {
      setPredictError(`CONNECTION FAILURE: ${err.message}`);
    } finally {
      setPredictLoading(false);
    }
  };

  // Calculate Residual Bins
  const residualBins = useMemo(() => {
    if (!results || !results.residuals || results.residuals.length === 0) return [];
    const res = results.residuals;
    const minVal = Math.min(...res);
    const maxVal = Math.max(...res);
    const binCount = 10;
    const step = (maxVal - minVal) / binCount;

    const bins = Array.from({ length: binCount }, (_, idx) => {
      const start = minVal + idx * step;
      const end = start + step;
      return {
        binLabel: `${start.toFixed(2)} to ${end.toFixed(2)}`,
        count: 0
      };
    });

    res.forEach(v => {
      let binIdx = Math.floor((v - minVal) / step);
      if (binIdx >= binCount) binIdx = binCount - 1;
      if (binIdx < 0) binIdx = 0;
      if (bins[binIdx]) bins[binIdx].count++;
    });

    return bins;
  }, [results]);

  // Actual vs Predicted Stats
  const actualVsPredictedData = useMemo(() => {
    if (!results || !results.actuals || !results.predictions) return [];
    return results.actuals.map((act, idx) => ({
      actual: act,
      predicted: results.predictions[idx]
    }));
  }, [results]);

  const scatterDiagonalSegment = useMemo(() => {
    if (!results || !results.actuals) return [];
    const acts = results.actuals || [];
    const preds = results.predictions || [];
    const all = [...acts, ...preds];
    if (all.length === 0) return { min: 0, max: 1 };
    return {
      min: Math.min(...all),
      max: Math.max(...all)
    };
  }, [results]);

  // Unprocessed Empty State Loader
  if (!anomalyReport) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundColor: '#fef9ef', textAlign: 'center', padding: '32px' }}>
        <div style={{ padding: '16px', backgroundColor: '#ffe45e', border: '2px solid black', marginBottom: '16px', transform: 'rotate(-3deg)', boxShadow: '4px 4px 0px #000' }}>
          <Database size={40} className="text-black" />
        </div>
        <h2 className="text-2xl font-black text-black uppercase">NO DATASET AVAILABLE</h2>
        <p className="text-sm font-bold text-gray-600 mt-2 max-w-md uppercase">
          PLEASE UPLOAD AND CLEANSE YOUR DATASET INSIDE THE "DATA PREP & CLEANING" WORKSPACE FIRST.
        </p>
      </div>
    );
  }

  // Algorithm selectors per task
  const renderAlgorithmOptions = () => {
    if (task === 'classification') {
      return (
        <>
          <option value="knn">K-NEAREST NEIGHBORS (KNN)</option>
          <option value="decision_tree">DECISION TREE</option>
          <option value="svm">SUPPORT VECTOR MACHINE (SVM)</option>
        </>
      );
    } else if (task === 'regression') {
      return (
        <>
          <option value="linear_regression">LINEAR REGRESSION</option>
          <option value="random_forest_regressor">RANDOM FOREST REGRESSOR</option>
        </>
      );
    } else {
      return (
        <>
          <option value="kmeans">K-MEANS</option>
        </>
      );
    }
  };

  const inputClass = "w-full border-2 border-black p-2 font-bold uppercase text-xs bg-[#fef9ef] focus:outline-none focus:bg-[#fff5ba]";
  const selectClass = "w-full border-2 border-black p-2 font-bold uppercase text-xs bg-[#fef9ef] focus:outline-none cursor-pointer";
  const labelClass = "block text-[10px] font-black uppercase text-gray-500 mb-1 tracking-wider";

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .pulse-box {
          animation: pulse 1s infinite ease-in-out;
        }
      `}</style>

      <div className="flex flex-col md:flex-row flex-1 w-full min-h-0 overflow-y-auto md:overflow-hidden bg-[#fef9ef]">

      {/* ── LEFT COLUMN: MODEL CONFIGURATION ── */}
      <aside className="w-full md:w-[340px] md:min-w-[340px] shrink-0 border-b-2 md:border-b-0 md:border-r-2 border-black bg-white flex flex-col overflow-y-auto select-none">
        
        {/* Sidebar Header */}
        <div className="p-4 bg-black text-white flex items-center gap-3 shrink-0">
          <BrainCircuit size={24} className="text-[#ffe45e]" strokeWidth={2.5} />
          <h2 className="font-black text-sm uppercase tracking-wider">MODEL CONFIGURATION</h2>
        </div>

        {/* Form Fields container */}
        <div className="p-4 flex-1 space-y-6">

          {/* STEP 1: TASK TYPE */}
          <div className="space-y-2">
            <h4 className="font-black text-xs uppercase tracking-wider text-black">STEP 1 — TASK TYPE</h4>
            <div className="grid grid-cols-3 border-2 border-black">
              {[
                { id: 'classification', label: 'CLASSIFY', icon: <Target size={14} /> },
                { id: 'regression', label: 'REGRESS', icon: <TrendingUp size={14} /> },
                { id: 'clustering', label: 'CLUSTER', icon: <Share2 size={14} /> }
              ].map(t => {
                const isActive = task === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTaskChange(t.id)}
                    className={`py-3 text-[9px] font-black uppercase flex flex-col items-center justify-center gap-1 transition-colors border-r last:border-r-0 border-black ${
                      isActive 
                        ? 'bg-black text-white' 
                        : 'bg-white text-black hover:bg-gray-100'
                    }`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: ALGORITHM */}
          <div className="space-y-2">
            <h4 className="font-black text-xs uppercase tracking-wider text-black">STEP 2 — ALGORITHM</h4>
            <select 
              value={algorithm} 
              onChange={handleAlgorithmChange}
              className={selectClass}
            >
              {renderAlgorithmOptions()}
            </select>
          </div>

          {/* STEP 3: HYPERPARAMETERS */}
          <div className="space-y-2 border-t-2 border-dashed border-gray-200 pt-4">
            <h4 className="font-black text-xs uppercase tracking-wider text-black">STEP 3 — HYPERPARAMETERS</h4>
            <div className="space-y-3 bg-[#fef9ef]/40 p-3 border border-black">
              
              {algorithm === 'knn' && (
                <>
                  <div>
                    <label className={labelClass}>K (NEIGHBORS)</label>
                    <input type="number" min="1" max="50" value={kNeighbors} onChange={e => setKNeighbors(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>WEIGHTS</label>
                    <select value={weights} onChange={e => setWeights(e.target.value)} className={selectClass}>
                      <option value="uniform">UNIFORM</option>
                      <option value="distance">DISTANCE</option>
                    </select>
                  </div>
                </>
              )}

              {(algorithm === 'decision_tree' || algorithm === 'decision_tree_regressor') && (
                <>
                  <div>
                    <label className={labelClass}>MAX DEPTH</label>
                    <input type="number" min="1" max="50" value={maxDepth || ''} onChange={e => setMaxDepth(e.target.value)} placeholder="UNLIMITED" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>MIN SAMPLES SPLIT</label>
                    <input type="number" min="2" max="20" value={minSamplesSplit} onChange={e => setMinSamplesSplit(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>CRITERION</label>
                    {task === 'classification' ? (
                      <select value={criterion} onChange={e => setCriterion(e.target.value)} className={selectClass}>
                        <option value="gini">GINI INDEX</option>
                        <option value="entropy">ENTROPY</option>
                      </select>
                    ) : (
                      <select value={criterion} onChange={e => setCriterion(e.target.value)} className={selectClass}>
                        <option value="squared_error">SQUARED ERROR</option>
                        <option value="absolute_error">ABSOLUTE ERROR</option>
                      </select>
                    )}
                  </div>
                </>
              )}

              {(algorithm === 'random_forest' || algorithm === 'random_forest_regressor') && (
                <>
                  <div>
                    <label className={labelClass}>N ESTIMATORS (TREES)</label>
                    <input type="number" min="10" max="500" value={nEstimators} onChange={e => setNEstimators(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>MAX DEPTH</label>
                    <input type="number" min="1" max="50" value={maxDepth || ''} onChange={e => setMaxDepth(e.target.value)} placeholder="UNLIMITED" className={inputClass} />
                  </div>
                </>
              )}

              {algorithm === 'svm' && (
                <>
                  <div>
                    <label className={labelClass}>C (REGULARIZATION)</label>
                    <input type="number" min="0.01" max="100" step="0.01" value={svmC} onChange={e => setSvmC(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>KERNEL</label>
                    <select value={svmKernel} onChange={e => setSvmKernel(e.target.value)} className={selectClass}>
                      <option value="rbf">RBF (GAUSSIAN)</option>
                      <option value="linear">LINEAR</option>
                      <option value="poly">POLYNOMIAL</option>
                      <option value="sigmoid">SIGMOID</option>
                    </select>
                  </div>
                </>
              )}

              {algorithm === 'logistic_regression' && (
                <>
                  <div>
                    <label className={labelClass}>C (REGULARIZATION)</label>
                    <input type="number" min="0.01" max="100" step="0.01" value={logRegC} onChange={e => setLogRegC(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>MAX ITERATIONS</label>
                    <input type="number" min="50" max="1000" value={maxIter} onChange={e => setMaxIter(e.target.value)} className={inputClass} />
                  </div>
                </>
              )}

              {algorithm === 'naive_bayes' && (
                <div className="bg-white border-2 border-black p-3 text-[10px] uppercase font-bold text-gray-600">
                  NAIVE BAYES USES NO HYPERPARAMETERS. IT LEARNS AUTOMATICALLY FROM YOUR DATA.
                </div>
              )}

              {algorithm === 'linear_regression' && (
                <div>
                  <label className={labelClass}>FIT INTERCEPT</label>
                  <button 
                    onClick={() => setFitIntercept(!fitIntercept)}
                    className={`w-full py-2 border-2 border-black font-black uppercase text-xs transition-colors ${
                      fitIntercept ? 'bg-[#ffe45e] text-black' : 'bg-white text-black'
                    }`}
                  >
                    {fitIntercept ? 'ON' : 'OFF'}
                  </button>
                </div>
              )}

              {(algorithm === 'ridge_regression' || algorithm === 'lasso_regression') && (
                <div>
                  <label className={labelClass}>ALPHA (PENALTY CONSTANT)</label>
                  <input 
                    type="number" 
                    min="0.01" 
                    max="100" 
                    step="0.01" 
                    value={algorithm === 'ridge_regression' ? ridgeAlpha : lassoAlpha} 
                    onChange={e => algorithm === 'ridge_regression' ? setRidgeAlpha(e.target.value) : setLassoAlpha(e.target.value)} 
                    className={inputClass} 
                  />
                </div>
              )}

              {algorithm === 'kmeans' && (
                <>
                  <div>
                    <label className={labelClass}>N CLUSTERS</label>
                    <input type="number" min="2" max="20" value={nClusters} onChange={e => setNClusters(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>MAX ITERATIONS</label>
                    <input type="number" min="50" max="1000" value={maxIter} onChange={e => setMaxIter(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>INIT METHOD</label>
                    <select value={kmeansInit} onChange={e => setKmeansInit(e.target.value)} className={selectClass}>
                      <option value="k-means++">K-MEANS++</option>
                      <option value="random">RANDOM</option>
                    </select>
                  </div>
                </>
              )}

              {algorithm === 'dbscan' && (
                <>
                  <div>
                    <label className={labelClass}>EPSILON (RADIUS)</label>
                    <input type="number" min="0.01" max="10" step="0.01" value={dbscanEps} onChange={e => setDbscanEps(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>MIN SAMPLES</label>
                    <input type="number" min="2" max="50" value={dbscanMinSamples} onChange={e => setDbscanMinSamples(e.target.value)} className={inputClass} />
                  </div>
                </>
              )}

              {algorithm === 'agglomerative_clustering' && (
                <>
                  <div>
                    <label className={labelClass}>N CLUSTERS</label>
                    <input type="number" min="2" max="20" value={nClusters} onChange={e => setNClusters(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>LINKAGE LINK</label>
                    <select value={aggLinkage} onChange={e => setAggLinkage(e.target.value)} className={selectClass}>
                      <option value="ward">WARD</option>
                      <option value="complete">COMPLETE</option>
                      <option value="average">AVERAGE</option>
                      <option value="single">SINGLE</option>
                    </select>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* STEP 4: FEATURE COLUMNS (X) */}
          {task !== 'clustering' ? (
            <div className="space-y-2 border-t-2 border-dashed border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <h4 className="font-black text-xs uppercase tracking-wider text-black">STEP 4 — FEATURE COLUMNS (X)</h4>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">SELECT INPUT FEATURES</p>
                </div>
                <button 
                  onClick={handleSelectAllFeatures}
                  className="px-2 py-1 bg-[#ffe45e] border-2 border-black font-black uppercase text-[9px]"
                >
                  SELECT ALL
                </button>
              </div>
              
              <div className="border-2 border-black max-h-44 overflow-y-auto bg-white select-none">
                {numericColumns.length === 0 ? (
                  <p className="p-3 text-[10px] font-bold text-gray-400 uppercase">NO NUMERIC COLUMNS DETECTED</p>
                ) : (
                  numericColumns.map(col => {
                    const isChecked = featureCols.includes(col);
                    const dtype = anomalyReport?.columns[col]?.inferred_type || 'float';
                    return (
                      <div 
                        key={col} 
                        onClick={() => toggleFeature(col)}
                        className="flex items-center justify-between border-b border-black last:border-b-0 px-3 py-2 cursor-pointer hover:bg-[#ffe45e]/20"
                      >
                        <div className="flex items-center gap-3">
                          {/* Custom Checkbox */}
                          <div className={`w-4 h-4 border-2 border-black flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-[#ffe45e]' : 'bg-white'
                          }`}>
                            {isChecked && <div className="w-1.5 h-1.5 bg-black" />}
                          </div>
                          <span className="font-bold text-xs uppercase tracking-wide truncate max-w-[150px]">{col}</span>
                        </div>
                        <span className="px-1 py-0.5 border border-black bg-black text-white font-mono text-[8px] uppercase select-none">
                          {dtype}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                {featureCols.length} OF {numericColumns.length} COLUMNS SELECTED
              </p>
            </div>
          ) : (
            <div className="bg-black text-white p-3 text-[10px] uppercase font-bold tracking-wider border-2 border-black">
              ✦ CLUSTERING DETECTED: ALL {numericColumns.length} NUMERIC FEATURES ARE AUTOMATICALLY PASSED AS MODELS TRAIN WITHOUT AN EXPLICIT TARGET VARIABLE.
            </div>
          )}

          {/* STEP 5: TARGET COLUMN (Y) */}
          {task !== 'clustering' && (
            <div className="space-y-2 border-t-2 border-dashed border-gray-200 pt-4">
              <h4 className="font-black text-xs uppercase tracking-wider text-black">STEP 5 — TARGET COLUMN (Y)</h4>
              <select 
                value={targetCol}
                onChange={handleTargetChange}
                className={selectClass}
              >
                <option value="">- CHOOSE TARGET -</option>
                {allColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>
          )}

          {/* STEP 6: TRAIN/TEST SPLIT */}
          {task !== 'clustering' && (
            <div className="space-y-2 border-t-2 border-dashed border-gray-200 pt-4">
              <h4 className="font-black text-xs uppercase tracking-wider text-black">STEP 6 — TRAIN / TEST SPLIT</h4>
              <div className="flex justify-between font-black text-[10px] uppercase tracking-wider">
                <span>{splitVal}% TRAIN</span>
                <span>{100 - splitVal}% TEST</span>
              </div>
              <input 
                type="range"
                min="50"
                max="90"
                value={splitVal}
                onChange={(e) => setSplitVal(Number(e.target.value))}
                className="w-full accent-black h-2 bg-black rounded-none appearance-none cursor-pointer border-2 border-black"
              />
            </div>
          )}

          {/* ACTION BUTTON */}
          <div className="pt-4">
            <button
              onClick={handleRunModel}
              disabled={isLoading}
              className="w-full py-4 bg-[#ffe45e] border-[3px] border-black font-black uppercase text-sm tracking-widest shadow-[6px_6px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[7px_7px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader size={18} className="animate-spin text-black" />
                  <span>⟳ TRAINING...</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  <span>▶ RUN MODEL</span>
                </>
              )}
            </button>
          </div>

        </div>
      </aside>

      {/* ── RIGHT COLUMN: RESULTS CANVAS ── */}
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto bg-[#fef9ef]">
        
        {/* Error bar */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-[#ff499e]/20 border-[3px] border-black shadow-[4px_4px_0px_#000] text-black font-bold uppercase text-xs mb-8">
            <AlertCircle size={20} className="shrink-0 text-black" strokeWidth={3} />
            <div>{error}</div>
          </div>
        )}

        {/* ── CASE A: EMPTY STATE ── */}
        {!results && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
            <div className="p-6 bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] mb-6 animate-bounce">
              <Cpu size={72} strokeWidth={2.5} className="text-black" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-wider text-black">NO MODEL TRAINED YET</h3>
            <p className="text-sm font-bold text-gray-500 uppercase mt-2 max-w-sm text-center">
              CONFIGURE YOUR MODEL PIPELINE CONTROLS ON THE LEFT SIDE AND HIT "RUN MODEL".
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-3xl mt-12 select-none">
              {[
                { icon: <Target size={28} />, title: 'ACCURACY METRICS', desc: 'INSTANT WEIGHTED CRITERION CALCULATIONS AND SCORES.' },
                { icon: <Layers size={28} />, title: 'VISUAL CHARTS', desc: 'ACTUAL VS PREDICTED Cartesian plots and residual bars.' },
                { icon: <Brain size={28} />, title: 'PREDICTION PANEL', desc: 'AUTOFILLED REAL-TIME ESTIMATION TESTING RIGS.' }
              ].map(card => (
                <div key={card.title} className="bg-white border-[3px] border-black p-5 shadow-[4px_4px_0px_#000] flex flex-col justify-between">
                  <div className="w-12 h-12 border-2 border-black flex items-center justify-center bg-[#ffe45e] mb-4">
                    {card.icon}
                  </div>
                  <div>
                    <h5 className="font-black text-xs uppercase leading-tight mb-2">{card.title}</h5>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CASE B: LOADING STATE ── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[500px] select-none">
            <div className="w-16 h-16 bg-black border-4 border-black pulse-box mb-6 shadow-[4px_4px_0px_#ffe45e]" />
            <h3 className="text-2xl font-black uppercase tracking-wider text-black">TRAINING MODEL...</h3>
            <p className="text-sm font-bold text-gray-500 uppercase mt-1">THIS PROCESS WILL TAKE ONLY A FEW SECONDS.</p>
          </div>
        )}

        {/* ── CASE C: RESULTS STATE ── */}
        {results && !isLoading && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-300">
            
            {/* SECTION A — MODEL SUMMARY CARD */}
            <div className="bg-white border-[3px] border-black p-4 md:p-6 shadow-[6px_6px_0px_#000] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-black uppercase tracking-tight text-black">{results.algorithm}</h2>
                  <span className="px-3 py-1 bg-[#ffe45e] border-2 border-black text-black font-black uppercase text-[10px] tracking-wider">
                    {results.task_type}
                  </span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                  TRAINING DURATION: <span className="text-black">{results.training_time_ms} MS</span>
                </p>
              </div>
              <div className="text-right border-l-[3px] border-black pl-6 hidden sm:block">
                <p className="font-black text-sm uppercase text-black leading-tight">DATASET COMPOSITION</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">
                  {results.train_size || results.total_rows} ROWS · {results.feature_bounds ? Object.keys(results.feature_bounds).length : 0} FEATURES
                </p>
              </div>
            </div>

            {/* divider line */}
            <div className="border-t-[3px] border-black my-8" />

            {/* ── CLASSIFICATION RESULTS INTERFACE ── */}
            {results.task_type === 'classification' && (
              <div className="space-y-10">
                
                {/* SECTION B — METRICS GRID */}
                <div className="space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-wider text-black">SECTION B — PERFORMANCE SCOREBOARD</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {[
                      { label: 'ACCURACY', val: `${results.accuracy}%`, color: 'bg-[#ffe45e]' },
                      { label: 'PRECISION', val: `${results.precision}%`, color: 'bg-white' },
                      { label: 'RECALL', val: `${results.recall}%`, color: 'bg-white' },
                      { label: 'F1 SCORE', val: `${results.f1}%`, color: 'bg-white' }
                    ].map(metric => (
                      <div key={metric.label} className={`border-[2px] border-black p-4 shadow-[4px_4px_0px_#000] flex flex-col justify-between h-28 ${metric.color}`}>
                        <span className="text-[10px] font-black uppercase text-gray-500">{metric.label}</span>
                        <span className="text-3xl font-black tracking-tight font-mono">{metric.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION C — CONFUSION MATRIX */}
                <div className="space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-wider text-black">SECTION C — CONFUSION MATRIX MATRIX</h4>
                  <div className="bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_#000] overflow-x-auto">
                    
                    <div className="flex flex-col items-center min-w-[350px] relative pb-6 select-none">
                      <div className="font-black text-xs uppercase text-gray-500 mb-6 tracking-widest text-center">PREDICTED</div>
                      <div className="flex w-full items-center">
                        <div className="font-black text-xs uppercase text-gray-500 mr-8 tracking-widest text-center rotate-180" style={{ writingMode: 'vertical-rl' }}>
                          ACTUAL
                        </div>
                        <div className="flex-1">
                          
                          {/* Column Headers */}
                          <div className="grid grid-cols-5 gap-2 mb-2">
                            <div className="col-span-1" />
                            {results.classes.map(cls => (
                              <div key={cls} className="text-center font-black text-[9px] uppercase tracking-wider truncate" title={cls}>
                                {cls}
                              </div>
                            ))}
                          </div>

                          {/* Confusion Matrix Rows */}
                          <div className="space-y-2">
                            {results.confusion_matrix.map((row, rIdx) => {
                              const actualClass = results.classes[rIdx];
                              const maxRowVal = Math.max(...row) || 1;
                              return (
                                <div key={rIdx} className="grid grid-cols-5 gap-2 items-center">
                                  <div className="font-black text-[9px] uppercase tracking-wider text-right pr-2 truncate" title={actualClass}>
                                    {actualClass}
                                  </div>
                                  {row.map((cellVal, cIdx) => {
                                    const isDiagonal = rIdx === cIdx;
                                    const opacity = cellVal / maxRowVal;
                                    const cellStyle = isDiagonal
                                      ? { backgroundColor: '#ffe45e' }
                                      : { backgroundColor: `rgba(255, 73, 158, ${Math.max(0.15, opacity)})` };

                                    return (
                                      <div 
                                        key={cIdx} 
                                        style={cellStyle}
                                        className="h-12 border-2 border-black flex items-center justify-center font-black text-sm font-mono shadow-[2px_2px_0px_#000]"
                                        title={`Actual: ${actualClass} · Predicted: ${results.classes[cIdx]} · Count: ${cellVal}`}
                                      >
                                        {cellVal}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* SECTION D — CLASSIFICATION REPORT TABLE */}
                <div className="space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-wider text-black">SECTION D — CLASSIFICATION REPORT REPORT</h4>
                  <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] overflow-x-auto select-none">
                    <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                      <thead>
                        <tr className="bg-black text-white border-b-2 border-black">
                          <th className="p-3 font-black uppercase tracking-wider">CLASS</th>
                          <th className="p-3 font-black uppercase tracking-wider">PRECISION</th>
                          <th className="p-3 font-black uppercase tracking-wider">RECALL</th>
                          <th className="p-3 font-black uppercase tracking-wider">F1-SCORE</th>
                          <th className="p-3 font-black uppercase tracking-wider">SUPPORT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.classes.map((cls, idx) => {
                          const classStats = results.classification_report[cls] || {};
                          const f1Val = classStats["f1-score"] !== undefined ? classStats["f1-score"] : classStats.f1_score;
                          return (
                            <tr key={cls} className={`border-b border-black last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fef9ef]/30'}`}>
                              <td className="p-3 font-black uppercase">{cls}</td>
                              <td className="p-3 font-mono font-bold">{formatPct(classStats.precision)}</td>
                              <td className="p-3 font-mono font-bold">{formatPct(classStats.recall)}</td>
                              <td className="p-3 font-mono font-bold">{formatPct(f1Val)}</td>
                              <td className="p-3 font-mono font-bold">{classStats.support}</td>
                            </tr>
                          );
                        })}
                        {/* Weighted avg summary row */}
                        {results.classification_report["weighted avg"] && (() => {
                          const wAvg = results.classification_report["weighted avg"];
                          const wF1 = wAvg["f1-score"] !== undefined ? wAvg["f1-score"] : wAvg.f1_score;
                          return (
                            <tr className="bg-[#ffe45e] border-t-2 border-black font-black">
                              <td className="p-3 uppercase">WEIGHTED AVERAGE</td>
                              <td className="p-3 font-mono">{formatPct(wAvg.precision)}</td>
                              <td className="p-3 font-mono">{formatPct(wAvg.recall)}</td>
                              <td className="p-3 font-mono">{formatPct(wF1)}</td>
                              <td className="p-3 font-mono">{wAvg.support}</td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ── REGRESSION RESULTS INTERFACE ── */}
            {results.task_type === 'regression' && (
              <div className="space-y-10">
                
                {/* SECTION B — METRICS GRID */}
                <div className="space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-wider text-black">SECTION B — REGRESSION SCOREBOARD</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {[
                      { label: 'R² SCORE (VARIANCE)', val: results.r2, color: 'bg-[#ffe45e]' },
                      { label: 'MEAN ABSOLUTE ERROR', val: results.mae, color: 'bg-white' },
                      { label: 'MEAN SQUARED ERROR', val: results.mse, color: 'bg-white' },
                      { label: 'ROOT MEAN SQUARED ERROR', val: results.rmse, color: 'bg-white' }
                    ].map(metric => (
                      <div key={metric.label} className={`border-[2px] border-black p-4 shadow-[4px_4px_0px_#000] flex flex-col justify-between h-28 ${metric.color}`}>
                        <span className="text-[10px] font-black uppercase text-gray-500">{metric.label}</span>
                        <span className="text-3xl font-black tracking-tight font-mono">{metric.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION C — ACTUAL VS PREDICTED CHART */}
                <div className="space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-wider text-black">SECTION C — ACTUAL VS PREDICTED SCATTER</h4>
                  <div className="bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_#000]">
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis type="number" dataKey="actual" name="ACTUAL" stroke="black" style={{ fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis type="number" dataKey="predicted" name="PREDICTED" stroke="black" style={{ fontSize: 10, fontWeight: 'bold' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'white', border: '3px solid black', boxShadow: '4px 4px 0px #000', borderRadius: 0 }}
                            itemStyle={{ fontWeight: 'black', textTransform: 'uppercase', fontSize: 10 }}
                          />
                          <ReferenceLine 
                            segment={[
                              { x: scatterDiagonalSegment.min, y: scatterDiagonalSegment.min },
                              { x: scatterDiagonalSegment.max, y: scatterDiagonalSegment.max }
                            ]} 
                            stroke="black" 
                            strokeDasharray="4 4" 
                            strokeWidth={3} 
                          />
                          <Scatter name="PREDICTIONS" data={actualVsPredictedData} fill="#ffe45e" stroke="black" strokeWidth={1.5} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[9px] font-black uppercase text-gray-400 mt-2 text-center">
                      THE CLOSER THE SCATTER DOTS ALIGN TO THE DIAGONAL REFERENCE LINE, THE MORE HIGHER THE MODEL ACCURACY.
                    </p>
                  </div>
                </div>

                {/* SECTION D — RESIDUALS CHART */}
                <div className="space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-wider text-black">SECTION D — RESIDUALS DISTRIBUTION HISTOGRAM</h4>
                  <div className="bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_#000]">
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={residualBins}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis dataKey="binLabel" stroke="black" style={{ fontSize: 8, fontWeight: 'bold' }} />
                          <YAxis stroke="black" style={{ fontSize: 10, fontWeight: 'bold' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'white', border: '3px solid black', boxShadow: '4px 4px 0px #000', borderRadius: 0 }}
                            itemStyle={{ fontWeight: 'black', fontSize: 10 }}
                          />
                          <Bar dataKey="count" fill="#ffe45e" stroke="black" strokeWidth={2}>
                            {residualBins.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#ffe45e' : '#00f0ff'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ── CLUSTERING RESULTS INTERFACE ── */}
            {results.task_type === 'clustering' && (
              <div className="space-y-10">
                
                {/* SECTION B — METRICS GRID */}
                <div className="space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-wider text-black">SECTION B — CLUSTERING SCOREBOARD</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    
                    <div className="border-[2px] border-black p-4 shadow-[4px_4px_0px_#000] flex flex-col justify-between h-28 bg-white">
                      <span className="text-[10px] font-black uppercase text-gray-500">WCSS INERTIA (LOWER = TIGHTER CLUSTERS)</span>
                      <span className="text-3xl font-black tracking-tight font-mono">
                        {results.inertia !== null ? results.inertia.toLocaleString() : 'N/A'}
                      </span>
                    </div>

                    {(() => {
                      const score = results.silhouette_score;
                      let ratingColor = 'bg-[#ff499e]'; // pink if < 0.2
                      if (score > 0.5) ratingColor = 'bg-green-300';
                      else if (score >= 0.2) ratingColor = 'bg-[#ffe45e]'; // yellow

                      return (
                        <div className={`border-[2px] border-black p-4 shadow-[4px_4px_0px_#000] flex flex-col justify-between h-28 ${ratingColor}`}>
                          <span className="text-[10px] font-black uppercase text-black">SILHOUETTE SCORE (-1 TO 1, HIGHER IS BETTER)</span>
                          <span className="text-3xl font-black tracking-tight font-mono">{score}</span>
                        </div>
                      );
                    })()}

                  </div>
                </div>

                {/* SECTION C — CLUSTER DISTRIBUTION CHART */}
                <div className="space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-wider text-black">SECTION C — CLUSTER SIZE DISTRIBUTION</h4>
                  <div className="bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_#000]">
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={results.cluster_summary}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis dataKey="cluster" stroke="black" style={{ fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis stroke="black" style={{ fontSize: 10, fontWeight: 'bold' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'white', border: '3px solid black', boxShadow: '4px 4px 0px #000', borderRadius: 0 }}
                            itemStyle={{ fontWeight: 'black', fontSize: 10 }}
                          />
                          <Bar dataKey="size" fill="#ffe45e" stroke="black" strokeWidth={2}>
                            {results.cluster_summary.map((entry, index) => {
                              const palette = ['#ffe45e', '#00f0ff', '#ff499e', '#ff8c00', '#000000'];
                              const color = palette[index % palette.length];
                              return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* SECTION D — CLUSTER SUMMARY TABLE */}
                <div className="space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-wider text-black">SECTION D — CLUSTER PROFILE PROPORTIONS</h4>
                  <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] overflow-x-auto select-none">
                    <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                      <thead>
                        <tr className="bg-black text-white border-b-2 border-black">
                          <th className="p-3 font-black uppercase tracking-wider">CLUSTER</th>
                          <th className="p-3 font-black uppercase tracking-wider">SIZE</th>
                          <th className="p-3 font-black uppercase tracking-wider">% OF DATA</th>
                          {/* Dynamic column headers for means */}
                          {numericColumns.map(col => (
                            <th key={col} className="p-3 font-black uppercase tracking-wider truncate max-w-[120px]" title={col}>
                              {col} (MEAN)
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.cluster_summary.map((row, idx) => (
                          <tr key={row.cluster} className={`border-b border-black last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fef9ef]/30'}`}>
                            <td className="p-3 font-black uppercase">{row.cluster}</td>
                            <td className="p-3 font-mono font-bold">{row.size}</td>
                            <td className="p-3 font-mono font-bold">{row.percent}%</td>
                            {numericColumns.map(col => (
                              <td key={col} className="p-3 font-mono">
                                {row[col] !== undefined ? row[col].toFixed(3) : 'N/A'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* divider line */}
            <div className="border-t-[3px] border-black my-8" />

            {/* ── SECTION E: PREDICTION PANEL (Classification & Regression only) ── */}
            {results.task_type !== 'clustering' && (
              <div className="space-y-4 border-[3px] border-black p-6 bg-white shadow-[6px_6px_0px_#000] select-none">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-black text-base uppercase tracking-wider text-black">SECTION E — MAKE A PREDICTION</h3>
                    <p className="text-[10px] font-black uppercase text-gray-500">ENTER REAL-TIME ESTIMATES TO EVALUATE YOUR TRAINED MODEL</p>
                  </div>
                  <button 
                    onClick={handleAutofill}
                    className="px-4 py-2 bg-[#00f0ff] border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                  >
                    ⚡ AUTOFILL FEATURES
                  </button>
                </div>

                {/* Input Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                  {featureCols.map(col => {
                    const bounds = storedBounds[col] || { min: 0.0, max: 1.0 };
                    return (
                      <div key={col} className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-black truncate block tracking-wide" title={col}>
                          {col}
                        </label>
                        <input 
                          type="number"
                          step="any"
                          value={predictionInputs[col] || ''}
                          onChange={(e) => setPredictionInputs(prev => ({ ...prev, [col]: e.target.value }))}
                          placeholder="0.0"
                          className={inputClass}
                        />
                        <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                          MIN: {bounds.min.toFixed(2)} · MAX: {bounds.max.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Submit button */}
                <div className="pt-4">
                  <button 
                    onClick={handlePredict}
                    disabled={predictLoading}
                    className="w-full py-3 bg-black text-white font-black uppercase text-sm tracking-widest shadow-[4px_4px_0px_#ffe45e] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {predictLoading ? (
                      <>
                        <Loader size={16} className="animate-spin text-white" />
                        <span>PROCESSING...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ PREDICT RESULT</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Inference Error Notification */}
                {predictError && (
                  <div className="mt-4 p-3 bg-[#ff499e]/20 border-2 border-black font-bold uppercase text-[10px] text-black">
                    {predictError}
                  </div>
                )}

                {/* Prediction Results Banner */}
                {predictionResult && (
                  <div className="mt-6 bg-[#ffe45e] border-[3px] border-black p-5 shadow-[6px_6px_0px_#000] flex items-center justify-between animate-in zoom-in-95 duration-200">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-black/60 tracking-wider">PREDICTOR LOG OUTPUT RESULT</span>
                      <h4 className="text-4xl font-black uppercase tracking-tight text-black font-mono">
                        {results.task_type === 'regression' 
                          ? Number(predictionResult.prediction).toFixed(4)
                          : predictionResult.prediction
                        }
                      </h4>
                    </div>
                    {predictionResult.confidence !== undefined && (
                      <div className="text-right border-l-2 border-black/20 pl-6">
                        <span className="text-[9px] font-black uppercase text-black/60 tracking-wider">PROBABILITY CONFIDENCE</span>
                        <p className="text-xl font-black font-mono mt-1">{(predictionResult.confidence * 100).toFixed(1)}%</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </main>
    </div>
  </div>
  );
};

export default MLStudio;
