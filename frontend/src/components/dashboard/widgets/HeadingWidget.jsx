import React from 'react';

const HeadingWidget = ({ widget, updateWidget }) => {
  const { text = 'DASHBOARD TITLE', size = 'LARGE', align = 'LEFT' } = widget.config;

  const getSizeClass = () => {
    switch (size) {
      case 'SMALL': return 'text-xl';
      case 'MEDIUM': return 'text-3xl';
      case 'LARGE': return 'text-5xl';
      case 'HUGE': return 'text-7xl';
      default: return 'text-5xl';
    }
  };

  const getAlignClass = () => {
    switch (align) {
      case 'LEFT': return 'text-left';
      case 'CENTER': return 'text-center';
      case 'RIGHT': return 'text-right';
      default: return 'text-left';
    }
  };

  return (
    <div className={`w-full h-full flex flex-col justify-center p-4 bg-transparent`}>
      <h2 
        className={`font-black uppercase text-black ${getSizeClass()} ${getAlignClass()} outline-none hover:bg-gray-100 transition-colors`}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => updateWidget(widget.id, { config: { ...widget.config, text: e.target.innerText } })}
      >
        {text}
      </h2>
    </div>
  );
};

export default HeadingWidget;
