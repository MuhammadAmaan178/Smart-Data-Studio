import React from 'react';
import { BarChart2 } from 'lucide-react';

const ChartCard = ({ id, chartImage, isSelected, onClick }) => {
  return (
    <div
      className={`h-full w-full flex flex-col bg-white overflow-hidden transition-none ${isSelected ? 'border-[3px] border-black outline outline-[3px] outline-[#ff499e]' : 'border-[3px] border-transparent'}`}
      onClick={onClick}
    >
      {chartImage ? (
        <img
          src={chartImage}
          alt="Chart"
          className="w-full h-full"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-black cursor-pointer select-none uppercase">
          <BarChart2 size={36} className="mb-2 text-black" strokeWidth={2.5} />
          <p className="text-sm font-black">Chart Block</p>
          <p className="text-xs font-bold mt-1 text-gray-700">Click to configure</p>
        </div>
      )}
    </div>
  );
};

export default ChartCard;
