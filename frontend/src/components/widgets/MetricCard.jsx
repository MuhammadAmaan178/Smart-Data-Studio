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
      className={`w-full h-full flex flex-col items-center justify-center rounded-lg p-4 transition-all cursor-pointer ${
        hasBg ? '' : 'bg-white dark:bg-gray-800'
      } ${s.textAlign} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      style={wrapperStyle}
      onClick={onClick}
    >
      {metricData ? (
        <>
          {/* Label row */}
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
            {metricData.label} of {metricData.column}
          </p>

          {/* Value — all typography classes applied */}
          <p
            className={`font-mono ${valueCls} ${!hasColor ? 'text-gray-800 dark:text-gray-100' : ''}`}
            style={valueStyle}
          >
            {metricData.value}
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center text-gray-400 dark:text-gray-500 select-none">
          <Calculator size={32} className="mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium">Metric Card</p>
          <p className="text-xs mt-1">Click to configure</p>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
