import React, { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Network, Play, Loader, AlertCircle, CheckCircle2,
  Plus, Trash2, Cpu, Target, TrendingUp, GripVertical, Info, RefreshCw, Zap
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { trainDL, getDLStatus, predictDL, getDLFeatureBounds, getFeaturesInfo, getFullDataset } from '../../api/client';

const DLStudio = ({ anomalyReport, config = {}, setConfig }) => {
  // Pull state safe options
  const taskType = config.task_type || 'classification';
  const featureCols = config.feature_cols || [];
  const targetCol = config.target_col || '';
  const results = config.results || null;
  const layers = config.layers || [
    { neurons: 64, activation: 'ReLU', dropout: 0.0 },
    { neurons: 32, activation: 'ReLU', dropout: 0.0 }
  ];
  
  // Custom training parameter states
  const [epochs, setEpochs] = useState(50);
  const [batchSize, setBatchSize] = useState(32);
  const [learningRate, setLearningRate] = useState(0.001);
  const [optimizer, setOptimizer] = useState('Adam');
  const [validationSplit, setValidationSplit] = useState(20);
  const [testSize, setTestSize] = useState(20); // 80% train, 20% test by default (test_size = 20)

  // Real-time states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Real-time training progress polling state
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [liveMetrics, setLiveMetrics] = useState([]); // [{epoch, loss, val_loss, accuracy, val_accuracy}]
  const pollTimerRef = useRef(null);

  // Prediction states
  const [predictionInputs, setPredictionInputs] = useState({});
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictResult, setPredictResult] = useState(null);
  const [predictError, setPredictError] = useState(null);
  const [storedBounds, setStoredBounds] = useState(null);

  // Extract columns (stored as full column objects {name, dtype})
  const [allColumns, setAllColumns] = useState([]);

  useEffect(() => {
    const fetchColumns = async () => {
      try {
        // Try features/info first
        const data = await getFeaturesInfo();
        
        // data.columns is [{name, dtype}, ...]
        if (data.columns && Array.isArray(data.columns) 
            && data.columns.length > 0) {
          // Check if it's [{name, dtype}] format
          if (typeof data.columns[0] === 'object' && data.columns[0].name) {
            setAllColumns(data.columns); // already correct format
            console.log('Columns loaded:', data.columns);
          } 
          // Check if it's just ["col1", "col2"] string array
          else if (typeof data.columns[0] === 'string') {
            const parsed = data.columns.map(name => ({ name, dtype: 'unknown' }));
            setAllColumns(parsed);
            console.log('Columns loaded:', parsed);
          }
        } else {
          throw new Error('No columns in response');
        }
      } catch (err1) {
        try {
          // Fallback: use /api/export
          const rows = await getFullDataset();
          if (rows && rows.length > 0) {
            // Get column names from first row's keys
            const cols = Object.keys(rows[0]).map(name => ({
              name,
              dtype: 'unknown'
            }));
            setAllColumns(cols);
            console.log('Columns loaded:', cols);
          }
        } catch (err) {
          console.error('Could not load columns:', err);
        }
      }
    };
    fetchColumns();
  }, []);

  // Load bounds on component mount or results change
  useEffect(() => {
    if (results && results.feature_bounds) {
      setStoredBounds(results.feature_bounds);
    } else {
      getDLFeatureBounds()
        .then(data => {
          if (data && data.bounds) {
            setStoredBounds(data.bounds);
          }
        })
        .catch(() => {});
    }
  }, [results]);

  // Set default prediction input fields
  useEffect(() => {
    if (featureCols.length > 0) {
      const inputs = {};
      featureCols.forEach(col => {
        inputs[col] = '';
      });
      setPredictionInputs(inputs);
    }
  }, [featureCols]);

  // Update target column when task changes (regression target must be numeric, classification can be anything)
  const handleTaskTypeChange = (type) => {
    setConfig(prev => ({
      ...prev,
      task_type: type,
      target_col: '', // clear target
      results: null   // reset results
    }));
    setError(null);
    setLiveMetrics([]);
    setCurrentEpoch(0);
  };

  // Select all feature columns
  const handleSelectAllFeatures = () => {
    const list = allColumns.map(c => c.name).filter(name => name !== targetCol);
    setConfig(prev => ({
      ...prev,
      feature_cols: list
    }));
  };

  // Toggle feature column selection
  const handleToggleFeature = (col) => {
    if (col === targetCol) return;
    const isSelected = featureCols.includes(col);
    const updated = isSelected 
      ? featureCols.filter(c => c !== col) 
      : [...featureCols, col];
    
    setConfig(prev => ({
      ...prev,
      feature_cols: updated
    }));
  };

  // Select target column
  const handleSelectTarget = (e) => {
    const val = e.target.value;
    setConfig(prev => ({
      ...prev,
      target_col: val,
      // Exclude target from features
      feature_cols: prev.feature_cols?.filter(c => c !== val) || []
    }));
    setError(null);
  };

  // Target Column Characteristics & Output Info Card calculation
  const targetMeta = useMemo(() => {
    if (!targetCol || !anomalyReport || !anomalyReport.features) return null;
    const feat = anomalyReport.features[targetCol];
    if (!feat) return null;
    
    const uniqueCount = feat.unique_values || 2; // fallback to 2
    if (taskType === 'classification') {
      if (uniqueCount <= 2) {
        return {
          neurons: 1,
          activation: 'SIGMOID',
          loss: 'BINARY CROSSENTROPY',
          desc: 'OUTPUT: 1 NEURON · SIGMOID · BINARY CROSSENTROPY'
        };
      } else {
        return {
          neurons: uniqueCount,
          activation: 'SOFTMAX',
          loss: 'CATEGORICAL CROSSENTROPY',
          desc: `OUTPUT: ${uniqueCount} NEURONS · SOFTMAX · CATEGORICAL CROSSENTROPY`
        };
      }
    } else {
      return {
        neurons: 1,
        activation: 'LINEAR',
        loss: 'MEAN SQUARED ERROR',
        desc: 'OUTPUT: 1 NEURON · LINEAR · MEAN SQUARED ERROR'
      };
    }
  }, [taskType, targetCol, anomalyReport]);

  // Hidden layer controllers
  const handleAddLayer = () => {
    const updated = [...layers, { neurons: 32, activation: 'ReLU', dropout: 0.0 }];
    setConfig(prev => ({
      ...prev,
      layers: updated
    }));
  };

  const handleUpdateLayer = (idx, field, value) => {
    const updated = layers.map((l, i) => {
      if (i === idx) {
        let val = value;
        if (field === 'neurons') val = Math.max(1, Math.min(1024, Number(value) || 1));
        if (field === 'dropout') val = Math.max(0.0, Math.min(0.9, Number(value) || 0.0));
        return { ...l, [field]: val };
      }
      return l;
    });
    setConfig(prev => ({
      ...prev,
      layers: updated
    }));
  };

  const handleDeleteLayer = (idx) => {
    const updated = layers.filter((_, i) => i !== idx);
    setConfig(prev => ({
      ...prev,
      layers: updated
    }));
  };

  // Compact textual model architecture flow summary
  const architectureFlowSummary = useMemo(() => {
    const inputSegment = `INPUT(${featureCols.length})`;
    const hiddenSegments = layers.map(l => `${l.neurons}(${l.activation})`).join(' → ');
    const outputNeuronCount = targetMeta ? targetMeta.neurons : 'M';
    const outputActivation = targetMeta ? targetMeta.activation : 'Act';
    const outputSegment = `OUTPUT(${outputNeuronCount}:${outputActivation})`;
    
    return hiddenSegments ? `${inputSegment} → ${hiddenSegments} → ${outputSegment}` : `${inputSegment} → ${outputSegment}`;
  }, [featureCols, layers, targetMeta]);

  // Train action handler with status polling
  const handleTrainNetwork = async () => {
    if (featureCols.length === 0) {
      setError('SELECT AT LEAST ONE FEATURE COLUMN FIRST.');
      return;
    }
    if (!targetCol) {
      setError('SELECT A TARGET COLUMN FIRST.');
      return;
    }
    if (layers.length === 0) {
      setError('ADD AT LEAST ONE HIDDEN LAYER IN STEP 4.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLiveMetrics([]);
    setCurrentEpoch(0);

    // Initialize polling status state
    let trainCompleted = false;

    // Start background status poller
    pollTimerRef.current = setInterval(async () => {
      try {
        const status = await getDLStatus();
        if (status && status.total > 0) {
          setCurrentEpoch(status.current);
          
          setLiveMetrics(prev => {
            // Check if this epoch is already recorded to prevent duplicates
            const exists = prev.some(item => item.epoch === status.current);
            if (exists || status.current === 0) return prev;
            
            const newRow = {
              epoch: status.current,
              loss: status.loss,
              val_loss: status.val_loss,
              accuracy: status.accuracy,
              val_accuracy: status.val_accuracy
            };
            
            // Keep only the last 10 rows for display in the table
            const updated = [...prev, newRow];
            return updated.slice(-10);
          });
          
          if (status.complete || status.current >= status.total) {
            clearInterval(pollTimerRef.current);
          }
        }
      } catch (err) {
        // fail silently on polling connection hiccups
      }
    }, 200);

    try {
      const payload = {
        task_type: taskType,
        feature_columns: featureCols,
        target_column: targetCol,
        layers: layers.map(l => ({
          neurons: Number(l.neurons),
          activation: l.activation,
          dropout: Number(l.dropout)
        })),
        epochs: Number(epochs),
        batch_size: Number(batchSize),
        learning_rate: Number(learningRate),
        optimizer: optimizer.toLowerCase(),
        validation_split: Number(validationSplit),
        test_size: Number(testSize)
      };

      const data = await trainDL(payload);
      
      setConfig(prev => ({
        ...prev,
        results: data
      }));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'TRAINING ENGINE ENCOUNTERED AN UNEXPECTED EXCEPTION.');
    } finally {
      clearInterval(pollTimerRef.current);
      setIsLoading(false);
    }
  };

  // Cleanup polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Autofill prediction inputs
  const handlePredictAutofill = () => {
    if (!storedBounds) return;
    const filled = {};
    featureCols.forEach(col => {
      const bounds = storedBounds[col];
      if (bounds) {
        // Average value
        filled[col] = String(Number(((bounds.min + bounds.max) / 2).toFixed(3)));
      } else {
        filled[col] = '0';
      }
    });
    setPredictionInputs(filled);
  };

  // Run predictions
  const handlePredict = async (e) => {
    e.preventDefault();
    setPredictLoading(true);
    setPredictError(null);
    setPredictResult(null);

    try {
      const parsedInputs = {};
      featureCols.forEach(col => {
        parsedInputs[col] = Number(predictionInputs[col]) || 0.0;
      });

      const response = await predictDL({ inputs: parsedInputs });
      setPredictResult(response);
    } catch (err) {
      setPredictError(err.response?.data?.error || err.message || 'PREDICTION CALL FAILED.');
    } finally {
      setPredictLoading(false);
    }
  };

  // Formatting percentages safely
  const formatPercentage = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `${Number(val).toFixed(1)}%`;
  };

  // Learning Curve Recharts data mapping
  const curveData = useMemo(() => {
    if (!results || !results.history) return [];
    const h = results.history;
    const len = h.loss?.length || 0;
    const arr = [];
    for (let i = 0; i < len; i++) {
      const row = { epoch: i + 1 };
      if (h.loss) row.loss = h.loss[i];
      if (h.val_loss) row.val_loss = h.val_loss[i];
      if (h.accuracy) row.accuracy = h.accuracy[i];
      if (h.val_accuracy) row.val_accuracy = h.val_accuracy[i];
      arr.push(row);
    }
    return arr;
  }, [results]);

  // Empty State fallback when no dataset uploaded yet
  if (!anomalyReport) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundColor: '#fef9ef', textAlign: 'center', padding: '32px' }}>
        <div style={{ padding: '16px', backgroundColor: '#ffe45e', border: '2px solid black', marginBottom: '16px', transform: 'rotate(-3deg)', boxShadow: '4px 4px 0px #000' }}>
          <Cpu size={40} className="text-black" />
        </div>
        <h2 className="text-2xl font-black text-black uppercase">NO DATASET AVAILABLE</h2>
        <p className="text-sm font-bold text-gray-600 mt-2 max-w-md uppercase">
          PLEASE UPLOAD AND CLEANSE YOUR DATASET INSIDE THE "DATA PREP & CLEANING" WORKSPACE FIRST.
        </p>
      </div>
    );
  }

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
        .neo-checkbox {
          cursor: pointer;
          user-select: none;
          transition: background-color 0.1s ease;
        }
        .neo-btn-clicked:active {
          transform: translate(3px, 3px);
          box-shadow: 0px 0px 0px #000 !important;
        }
      `}</style>

      <div className="flex flex-col md:flex-row flex-1 w-full min-h-0 overflow-y-auto md:overflow-hidden bg-[#fef9ef]">

      {/* ── LEFT COLUMN — MODEL PIPELINE CONFIGURATION ── */}
      <aside className="w-full md:w-[340px] md:min-w-[340px] shrink-0 border-b-2 md:border-b-0 md:border-r-2 border-black bg-white flex flex-col overflow-y-auto select-none">
        
        {/* Header Title */}
        <div className="p-4 bg-black text-white flex items-center gap-3 shrink-0">
          <Cpu size={24} className="text-[#ffe45e]" strokeWidth={2.5} />
          <h2 className="font-black text-sm uppercase tracking-wider">NETWORK CONFIGURATION</h2>
        </div>

        {/* Configurations Fields wrapper */}
        <div className="p-4 flex-1 space-y-6">

          {/* STEP 1 — TASK TYPE */}
          <div className="space-y-2">
            <h4 className="font-black text-xs uppercase tracking-wider text-black">STEP 1 — TASK TYPE</h4>
            <div className="grid grid-cols-2 border-2 border-black">
              <button
                type="button"
                onClick={() => handleTaskTypeChange('classification')}
                className={`py-3 text-[10px] font-black uppercase flex flex-col items-center justify-center gap-1 transition-colors border-r border-black ${
                  taskType === 'classification' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                <Target size={14} />
                <span>CLASSIFICATION</span>
              </button>
              <button
                type="button"
                onClick={() => handleTaskTypeChange('regression')}
                className={`py-3 text-[10px] font-black uppercase flex flex-col items-center justify-center gap-1 transition-colors ${
                  taskType === 'regression' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                <TrendingUp size={14} />
                <span>REGRESSION</span>
              </button>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase px-1">
              {taskType === 'classification' ? '• Predict categorical labels (binary or multi-class)' : '• Predict numerical values (continuous)'}
            </p>
          </div>

          {/* STEP 2 — FEATURE COLUMNS (X) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs uppercase tracking-wider text-black">STEP 2 — FEATURE COLUMNS (X)</h4>
              <button
                type="button"
                onClick={handleSelectAllFeatures}
                className="px-2 py-0.5 text-[9px] font-black uppercase border border-black bg-[#ffe45e] shadow-[1px_1px_0px_#000] hover:bg-[#ffe45e]/90 active:translate-x-[0.5px] active:translate-y-[0.5px]"
              >
                SELECT ALL
              </button>
            </div>

            <div className="border-2 border-black max-h-[160px] overflow-y-auto bg-[#fef9ef]/50 p-2 space-y-1">
              {allColumns.length === 0 ? (
                <div className="text-[10px] font-bold text-gray-500 uppercase text-center p-4">NO FEATURES AVAILABLE</div>
              ) : (
                allColumns.map(col => {
                  const isChecked = featureCols.includes(col.name);
                  const isDisabled = col.name === targetCol;
                  return (
                    <div
                      key={col.name}
                      onClick={() => !isDisabled && handleToggleFeature(col.name)}
                      className={`flex items-center gap-2 p-1.5 border border-black text-xs font-black uppercase neo-checkbox select-none ${
                        isDisabled ? 'opacity-40 cursor-not-allowed bg-gray-200' : 'hover:bg-white'
                      }`}
                    >
                      <div className={`w-4 h-4 border border-black shrink-0 ${isChecked ? 'bg-[#ffe45e]' : 'bg-white'}`} />
                      <span className="truncate">{col.name}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between text-[9px] font-black text-black bg-[#ffe45e]/30 border border-black p-1">
              <span>FEATURE SELECTION RATIO:</span>
              <span>{featureCols.length} OF {allColumns.filter(c => c.name !== targetCol).length} FEATURES SELECTED</span>
            </div>
          </div>

          {/* STEP 3 — TARGET COLUMN (Y) */}
          <div className="space-y-2">
            <h4 className="font-black text-xs uppercase tracking-wider text-black">STEP 3 — TARGET COLUMN (Y)</h4>
            
            <select
              value={targetCol}
              onChange={handleSelectTarget}
              className="w-full border-2 border-black p-2 font-bold uppercase text-xs bg-[#fef9ef] focus:outline-none cursor-pointer"
            >
              <option value="">-- SELECT TARGET COLUMN --</option>
              {allColumns.map((col, index) => (
                <option key={index} value={col.name}>{col.name.toUpperCase()}</option>
              ))}
            </select>

            {targetMeta && (
              <div className="p-3 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
                <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider">AUTO-DETECTED NETWORK CONFIGURATION</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 text-[9px] font-black bg-black text-white uppercase">{targetMeta.neurons} {targetMeta.neurons === 1 ? 'NEURON' : 'NEURONS'}</span>
                  <span className="px-2 py-0.5 text-[9px] font-black bg-[#ffe45e] text-black border border-black uppercase">{targetMeta.activation}</span>
                  <span className="px-2 py-0.5 text-[9px] font-black bg-[#00f0ff] text-black border border-black uppercase">{targetMeta.loss}</span>
                </div>
              </div>
            )}
          </div>

          {/* STEP 4 — NETWORK ARCHITECTURE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs uppercase tracking-wider text-black">STEP 4 — HIDDEN LAYERS</h4>
              <button
                type="button"
                onClick={handleAddLayer}
                className="px-2 py-0.5 text-[9px] font-black uppercase border border-black bg-[#ffe45e] shadow-[1px_1px_0px_#000] hover:bg-[#ffe45e]/90 active:translate-x-[0.5px] active:translate-y-[0.5px]"
              >
                + ADD LAYER
              </button>
            </div>

            {/* Render layers configs list */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto p-1">
              {layers.length === 0 ? (
                <div className="text-[10px] font-bold text-gray-400 uppercase text-center p-4 border border-dashed border-gray-400">NO HIDDEN LAYERS ADDED. ADD ONE FIRST!</div>
              ) : (
                layers.map((layer, idx) => (
                  <React.Fragment key={idx}>
                    <div className="p-3 bg-white border-2 border-black shadow-[3px_3px_0px_#000] flex flex-col gap-2 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical size={14} className="text-gray-400 shrink-0" />
                          <div className="w-5 h-5 rounded-full bg-black text-white text-[9px] font-black flex items-center justify-center">
                            {idx + 1}
                          </div>
                          <span className="text-[10px] font-black uppercase text-black">LAYER CONFIG</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteLayer(idx)}
                          className="w-6 h-6 border border-black bg-[#ff499e] text-black flex items-center justify-center hover:bg-[#ff499e]/90 active:translate-x-[0.5px] active:translate-y-[0.5px]"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="block text-[8px] font-black uppercase text-gray-500 mb-0.5">NEURONS</span>
                          <input
                            type="number"
                            min="1"
                            max="1024"
                            value={layer.neurons}
                            onChange={(e) => handleUpdateLayer(idx, 'neurons', e.target.value)}
                            className="w-full border border-black px-1.5 py-0.5 font-bold bg-[#fef9ef]"
                          />
                        </div>
                        <div>
                          <span className="block text-[8px] font-black uppercase text-gray-500 mb-0.5">ACTIVATION</span>
                          <select
                            value={layer.activation}
                            onChange={(e) => handleUpdateLayer(idx, 'activation', e.target.value)}
                            className="w-full border border-black px-1 py-0.5 font-bold bg-[#fef9ef] text-[9px] uppercase"
                          >
                            <option value="ReLU">ReLU</option>
                            <option value="Sigmoid">SIGMOID</option>
                            <option value="Tanh">TANH</option>
                            <option value="LeakyReLU">LeakyReLU</option>
                            <option value="ELU">ELU</option>
                            <option value="Linear">LINEAR</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1" title="Dropout randomly disables neurons during training to prevent overfitting">
                          <span className="text-[8px] font-black uppercase text-gray-500">DROPOUT RATIO</span>
                          <Info size={10} className="text-gray-400 cursor-help" />
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          min="0.0"
                          max="0.9"
                          value={layer.dropout}
                          onChange={(e) => handleUpdateLayer(idx, 'dropout', e.target.value)}
                          className="w-16 border border-black px-1 py-0.5 text-center font-bold bg-[#fef9ef]"
                        />
                      </div>
                    </div>

                    {idx < layers.length - 1 && (
                      <div className="text-center text-gray-400 font-black text-xs py-0.5">↓</div>
                    )}
                  </React.Fragment>
                ))
              )}
            </div>

            {/* Neural summary visual box */}
            <div className="p-2 border border-black bg-[#ffe45e]/20 text-[9px] font-mono font-bold leading-tight break-all">
              <span className="text-gray-500">SUMMARY: </span>
              {architectureFlowSummary}
            </div>
          </div>

          {/* STEP 5 — TRAINING PARAMETERS */}
          <div className="space-y-3">
            <h4 className="font-black text-xs uppercase tracking-wider text-black">STEP 5 — TRAINING PARAMETERS</h4>
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="block text-[8px] font-black uppercase text-gray-500 mb-0.5">EPOCHS</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={epochs}
                  onChange={(e) => setEpochs(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                  className="w-full border-2 border-black p-1.5 font-bold bg-[#fef9ef]"
                />
              </div>
              <div>
                <span className="block text-[8px] font-black uppercase text-gray-500 mb-0.5">BATCH SIZE</span>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full border-2 border-black p-1.5 font-bold bg-[#fef9ef] text-[9px]"
                >
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                  <option value={64}>64</option>
                  <option value={128}>128</option>
                  <option value={256}>256</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="block text-[8px] font-black uppercase text-gray-500 mb-0.5">LEARNING RATE</span>
                <select
                  value={learningRate}
                  onChange={(e) => setLearningRate(Number(e.target.value))}
                  className="w-full border-2 border-black p-1.5 font-bold bg-[#fef9ef] text-[9px]"
                >
                  <option value={0.1}>0.1</option>
                  <option value={0.01}>0.01</option>
                  <option value={0.001}>0.001</option>
                  <option value={0.0001}>0.0001</option>
                </select>
              </div>
              <div>
                <span className="block text-[8px] font-black uppercase text-gray-500 mb-0.5">OPTIMIZER</span>
                <select
                  value={optimizer}
                  onChange={(e) => setOptimizer(e.target.value)}
                  className="w-full border-2 border-black p-1.5 font-bold bg-[#fef9ef] text-[9px] uppercase"
                >
                  <option value="Adam">Adam</option>
                  <option value="SGD">SGD</option>
                  <option value="RMSprop">RMSprop</option>
                  <option value="Adagrad">Adagrad</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[8px] font-black text-gray-500 mb-1">
                <span>VALIDATION SPLIT RATIO</span>
                <span>{validationSplit}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="5"
                value={validationSplit}
                onChange={(e) => setValidationSplit(Number(e.target.value))}
                className="w-full accent-black bg-gray-200 h-1.5 cursor-pointer outline-none"
              />
              <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">
                {validationSplit}% OF TRAINING DATA USED FOR VALIDATION
              </p>
            </div>
          </div>

          {/* STEP 6 — TRAIN/TEST SPLIT */}
          <div className="space-y-1">
            <div className="flex justify-between text-[8px] font-black text-gray-500">
              <span>STEP 6 — TRAIN / TEST SPLIT</span>
              <span>{100 - testSize}% / {testSize}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="90"
              step="5"
              value={100 - testSize}
              onChange={(e) => setTestSize(100 - Number(e.target.value))}
              className="w-full accent-black bg-gray-200 h-1.5 cursor-pointer outline-none"
            />
            <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">
              {100 - testSize}% TRAIN · {testSize}% TEST
            </p>
          </div>

          {/* TRAIN NETWORK TRIGGER BUTTON */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleTrainNetwork}
            style={{ boxShadow: '4px 4px 0px #000' }}
            className={`w-full py-4 text-xs font-black uppercase tracking-wider border-[3px] border-black transition-all flex items-center justify-center gap-2 neo-btn-clicked ${
              isLoading
                ? 'bg-white cursor-wait'
                : 'bg-[#ffe45e] hover:bg-[#ffe45e]/90 cursor-pointer'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin text-black" />
                <span>⟳ TRAINING... EPOCH {currentEpoch}/{epochs}</span>
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" className="text-black" />
                <span>▶ TRAIN NETWORK</span>
              </>
            )}
          </button>

        </div>
      </aside>

      {/* ── RIGHT COLUMN — RESULTS CANVAS ── */}
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto bg-[#fef9ef]">
        
        {/* Error bar alerts */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-[#ff499e]/20 border-[3px] border-black shadow-[4px_4px_0px_#000] text-black font-bold uppercase text-xs mb-8">
            <AlertCircle size={20} className="shrink-0 text-black" strokeWidth={3} />
            <div>{error}</div>
          </div>
        )}

        {/* ── CASE A — EMPTY STATE ── */}
        {!results && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
            <div className="p-6 bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] mb-6 animate-bounce">
              <Cpu size={72} strokeWidth={2.5} className="text-black" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-wider text-black">NO NETWORK TRAINED YET</h3>
            <p className="text-sm font-bold text-gray-500 uppercase mt-2 max-w-sm text-center">
              CONFIGURE YOUR NETWORK AND CLICK "TRAIN NETWORK".
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-3xl mt-12 select-none">
              {[
                { title: 'TRAINING CURVES', desc: 'MONITOR REAL-TIME BCE / MSE LOSS AND VALIDATION ACCURACY DECAYS OVER EPOCHS.' },
                { title: 'MODEL METRICS', desc: 'ANALYZE THE MODEL INTEGRITY USING ACCURACY, CLASSIFICATION REPORT, AND R² SCORES.' },
                { title: 'PREDICTION PANEL', desc: 'AUTOFILL BOUNDS OR FEED CUSTOM VALUES TO RUN ACTIVE DEEP NETWORK ESTIMATION.' }
              ].map(card => (
                <div key={card.title} className="p-4 bg-white border-2 border-black shadow-[4px_4px_0px_#000]">
                  <h5 className="font-black text-xs uppercase text-black mb-1 tracking-wide">{card.title}</h5>
                  <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CASE B — LIVE LOADING/TRAINING STATE ── */}
        {isLoading && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="p-4 bg-black text-white border-[3px] border-black shadow-[6px_6px_0px_#000] flex items-center justify-between pulse-box">
              <div className="flex items-center gap-3">
                <RefreshCw size={20} className="animate-spin text-[#ffe45e]" strokeWidth={3} />
                <span className="font-black text-sm uppercase tracking-widest">TRAINING IN PROGRESS</span>
              </div>
              <span className="font-mono font-black text-sm">EPOCH {currentEpoch} / {epochs}</span>
            </div>

            {/* Custom Neobrutalist Progress Bar */}
            <div className="h-6 w-full bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] relative overflow-hidden">
              <div 
                style={{ width: `${(currentEpoch / epochs) * 100}%` }}
                className="h-full bg-[#ffe45e] border-r-[3px] border-black transition-all duration-150"
              />
            </div>

            {/* Live Metrics Table */}
            <div className="space-y-3">
              <h4 className="font-black text-xs uppercase tracking-wider text-black">LIVE TRAINING METRICS STREAM</h4>
              <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] overflow-x-auto select-none">
                <table className="w-full text-left border-collapse text-[11px] min-w-[500px]">
                  <thead>
                    <tr className="bg-black text-white border-b-2 border-black">
                      <th className="p-2.5 font-black uppercase">EPOCH</th>
                      <th className="p-2.5 font-black uppercase">LOSS</th>
                      <th className="p-2.5 font-black uppercase">VAL LOSS</th>
                      <th className="p-2.5 font-black uppercase">
                        {taskType === 'classification' ? 'ACCURACY' : 'MEAN ABSOLUTE ERROR (MAE)'}
                      </th>
                      <th className="p-2.5 font-black uppercase">
                        {taskType === 'classification' ? 'VAL ACCURACY' : 'VAL MAE'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveMetrics.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-center font-bold text-gray-400 uppercase">INITIALIZING NEURAL WEIGHTS...</td>
                      </tr>
                    ) : (
                      liveMetrics.map((row, idx) => {
                        const isLatest = idx === liveMetrics.length - 1;
                        return (
                          <tr key={row.epoch} className={`border-b border-black last:border-0 ${isLatest ? 'bg-[#ffe45e]' : ''}`}>
                            <td className="p-2 font-black">EPOCH {row.epoch}</td>
                            <td className="p-2 font-mono font-bold">{row.loss?.toFixed(4)}</td>
                            <td className="p-2 font-mono font-bold">{row.val_loss?.toFixed(4)}</td>
                            <td className="p-2 font-mono font-bold">
                              {taskType === 'classification' ? `${row.accuracy?.toFixed(1)}%` : row.accuracy?.toFixed(4)}
                            </td>
                            <td className="p-2 font-mono font-bold">
                              {taskType === 'classification' ? `${row.val_accuracy?.toFixed(1)}%` : row.val_accuracy?.toFixed(4)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── CASE C — FINAL RESULTS STATE ── */}
        {results && !isLoading && (
          <div className="space-y-10">

            {/* SECTION A — MODEL SUMMARY CARD */}
            <div className="bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black uppercase tracking-tight text-black">DEEP NEURAL NETWORK</h3>
                  <span className="px-2 py-0.5 text-[9px] font-black bg-black text-white uppercase">{taskType}</span>
                </div>
                <div className="text-xs font-bold text-gray-500 uppercase">
                  TOTAL NETWORK PARAMETERS: <span className="font-mono font-black text-black">{results.total_params?.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="border border-black p-3 bg-[#fef9ef] text-center min-w-[100px]">
                  <span className="block text-[8px] font-black uppercase text-gray-400">EPOCHS</span>
                  <span className="text-lg font-black font-mono">{results.epochs_trained}</span>
                </div>
                <div className="border border-black p-3 bg-[#fef9ef] text-center min-w-[100px]">
                  <span className="block text-[8px] font-black uppercase text-gray-400">TRAIN TIME</span>
                  <span className="text-lg font-black font-mono">{results.training_time_ms}ms</span>
                </div>
              </div>
            </div>

            {/* SECTION B — TRAINING CURVES */}
            <div className="bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_#000] space-y-6">
              <div className="border-b-2 border-black pb-3">
                <h4 className="font-black text-sm uppercase tracking-wider text-black">SECTION B — TRAINING CURVES</h4>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* LOSS CURVE */}
                <div className="space-y-3">
                  <h5 className="font-black text-xs uppercase text-black text-center">LOSS CURVE (BCE / MSE)</h5>
                  <div className="h-64 border-2 border-black p-2 shadow-[4px_4px_0px_#000] bg-white">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={curveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.15} />
                        <XAxis dataKey="epoch" tick={{ fill: '#000', fontSize: 10, fontWeight: 'bold' }} stroke="#000" strokeWidth={1.5} />
                        <YAxis tick={{ fill: '#000', fontSize: 10, fontWeight: 'bold' }} stroke="#000" strokeWidth={1.5} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'white', border: '2px solid black', boxShadow: '3px 3px 0px #000', fontFamily: 'monospace', fontSize: '11px', fontWeight: 'bold' }} 
                        />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                        <Line type="monotone" dataKey="loss" stroke="#000" strokeWidth={2.5} name="Train Loss" dot={false} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="val_loss" stroke="#ffe45e" strokeWidth={2} strokeDasharray="5 5" name="Val Loss" dot={false} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ACCURACY CURVE (classification only) */}
                {taskType === 'classification' ? (
                  <div className="space-y-3">
                    <h5 className="font-black text-xs uppercase text-black text-center">ACCURACY CURVE (%)</h5>
                    <div className="h-64 border-2 border-black p-2 shadow-[4px_4px_0px_#000] bg-white">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={curveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.15} />
                          <XAxis dataKey="epoch" tick={{ fill: '#000', fontSize: 10, fontWeight: 'bold' }} stroke="#000" strokeWidth={1.5} />
                          <YAxis domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fill: '#000', fontSize: 10, fontWeight: 'bold' }} stroke="#000" strokeWidth={1.5} />
                          <Tooltip 
                            formatter={v => `${(v * 100).toFixed(1)}%`}
                            contentStyle={{ backgroundColor: 'white', border: '2px solid black', boxShadow: '3px 3px 0px #000', fontFamily: 'monospace', fontSize: '11px', fontWeight: 'bold' }} 
                          />
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                          <Line type="monotone" dataKey="accuracy" stroke="#000" strokeWidth={2.5} name="Train Accuracy" dot={false} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="val_accuracy" stroke="#ffe45e" strokeWidth={2} strokeDasharray="5 5" name="Val Accuracy" dot={false} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  // For regression show descriptive tips card instead of second chart
                  <div className="space-y-3">
                    <h5 className="font-black text-xs uppercase text-black text-center">TRAINING INFORMATION SUMMARY</h5>
                    <div className="h-64 border-2 border-black p-5 shadow-[4px_4px_0px_#000] bg-white flex flex-col justify-center space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#00f0ff] border border-black flex items-center justify-center font-black">i</div>
                        <p className="text-[11px] font-bold text-gray-600 uppercase leading-relaxed">
                          REGRESSION NETWORKS FOCUS PRIMARILY ON REDUCING MEAN SQUARED ERROR (MSE) VALUE DECAYS SHOWN ON THE LEFT CURVE.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#ffe45e] border border-black flex items-center justify-center font-black">✓</div>
                        <p className="text-[11px] font-bold text-gray-600 uppercase leading-relaxed">
                          TO MINIMIZE OVERFITTING, INSURE VALIDATION LOSS (YELLOW DASHED LINE) STAYS TIGHT AND ALIGNED WITH TRAINING LOSS.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* SECTION C — FINAL METRICS */}
            <div className="space-y-4">
              <h4 className="font-black text-sm uppercase tracking-wider text-black">SECTION C — SCOREBOARD & EVALUATIONS</h4>
              
              {taskType === 'classification' ? (
                // Classification scorecard
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {[
                      { label: 'ACCURACY SCORE', val: formatPercentage(results.final_metrics?.accuracy / 100), color: 'bg-[#ffe45e]' },
                      { label: 'WEIGHTED PRECISION', val: formatPercentage(results.final_metrics?.precision / 100), color: 'bg-white' },
                      { label: 'WEIGHTED RECALL', val: formatPercentage(results.final_metrics?.recall / 100), color: 'bg-white' },
                      { label: 'WEIGHTED F1-SCORE', val: formatPercentage(results.final_metrics?.f1 / 100), color: 'bg-white' }
                    ].map(metric => (
                      <div key={metric.label} className={`border-[2px] border-black p-4 shadow-[4px_4px_0px_#000] flex flex-col justify-between h-28 ${metric.color}`}>
                        <span className="text-[9px] font-black uppercase text-gray-500">{metric.label}</span>
                        <span className="text-3xl font-black tracking-tight font-mono">{metric.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Confusion Matrix */}
                  {results.final_metrics?.confusion_matrix && (
                    <div className="space-y-3">
                      <h5 className="font-black text-xs uppercase tracking-wide text-black">CONFUSION MATRIX VISUALIZATION (N×N)</h5>
                      <div className="p-6 bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] inline-block">
                        <div className="grid gap-1">
                          {results.final_metrics.confusion_matrix.map((row, rIdx) => (
                            <div key={rIdx} className="flex gap-1">
                              {row.map((cell, cIdx) => {
                                const isCorrect = rIdx === cIdx;
                                return (
                                  <div
                                    key={cIdx}
                                    style={{ width: '60px', height: '60px' }}
                                    className={`border border-black flex flex-col items-center justify-center font-mono font-bold select-none ${
                                      isCorrect ? 'bg-[#ffe45e]' : 'bg-[#ff499e]'
                                    }`}
                                  >
                                    <span className="text-sm font-black text-black">{cell}</span>
                                    <span className="text-[7px] text-black font-bold uppercase">{isCorrect ? 'HIT' : 'MISS'}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-4 text-[9px] font-black uppercase mt-3">
                          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-[#ffe45e] border border-black" /> TRUE PREDICTIONS (HITS)</div>
                          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-[#ff499e] border border-black" /> FALSE PREDICTIONS (MISSES)</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Regression scorecard
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {[
                    { label: 'R² SCORE (VARIANCE)', val: results.final_metrics?.r2, color: 'bg-[#ffe45e]' },
                    { label: 'MEAN ABSOLUTE ERROR', val: results.final_metrics?.mae, color: 'bg-white' },
                    { label: 'MEAN SQUARED ERROR', val: results.final_metrics?.mse, color: 'bg-white' },
                    { label: 'ROOT MEAN SQUARED ERROR', val: results.final_metrics?.rmse, color: 'bg-white' }
                  ].map(metric => (
                    <div key={metric.label} className={`border-[2px] border-black p-4 shadow-[4px_4px_0px_#000] flex flex-col justify-between h-28 ${metric.color}`}>
                      <span className="text-[9px] font-black uppercase text-gray-500">{metric.label}</span>
                      <span className="text-3xl font-black tracking-tight font-mono">{metric.val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION D — NETWORK ARCHITECTURE VISUALIZATION */}
            <div className="space-y-4">
              <h4 className="font-black text-sm uppercase tracking-wider text-black">SECTION D — NETWORK ARCHITECTURE GRAPH</h4>
              
              <div className="p-6 bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] overflow-x-auto select-none">
                <div className="flex items-center gap-4 py-4 min-w-max">
                  
                  {/* INPUT BOX */}
                  <div className="bg-black text-white border-2 border-black p-4 text-center shadow-[3px_3px_0px_#000] min-w-[110px]">
                    <span className="block text-[8px] font-black text-gray-400 uppercase">INPUT</span>
                    <span className="text-sm font-black font-mono mt-1 block">{results.n_features} FEATURES</span>
                  </div>

                  <span className="font-black text-lg text-gray-400">→</span>

                  {/* HIDDEN LAYERS BOXES */}
                  {results.architecture?.map((layer, idx) => (
                    <React.Fragment key={idx}>
                      <div className="bg-white border-2 border-black p-4 text-center shadow-[4px_4px_0px_#000] min-w-[120px] relative">
                        <span className="absolute top-1 left-2 text-[7px] font-black text-gray-400 uppercase">LAYER {idx + 1}</span>
                        <span className="text-xl font-black block font-mono mt-1.5">{layer.neurons}</span>
                        <span className="text-[8px] font-black px-2 py-0.5 mt-1.5 inline-block bg-[#00f0ff] border border-black uppercase">{layer.activation}</span>
                        {layer.dropout > 0 && (
                          <span className="block text-[7px] text-gray-400 font-bold uppercase mt-1">DP: {layer.dropout}</span>
                        )}
                      </div>
                      <span className="font-black text-lg text-gray-400">→</span>
                    </React.Fragment>
                  ))}

                  {/* OUTPUT BOX */}
                  <div className="bg-black text-white border-2 border-black p-4 text-center shadow-[3px_3px_0px_#000] min-w-[110px]">
                    <span className="block text-[8px] font-black text-gray-400 uppercase">OUTPUT</span>
                    <span className="text-sm font-black font-mono mt-1 block">
                      {targetMeta ? targetMeta.neurons : 1} {targetMeta && targetMeta.neurons === 1 ? 'NEURON' : 'NEURONS'}
                    </span>
                  </div>

                </div>
              </div>
            </div>

            {/* SECTION E — PREDICTION PANEL */}
            <div className="space-y-4 max-w-4xl">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm uppercase tracking-wider text-black">SECTION E — TEST RUN / MODEL INFERENCE</h4>
                <button
                  type="button"
                  onClick={handlePredictAutofill}
                  className="px-3 py-1 text-[10px] font-black bg-[#00f0ff] border-2 border-black shadow-[2px_2px_0px_#000] uppercase hover:bg-[#00f0ff]/90 active:translate-x-[0.5px] active:translate-y-[0.5px]"
                >
                  ⚡ AUTOFILL MEAN BOUNDS
                </button>
              </div>

              <div className="bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_#000] space-y-6">
                
                <form onSubmit={handlePredict} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {featureCols.map(col => {
                      const bounds = storedBounds?.[col];
                      return (
                        <div key={col} className="space-y-1">
                          <label className="block text-[9px] font-black uppercase text-gray-500 truncate" title={col}>
                            {col}
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={predictionInputs[col] || ''}
                            onChange={(e) => setPredictionInputs(prev => ({ ...prev, [col]: e.target.value }))}
                            className="w-full border-2 border-black p-1.5 font-bold bg-[#fef9ef] text-xs focus:outline-none"
                            placeholder="Enter value..."
                          />
                          {bounds && (
                            <span className="block text-[8px] font-bold text-gray-400 uppercase">
                              MIN: {bounds.min.toFixed(2)} · MAX: {bounds.max.toFixed(2)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    disabled={predictLoading}
                    className="px-6 py-3 text-xs font-black uppercase bg-black text-white hover:bg-black/90 active:translate-x-[0.5px] active:translate-y-[0.5px] border-2 border-black flex items-center gap-2"
                  >
                    {predictLoading ? (
                      <Loader size={14} className="animate-spin text-white" />
                    ) : (
                      <Zap size={14} fill="currentColor" />
                    )}
                    <span>PREDICT OUTPUT</span>
                  </button>
                </form>

                {/* Predict Results outputs */}
                {predictError && (
                  <div className="p-3 bg-[#ff499e]/20 border-2 border-black text-black font-bold uppercase text-[10px]">
                    INFERENCE FAILURE: {predictError}
                  </div>
                )}

                {predictResult && (
                  <div className="p-4 bg-[#ffe45e] border-[3px] border-black shadow-[4px_4px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-gray-600 block">ESTIMATION PREDICTION RESULT</span>
                      <span className="text-2xl font-black font-mono text-black uppercase">{predictResult.prediction}</span>
                    </div>

                    {predictResult.confidence !== undefined && (
                      <div className="border border-black px-3 py-1.5 bg-white text-center">
                        <span className="text-[8px] font-black text-gray-400 block uppercase">CONFIDENCE</span>
                        <span className="font-mono font-black text-sm">{formatPercentage(predictResult.confidence)}</span>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  </div>
  );
};

export default DLStudio;
