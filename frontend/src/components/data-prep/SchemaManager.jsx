import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import AddColumnModal from './AddColumnModal';

const SchemaManager = ({ anomalyReport, onQueueAction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTypeChange = (col, newType) => {
    if (!newType) return;
    onQueueAction({ action: 'change_dtype', column: col, new_type: newType });
  };

  const handleDropColumn = (col) => {
    onQueueAction({ action: 'drop_column', column: col });
  };

  if (!anomalyReport) return null;
  const columns = Object.keys(anomalyReport.columns);

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4 border-b-[3px] border-black pb-2">
        <h3 className="text-xl font-black text-black uppercase tracking-tight">Schema Management</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1 text-sm bg-[#00f0ff]
                     text-black border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                     px-4 py-2 uppercase font-black
                     hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
                     transition-none cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Column</span>
        </button>
      </div>

      <div className="overflow-x-auto border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-black border-b-[3px] border-black">
              <th className="py-2 px-4 text-left text-xs font-black text-white uppercase tracking-widest border-r-[3px] border-black">Column</th>
              <th className="py-2 px-4 text-left text-xs font-black text-white uppercase tracking-widest border-r-[3px] border-black">Inferred Type</th>
              <th className="py-2 px-4 text-left text-xs font-black text-white uppercase tracking-widest border-r-[3px] border-black">Change Type</th>
              <th className="py-2 px-4 text-center text-xs font-black text-white uppercase tracking-widest">Delete</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(anomalyReport.columns).map(([col, info]) => (
              <tr key={col} className="border-b-[3px] border-black last:border-b-0 hover:bg-yellow-100 transition-none">
                <td className="py-2 px-4 font-bold text-black border-r-[3px] border-black">{col}</td>
                <td className="py-2 px-4 font-bold text-black border-r-[3px] border-black">{info.inferred_type}</td>
                <td className="py-2 px-4 border-r-[3px] border-black">
                  <select
                    className="neo-input p-1 text-xs bg-white cursor-pointer w-full"
                    onChange={(e) => handleTypeChange(col, e.target.value)}
                    defaultValue={
                      info.inferred_type.includes('int')   ? 'int'     :
                      info.inferred_type.includes('float') ? 'float'   :
                      info.inferred_type.includes('bool')  ? 'boolean' : 'string'
                    }
                  >
                    {info.possible_dtypes ? info.possible_dtypes.map(dtype => (
                      <option key={dtype} value={dtype}>{dtype}</option>
                    )) : (
                      <>
                        <option value="string">string</option>
                        <option value="int">int</option>
                        <option value="float">float</option>
                        <option value="boolean">boolean</option>
                      </>
                    )}
                  </select>
                </td>
                <td className="py-2 px-4 text-center">
                  <button
                    onClick={() => handleDropColumn(col)}
                    className="text-black bg-[#ff499e] border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] 
                               active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-none p-1.5 cursor-pointer inline-flex items-center justify-center"
                    title="Drop Column"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddColumnModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        columns={columns}
        onApply={(action) => onQueueAction(action)}
      />
    </div>
  );
};

export default SchemaManager;
