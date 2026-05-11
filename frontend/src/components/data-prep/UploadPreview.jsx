import { LayoutDashboard, Sparkles, Database } from 'lucide-react';

const UploadPreview = ({ dataPreview, isDataLoaded, onOpenDemoModal }) => {
  if (!isDataLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-blue-500/10 border border-gray-100 dark:border-gray-700">
          <LayoutDashboard size={80} className="text-blue-500/20 dark:text-blue-400/20 mx-auto mb-2" />
          <Database size={64} className="text-blue-600 dark:text-blue-400 mx-auto" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Welcome to Smart DataStudio
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm leading-relaxed">
            Your end-to-end workspace for data analysis and machine learning. 
            Import a dataset from the <strong>File</strong> menu to begin, or explore with a demo.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onOpenDemoModal}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Sparkles size={18} />
            Try Demo Dataset
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Database size={20} className="text-blue-500" />
          Dataset Preview
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          First 10 rows
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
        <table className="min-w-full bg-white dark:bg-gray-800 text-sm">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              {Object.keys(dataPreview?.[0] || {}).map(k => (
                <th key={k} className="py-3 px-4 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataPreview?.map((row, i) => (
              <tr key={i} className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                {Object.values(row).map((v, j) => (
                  <td key={j} className="py-3 px-4 text-gray-700 dark:text-gray-300 font-medium">
                    {v !== null ? v.toString() : <span className="italic text-gray-300 dark:text-gray-500 font-normal">NaN</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UploadPreview;
