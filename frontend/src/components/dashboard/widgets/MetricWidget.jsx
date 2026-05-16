import React, { useState, useEffect } from 'react';
import { getDashboardMetrics } from '../../../api/client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MetricWidget = ({ widget }) => {
  const { column, aggregation, label, color = '#ffe45e' } = widget.config;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (column && aggregation) {
      fetchMetric();
    }
  }, [column, aggregation]);

  const fetchMetric = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboardMetrics({ column, aggregation });
      setData(result.value);
    } catch (err) {
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '--';
    if (typeof num !== 'number') return num;
    if (Number.isInteger(num)) return num.toLocaleString();
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isConfigured = column && aggregation;

  if (!isConfigured) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <p className="font-black text-gray-300 uppercase text-sm tracking-wider">SELECT COLUMN</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white flex flex-col justify-center p-6 relative overflow-hidden" style={{ borderLeft: `6px solid ${color}` }}>
      {loading && <div className="absolute top-2 right-2 text-[10px] font-black animate-pulse text-gray-400">UPDATING...</div>}
      
      <div className="mb-1">
        <p className="text-xs font-black uppercase text-gray-500 tracking-wider truncate">
          {label || `${aggregation} OF ${column}`}
        </p>
      </div>
      
      <div className="flex items-end gap-3">
        {error ? (
          <h3 className="text-xl font-black text-[#ff499e] uppercase">{error}</h3>
        ) : (
          <h3 className="text-4xl md:text-5xl font-black text-black truncate" title={formatNumber(data)}>
            {formatNumber(data)}
          </h3>
        )}
      </div>
    </div>
  );
};

export default MetricWidget;
