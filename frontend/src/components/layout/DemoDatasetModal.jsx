import React, { useState } from 'react';
import { X, Loader, Database } from 'lucide-react';
import { loadDemo } from '../../api/client';

// ── Dataset catalogue ──────────────────────────────────────────────
const DATASETS = [
  {
    name:    'titanic',
    label:   'Titanic',
    tag:     'Seaborn',
    tagCls:  'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
    emoji:   '🚢',
    desc:    'Passenger survival data. Perfect for data cleaning, EDA, and binary classification.',
    badges:  ['Cleaning', 'Classification', 'Decision Tree'],
  },
  {
    name:    'breast_cancer',
    label:   'Breast Cancer Wisconsin',
    tag:     'Sklearn',
    tagCls:  'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    emoji:   '🔬',
    desc:    '30 numeric features from digitized cell nuclei. Ideal for Deep Learning & SVM.',
    badges:  ['Deep Learning', 'SVM'],
  },
  {
    name:    'penguins',
    label:   'Palmer Penguins',
    tag:     'Seaborn',
    tagCls:  'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
    emoji:   '🐧',
    desc:    'Three penguin species across three islands. Great for dashboards and clustering.',
    badges:  ['Dashboard', 'K-Means'],
  },
  {
    name:    'iris',
    label:   'Iris',
    tag:     'Sklearn',
    tagCls:  'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    emoji:   '🌸',
    desc:    'The classic 150-row sandbox. Fast to train — great for first ML experiments.',
    badges:  ['KNN', 'Decision Tree'],
  },
  {
    name:    'wine',
    label:   'Wine Recognition',
    tag:     'Sklearn',
    tagCls:  'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    emoji:   '🍷',
    desc:    '13 chemical measurements of Italian wines. Multi-class classification benchmark.',
    badges:  ['KNN', 'SVM'],
  },
];

// ── Main Modal ─────────────────────────────────────────────────────
const DemoDatasetModal = ({ onClose, onDemoLoaded }) => {
  const [loading, setLoading] = useState(null);  // name of dataset being loaded
  const [error,   setError]   = useState(null);

  const handleSelect = async (name) => {
    setLoading(name);
    setError(null);
    try {
      const data = await loadDemo(name);
      onDemoLoaded(data);   // parent sets dataPreview + anomalyReport, switches view
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to load ${name}.`);
    } finally {
      setLoading(null);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal box — stop propagation so clicks inside don't close it */}
      <div
        className="relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl
                   border border-gray-200 dark:border-gray-700 overflow-hidden
                   animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <Database size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Load a Demo Dataset
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                No upload needed — data loads instantly into the pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500
                       hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300
                       transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 text-sm text-red-700 dark:text-red-300
                          bg-red-50 dark:bg-red-900/30
                          border border-red-200 dark:border-red-700
                          rounded-lg px-4 py-2.5">
            {error}
          </div>
        )}

        {/* Dataset grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DATASETS.map(ds => {
            const isLoading = loading === ds.name;
            const isDisabled = !!loading;
            return (
              <button
                key={ds.name}
                onClick={() => handleSelect(ds.name)}
                disabled={isDisabled}
                className={`group text-left rounded-xl border p-4 transition-all cursor-pointer
                            ${isDisabled
                              ? 'opacity-60 cursor-not-allowed'
                              : 'hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'
                            }
                            ${isLoading
                              ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:hover:bg-gray-700/50'
                            }`}
              >
                {/* Top row: emoji + source tag */}
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{ds.emoji}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ds.tagCls}`}>
                    {ds.tag}
                  </span>
                </div>

                {/* Title */}
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {ds.label}
                  </p>
                  {isLoading && (
                    <Loader size={13} className="text-blue-500 animate-spin shrink-0" />
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                  {ds.desc}
                </p>

                {/* Use-case badges */}
                <div className="flex flex-wrap gap-1">
                  {ds.badges.map(b => (
                    <span
                      key={b}
                      className="text-[10px] px-2 py-0.5 rounded-full
                                 bg-gray-100 dark:bg-gray-700
                                 text-gray-600 dark:text-gray-300
                                 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30
                                 group-hover:text-blue-700 dark:group-hover:text-blue-300
                                 transition-colors"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="px-6 pb-5 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Data is loaded directly into memory — no files saved to disk.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemoDatasetModal;
