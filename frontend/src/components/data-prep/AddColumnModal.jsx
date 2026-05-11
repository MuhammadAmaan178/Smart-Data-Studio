import React, { useState } from 'react';
import { X } from 'lucide-react';

// ── Reusable dark-mode-aware input/select primitives ──────────────
const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
const selectCls = "border border-gray-300 dark:border-gray-600 rounded p-1 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200";
const selectFullCls = `${selectCls} w-full`;
const formBoxCls = "space-y-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

const AddColumnModal = ({ isOpen, onClose, columns, onApply }) => {
  const [newColName, setNewColName] = useState('');
  const [method, setMethod] = useState('constant');
  const [params, setParams] = useState({
    value: '', col1: '', col2: '', operator: '+', separator: '',
    target_col: '', condition_op: '>', condition_val: '', true_val: '', false_val: '',
    date_col: '', extract_part: 'year', math_op: 'round'
  });

  if (!isOpen) return null;

  const handleParamChange = (key, val) => setParams(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newColName) { alert('Please provide a new column name'); return; }

    let methodParams = {};
    switch (method) {
      case 'constant':      methodParams = { value: params.value }; break;
      case 'arithmetic':    methodParams = { col1: params.col1, operator: params.operator, col2: params.col2 }; break;
      case 'string_concat': methodParams = { col1: params.col1, separator: params.separator, col2: params.col2 }; break;
      case 'conditional':   methodParams = { target_col: params.target_col, condition_op: params.condition_op, condition_val: params.condition_val, true_val: params.true_val, false_val: params.false_val }; break;
      case 'date_extract':  methodParams = { date_col: params.date_col, extract_part: params.extract_part }; break;
      case 'advanced_math': methodParams = { target_col: params.target_col, math_op: params.math_op }; break;
      default: break;
    }

    onApply({ action: 'add_column', new_column_name: newColName, method, parameters: methodParams });
    setNewColName('');
    onClose();
  };

  const renderFormFields = () => {
    switch (method) {
      case 'constant':
        return (
          <div>
            <label className={labelCls}>Value</label>
            <input type="text" value={params.value} onChange={e => handleParamChange('value', e.target.value)} className={inputCls} placeholder="Number or String..." />
          </div>
        );
      case 'arithmetic':
        return (
          <div className={formBoxCls}>
            <label className={labelCls}>Arithmetic Equation</label>
            <div className="flex items-center space-x-2">
              <select value={params.col1} onChange={e => handleParamChange('col1', e.target.value)} className={selectFullCls}>
                <option value="">Select Col 1...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={params.operator} onChange={e => handleParamChange('operator', e.target.value)} className={selectCls}>
                <option value="+">+</option><option value="-">-</option>
                <option value="*">*</option><option value="/">/</option>
              </select>
              <select value={params.col2} onChange={e => handleParamChange('col2', e.target.value)} className={selectFullCls}>
                <option value="">Select Col 2...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        );
      case 'string_concat':
        return (
          <div className={formBoxCls}>
            <label className={labelCls}>Text Combine</label>
            <div className="flex items-center space-x-2">
              <select value={params.col1} onChange={e => handleParamChange('col1', e.target.value)} className={selectFullCls}>
                <option value="">Select Col 1...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="text" value={params.separator} onChange={e => handleParamChange('separator', e.target.value)} placeholder="Sep" className="w-16 border border-gray-300 dark:border-gray-600 rounded p-1 text-sm text-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200" />
              <select value={params.col2} onChange={e => handleParamChange('col2', e.target.value)} className={selectFullCls}>
                <option value="">Select Col 2...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        );
      case 'conditional':
        return (
          <div className={`${formBoxCls} space-y-3`}>
            <div className="flex space-x-2 items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-10">IF</span>
              <select value={params.target_col} onChange={e => handleParamChange('target_col', e.target.value)} className={`flex-1 ${selectCls}`}>
                <option value="">Target Col...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={params.condition_op} onChange={e => handleParamChange('condition_op', e.target.value)} className={`w-16 ${selectCls}`}>
                <option value=">">&gt;</option><option value="<">&lt;</option>
                <option value="==">==</option><option value="!=">!=</option>
              </select>
              <input type="text" value={params.condition_val} onChange={e => handleParamChange('condition_val', e.target.value)} placeholder="Value" className="flex-1 border border-gray-300 dark:border-gray-600 rounded p-1 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" />
            </div>
            <div className="flex space-x-2 items-center">
              <span className="text-sm font-medium text-green-700 dark:text-green-400 w-10">THEN</span>
              <input type="text" value={params.true_val} onChange={e => handleParamChange('true_val', e.target.value)} placeholder="Value if True" className={`w-full border border-gray-300 dark:border-gray-600 rounded p-1 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200`} />
            </div>
            <div className="flex space-x-2 items-center">
              <span className="text-sm font-medium text-red-700 dark:text-red-400 w-10">ELSE</span>
              <input type="text" value={params.false_val} onChange={e => handleParamChange('false_val', e.target.value)} placeholder="Value if False" className={`w-full border border-gray-300 dark:border-gray-600 rounded p-1 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200`} />
            </div>
          </div>
        );
      case 'date_extract':
        return (
          <div className={`${formBoxCls} flex space-x-2 items-end`}>
            <div className="flex-1">
              <label className={labelCls}>Date Column</label>
              <select value={params.date_col} onChange={e => handleParamChange('date_col', e.target.value)} className={`${selectFullCls} p-1.5`}>
                <option value="">Select Col...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className={labelCls}>Extract</label>
              <select value={params.extract_part} onChange={e => handleParamChange('extract_part', e.target.value)} className={`${selectFullCls} p-1.5`}>
                <option value="year">Year</option>
                <option value="month">Month</option>
                <option value="day">Day</option>
              </select>
            </div>
          </div>
        );
      case 'advanced_math':
        return (
          <div className={`${formBoxCls} flex space-x-2 items-end`}>
            <div className="flex-1">
              <label className={labelCls}>Target Column</label>
              <select value={params.target_col} onChange={e => handleParamChange('target_col', e.target.value)} className={`${selectFullCls} p-1.5`}>
                <option value="">Select Col...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className={labelCls}>Operation</label>
              <select value={params.math_op} onChange={e => handleParamChange('math_op', e.target.value)} className={`${selectFullCls} p-1.5`}>
                <option value="round">Round</option>
                <option value="log">Log</option>
                <option value="sqrt">Square Root</option>
              </select>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md transition-colors">
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add New Column</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>New Column Name</label>
            <input type="text" value={newColName} onChange={e => setNewColName(e.target.value)} className={inputCls} placeholder="e.g. Total_Sales" />
          </div>

          <div>
            <label className={labelCls}>Feature Engineering Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className={`${selectFullCls} p-2`}>
              <option value="constant">Constant Value</option>
              <option value="arithmetic">Basic Arithmetic</option>
              <option value="string_concat">Text Combine</option>
              <option value="conditional">Conditional Logic</option>
              <option value="date_extract">Date Extraction</option>
              <option value="advanced_math">Advanced Math</option>
            </select>
          </div>

          {renderFormFields()}

          <div className="mt-6 flex justify-end">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow font-medium cursor-pointer transition-colors">
              Create Column
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddColumnModal;
