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
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Schema Management</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1 text-sm bg-indigo-50 dark:bg-indigo-900/40
                     text-indigo-600 dark:text-indigo-300
                     px-3 py-1 rounded
                     hover:bg-indigo-100 dark:hover:bg-indigo-900/70
                     transition-colors cursor-pointer font-medium"
        >
          <Plus size={16} />
          <span>Add Column</span>
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full bg-white dark:bg-gray-800 text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Column</th>
              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inferred Type</th>
              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change Type</th>
              <th className="py-2 px-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delete</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(anomalyReport.columns).map(([col, info]) => (
              <tr key={col} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="py-2 px-4 font-medium text-gray-700 dark:text-gray-200">{col}</td>
                <td className="py-2 px-4 text-gray-500 dark:text-gray-400">{info.inferred_type}</td>
                <td className="py-2 px-4">
                  <select
                    className="border border-gray-300 dark:border-gray-600 rounded p-1 text-xs
                               bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 capitalize"
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
                    className="text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1.5 rounded
                               hover:bg-red-50 dark:hover:bg-red-900/40 cursor-pointer inline-flex items-center justify-center"
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
