import React from 'react';
import { Calculator } from 'lucide-react';

// Defaults — keep in sync with RightSidebar DEF_METRIC
const DEFAULT_SETTINGS = {
  fontSize:        'text-4xl',
  fontWeight:      'font-bold',
  textAlign:       'text-center',
  textDecoration:  'no-underline',
  fontStyle:       'not-italic',
  color:           '',
  fontFamily:      'font-sans',
  backgroundColor: 'transparent',
};

const MetricCard = ({ id, metricData, settings, isSelected, onClick }) => {
  const s = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };

  const hasBg = s.backgroundColor && s.backgroundColor !== 'transparent';
  const hasColor = !!s.color;

  // Tailwind classes for the value text
  const valueCls = [
    s.fontFamily,
    s.fontSize,
    s.fontWeight,
    s.fontStyle,
    s.textDecoration,
    // text-align on the outer wrapper via textAlign
  ].join(' ');

  const wrapperStyle = {
    ...(hasBg ? { backgroundColor: s.backgroundColor } : {}),
  };

  const valueStyle = {
    ...(hasColor ? { color: s.color } : {}),
  };

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center p-4 transition-none cursor-pointer ${
        hasBg ? '' : 'bg-white'
      } ${s.textAlign} ${isSelected ? 'border-[3px] border-black outline outline-[3px] outline-[#ff499e]' : 'border-[3px] border-transparent'}`}
      style={wrapperStyle}
      onClick={onClick}
    >
      {metricData ? (
        <>
          {/* Label row */}
          <p className="text-xs font-black uppercase tracking-widest text-black mb-2">
            {metricData.label} of {metricData.column}
          </p>

          {/* Value — all typography classes applied */}
          <p
            className={`font-mono ${valueCls} ${!hasColor ? 'text-black' : ''}`}
            style={valueStyle}
          >
            {metricData.value}
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center text-black select-none uppercase">
          <Calculator size={36} className="mb-2 text-black" strokeWidth={2.5} />
          <p className="text-sm font-black">Metric Card</p>
          <p className="text-xs font-bold mt-1 text-gray-700">Click to configure</p>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
