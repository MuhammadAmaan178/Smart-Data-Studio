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
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 border-t-4 border-t-blue-500 col-span-1 transition-colors duration-300">

      {/* Error Toast */}
      {errorToast && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/40 border-l-4 border-red-500 text-red-700 dark:text-red-300 flex items-start justify-between rounded shadow-sm animate-in fade-in slide-in-from-top-4">
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

      <div className="border-b border-gray-200 dark:border-gray-700 mb-6 pb-2">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Missing Values & Anomalies</h3>
      </div>

      {/* Anomalies banner */}
      <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded">
        <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-2">Dataset Anomalies</p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-orange-700 dark:text-orange-400">Total Duplicate Rows: <strong>{anomalyReport.total_duplicates}</strong></p>
          <button
            onClick={handleDropDuplicates}
            className="bg-orange-100 dark:bg-orange-800/50 text-orange-700 dark:text-orange-300 px-3 py-1 rounded text-sm hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors cursor-pointer border border-orange-300 dark:border-orange-700 font-medium"
          >
            Queue Drop Duplicates
          </button>
        </div>
      </div>

      {/* Missing value handlers */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-gray-700 dark:text-gray-300">Handle Missing Values</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(anomalyReport.columns).map(([col, info]) =>
            info.missing_values > 0 && (
              <div key={col} className="flex flex-col gap-1 p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {col} <span className="text-red-500 dark:text-red-400">({info.missing_values} missing)</span>
                </span>
                <select
                  className="border border-gray-300 dark:border-gray-600 rounded p-1.5 text-sm
                             bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200
                             dark:placeholder-gray-400 mt-1"
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
      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-0">
          <span className="font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
            {cleaningActions.length}
          </span> actions in queue
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <button
            onClick={() => setCleaningActions([])}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600
                       text-gray-700 dark:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-gray-700
                       rounded transition-colors cursor-pointer font-medium"
            disabled={cleaningActions.length === 0}
          >
            Clear Queue
          </button>
          <button
            onClick={handleApplyCleaning}
            className={`w-full sm:w-auto px-6 py-2 rounded font-medium transition-colors cursor-pointer shadow-sm flex items-center justify-center ${
              cleaningActions.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-300 dark:bg-blue-800 text-white cursor-not-allowed'
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
