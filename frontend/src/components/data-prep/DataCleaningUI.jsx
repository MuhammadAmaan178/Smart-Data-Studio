import React, { useState } from 'react';
import { cleanData } from '../../api/client';
import SchemaManager from './SchemaManager';
import { AlertCircle, X } from 'lucide-react';

const DataCleaningUI = ({ anomalyReport, cleaningActions, setCleaningActions, setDataPreview, setAnomalyReport }) => {
  const [errorToast, setErrorToast] = useState(null);

  const handleQueueAction = (actionObj) => {
    setCleaningActions(prev => {
      const existing = prev.filter(a => !(a.column === actionObj.column && a.action === actionObj.action && actionObj.column));
      return [...existing, actionObj];
    });
  };

  const handleMissingActionChange = (col, action) => {
    setCleaningActions(prev => {
      const existing = prev.filter(a => !(a.column === col && ['drop_rows', 'fill_mean', 'fill_median', 'fill_0'].includes(a.action)));
      if (action) return [...existing, { column: col, action }];
      return existing;
    });
  };

  const handleApplyCleaning = async () => {
    setErrorToast(null);
    try {
      const data = await cleanData(cleaningActions);
      setDataPreview(data.data_preview);
      setAnomalyReport(data.anomaly_report);
      setCleaningActions([]);
    } catch (err) {
      console.error(err);
      setErrorToast(err.response?.data?.error || 'An unexpected error occurred while applying cleaning actions.');
    }
  };

  const handleDropDuplicates = () => handleQueueAction({ action: 'drop_duplicates' });

  if (!anomalyReport) return null;

  return (
    <div className="neo-card p-6 bg-[#00f0ff]">

      {/* Error Toast */}
      {errorToast && (
        <div className="mb-6 p-4 bg-pink-400 border-[3px] border-black text-black flex items-start justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center space-x-2">
            <AlertCircle size={20} className="shrink-0" />
            <span className="font-medium">{errorToast}</span>
          </div>
          <button onClick={() => setErrorToast(null)} className="text-red-500 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 cursor-pointer shrink-0 ml-4">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Schema Manager */}
      <SchemaManager anomalyReport={anomalyReport} onQueueAction={handleQueueAction} />

      <div className="border-b-[3px] border-black mb-6 pb-2">
        <h3 className="text-xl font-black text-black uppercase tracking-tight">Missing Values & Anomalies</h3>
      </div>

      {/* Anomalies banner */}
      <div className="mb-6 p-4 bg-[#ff499e] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-sm font-black text-black mb-2 uppercase">Dataset Anomalies</p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-black">Total Duplicate Rows: <strong className="bg-black text-white px-2 py-0.5 ml-1">{anomalyReport.total_duplicates}</strong></p>
          <button
            onClick={handleDropDuplicates}
            className="bg-white text-black px-4 py-2 text-sm neo-btn active:translate-x-[2px] active:translate-y-[2px]"
          >
            Queue Drop Duplicates
          </button>
        </div>
      </div>

      {/* Missing value handlers */}
      <div className="space-y-4 mb-6">
        <h4 className="font-black text-black uppercase tracking-tight">Handle Missing Values</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(anomalyReport.columns).map(([col, info]) =>
            info.missing_values > 0 && (
              <div key={col} className="flex flex-col gap-1 p-3 bg-[#ffe45e] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-sm font-black text-black flex justify-between">
                  {col} <span className="text-white bg-black px-1 border-2 border-black">({info.missing_values} missing)</span>
                </span>
                <select
                  className="neo-input p-1.5 text-sm mt-1 bg-white cursor-pointer"
                  onChange={(e) => handleMissingActionChange(col, e.target.value)}
                  defaultValue=""
                >
                  <option value="">Select Action...</option>
                  <option value="drop_rows">Drop Rows</option>
                  {(info.inferred_type.includes('float') || info.inferred_type.includes('int')) && (
                    <>
                      <option value="fill_mean">Fill with Mean</option>
                      <option value="fill_median">Fill with Median</option>
                      <option value="fill_0">Fill with 0</option>
                    </>
                  )}
                </select>
              </div>
            )
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-8 pt-4 border-t-[3px] border-black flex flex-col sm:flex-row items-center justify-between">
        <div className="text-sm font-black text-black mb-4 sm:mb-0 uppercase">
          <span className="bg-black text-white px-2 py-1 mr-2 border-2 border-black">
            {cleaningActions.length}
          </span> ACTIONS IN QUEUE
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <button
            onClick={() => setCleaningActions([])}
            className="w-full sm:w-auto px-4 py-2 neo-btn neo-btn-white"
            disabled={cleaningActions.length === 0}
          >
            Clear Queue
          </button>
          <button
            onClick={handleApplyCleaning}
            className={`w-full sm:w-auto px-6 py-2 neo-btn flex items-center justify-center ${
              cleaningActions.length > 0 ? 'neo-btn-primary' : 'bg-gray-300 cursor-not-allowed opacity-50'
            }`}
            disabled={cleaningActions.length === 0}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataCleaningUI;
