import { LayoutDashboard, Sparkles, Database } from 'lucide-react';

const UploadPreview = ({ dataPreview, isDataLoaded, onOpenDemoModal }) => {
  if (!isDataLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full text-center space-y-6">
        <div className="p-8 neo-card bg-[#00f0ff]">
          <LayoutDashboard size={80} className="text-black mx-auto mb-2" strokeWidth={1.5} />
          <Database size={64} className="text-black mx-auto" strokeWidth={1.5} />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-black tracking-tighter uppercase">
            Welcome to Smart DataStudio
          </h2>
          <p className="text-black font-bold max-w-md mx-auto text-sm leading-relaxed border-[3px] border-black p-3 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            Your end-to-end workspace for data analysis and machine learning. 
            Import a dataset from the <strong className="underline">File</strong> menu to begin.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onOpenDemoModal}
            className="flex items-center gap-2 px-6 py-3 neo-btn neo-btn-primary text-xl"
          >
            <Sparkles size={24} strokeWidth={2.5} />
            Try Demo Dataset
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="neo-card p-6 bg-[#ffe45e]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-black flex items-center gap-2 uppercase tracking-tight">
          <Database size={28} strokeWidth={2.5} className="text-black" />
          Dataset Preview
        </h2>
        <span className="text-xs font-bold text-white bg-black px-3 py-1 uppercase border-[2px] border-black">
          First 10 rows
        </span>
      </div>

      <div className="overflow-x-auto border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-black border-b-[3px] border-black">
              {Object.keys(dataPreview?.[0] || {}).map(k => (
                <th key={k} className="py-3 px-4 text-left text-xs font-black text-white uppercase tracking-widest border-r-[3px] border-black last:border-r-0">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataPreview?.map((row, i) => (
              <tr key={i} className="border-b-[3px] border-black last:border-b-0 hover:bg-yellow-100 transition-none">
                {Object.values(row).map((v, j) => (
                  <td key={j} className="py-3 px-4 text-black font-bold border-r-[3px] border-black last:border-r-0">
                    {v !== null ? v.toString() : <span className="text-red-500 font-black">NaN</span>}
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
