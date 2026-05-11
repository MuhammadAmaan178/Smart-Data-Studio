import React from 'react';
import { BarChart2 } from 'lucide-react';

const ChartCard = ({ id, chartImage, isSelected, onClick }) => {
  return (
    <div
      className={`h-full w-full flex flex-col bg-white dark:bg-gray-800 rounded-lg overflow-hidden transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onClick}
    >
      {chartImage ? (
        <img
          src={chartImage}
          alt="Chart"
          className="w-full h-full"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 cursor-pointer select-none">
          <BarChart2 size={36} className="mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium">Chart Block</p>
          <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">Click to configure</p>
        </div>
      )}
    </div>
  );
};

export default ChartCard;
