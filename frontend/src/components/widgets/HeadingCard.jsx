import React from 'react';
import { Type } from 'lucide-react';

// Defaults — keep in sync with RightSidebar DEF_HEADING
const DEFAULT_SETTINGS = {
  text:            'New Heading',
  fontSize:        'text-3xl',
  fontWeight:      'font-bold',
  textAlign:       'text-left',
  textDecoration:  'no-underline',
  fontStyle:       'not-italic',
  color:           '#111827',
  fontFamily:      'font-sans',
  backgroundColor: 'transparent',
};

const HeadingCard = ({ id, settings, isSelected, onClick }) => {
  const s = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };

  // All typography properties map to static Tailwind classes (safe for purge).
  // color + backgroundColor use inline style because they're arbitrary hex values.
  const textCls = [
    s.fontFamily,
    s.fontSize,
    s.fontWeight,
    s.textAlign,
    s.fontStyle,
    s.textDecoration,
  ].join(' ');

  const hasBg = s.backgroundColor && s.backgroundColor !== 'transparent';

  const wrapperStyle = {
    ...(hasBg ? { backgroundColor: s.backgroundColor } : {}),
  };

  const textStyle = {
    color: s.color || undefined,
  };

  const hasContent = settings && settings.text;

  return (
    <div
      className={`w-full h-full flex items-center px-4 py-2 transition-none cursor-pointer overflow-hidden ${
        hasBg ? '' : 'bg-white'
      } ${isSelected ? 'border-[3px] border-black outline outline-[3px] outline-[#ff499e]' : 'border-[3px] border-transparent'}`}
      style={wrapperStyle}
      onClick={onClick}
    >
      {hasContent ? (
        <span
          className={`select-none w-full leading-tight ${textCls}`}
          style={textStyle}
        >
          {s.text}
        </span>
      ) : (
        <div className="flex flex-col items-center justify-center w-full text-black select-none uppercase">
          <Type size={24} className="mb-1 text-black" strokeWidth={3} />
          <p className="text-xs font-black">Heading Block</p>
          <p className="text-[10px] font-bold mt-0.5 text-gray-700">Click to configure</p>
        </div>
      )}
    </div>
  );
};

export default HeadingCard;
