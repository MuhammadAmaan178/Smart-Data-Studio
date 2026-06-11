import React from 'react';

const Footer = () => {
  return (
    <footer className="h-6 bg-blue-600 dark:bg-blue-800 text-blue-100
                       flex items-center justify-between px-4 text-[10px] shrink-0 font-medium">
      <div className="flex items-center gap-3">
        <span>⚡ Smart DataStudio MVP</span>
        <span className="opacity-60">|</span>
        <span>Flask 3 · React 19 · Tailwind v4</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
        <span>Backend: HF Space</span>
      </div>
    </footer>
  );
};

export default Footer;

