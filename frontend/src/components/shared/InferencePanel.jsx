import React, { useState } from 'react';
import { Play, Brain, Target, Info, Sparkles } from 'lucide-react';

const InferencePanel = ({ features, featureBounds }) => {
  const [inputs, setInputs] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (col, val) => {
    setInputs(prev => ({ ...prev, [col]: val }));
  };

  const handleAutofill = () => {
    if (!featureBounds) return;
    const autofillData = {};
    features.forEach(col => {
      const bounds = featureBounds[col];
      if (bounds) {
        const { min, max } = bounds;
        const randomVal = Math.random() * (max - min) + min;
        autofillData[col] = randomVal.toFixed(2);
      } else {
        autofillData[col] = "0";
      }
    });
    setInputs(autofillData);
  };

  const handleRunPrediction = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const parsedInputs = {};
    features.forEach(col => {
      const val = inputs[col];
      parsedInputs[col] = val === undefined || val === '' ? 0 : parseFloat(val);
    });

    try {
      const response = await fetch('https://amaan909-smart-datastudio-backend.hf.space/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedInputs),
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Prediction failed');
      }
    } catch (err) {
      setError(`Connection Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="text-blue-500" size={24} />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Inference Engine</h3>
        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded ml-2">
          Live Model
        </span>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-2">
          <Info size={14} />
          Input feature values below to get a real-time prediction from your trained model.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {features.map(col => (
            <div key={col} className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 truncate block uppercase tracking-tight">
                {col}
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={inputs[col] || ''}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                onChange={(e) => handleInputChange(col, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleRunPrediction}
            disabled={loading || features.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
            {loading ? 'Processing...' : 'Run Prediction'}
          </button>

          <button
            onClick={handleAutofill}
            disabled={loading || !featureBounds}
            className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-95"
          >
            <Sparkles size={18} className="text-yellow-500" />
            Smart Autofill
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-2">
              <Target className="text-blue-600 dark:text-blue-400" size={20} />
              <span className="text-sm font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                Prediction Result
              </span>
            </div>
            <div className="text-3xl font-black text-blue-700 dark:text-blue-300">
              {result.result}
            </div>
            {result.probability !== undefined && (
              <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                Confidence: {(result.probability * 100).toFixed(2)}%
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InferencePanel;
