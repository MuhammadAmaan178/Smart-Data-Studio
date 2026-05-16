import React, { useState, useRef } from 'react';
import { Settings, X } from 'lucide-react';

const useDraggable = (initialX, initialY, onPositionChange) => {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!dragging.current) return;
    const newX = Math.round((e.clientX - offset.current.x) / 24) * 24;
    const newY = Math.round((e.clientY - offset.current.y) / 24) * 24;
    const snapped = { x: Math.max(0, newX), y: Math.max(0, newY) };
    setPos(snapped);
    onPositionChange?.(snapped);
  };

  const onMouseUp = () => {
    dragging.current = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  return { pos, onMouseDown };
};

const CanvasWidgetWrapper = ({ widget, updateWidget, removeWidget, selectWidget, isSelected, children }) => {
  
  const { pos, onMouseDown } = useDraggable(
    widget.x, widget.y,
    (newPos) => updateWidget(widget.id, { x: newPos.x, y: newPos.y })
  );

  const getMinSize = () => {
    switch (widget.type) {
      case 'heading': return { w: 200, h: 60 };
      case 'metric': return { w: 180, h: 120 };
      case 'chart': return { w: 300, h: 200 };
      default: return { w: 200, h: 150 };
    }
  };

  const onResizeMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = widget.width;
    const startH = widget.height;
    
    const min = getMinSize();

    const onMove = (e) => {
      const newW = Math.max(min.w, startW + (e.clientX - startX));
      const newH = Math.max(min.h, startH + (e.clientY - startY));
      updateWidget(widget.id, { width: newW, height: newH });
    };
    
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div 
      className={`absolute z-10 group bg-white border-[2px] ${isSelected ? 'border-[#ffe45e]' : 'border-black'} flex flex-col transition-shadow ${isSelected ? 'shadow-[8px_8px_0px_#000] z-20' : 'shadow-[4px_4px_0px_#000]'}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: widget.width,
        height: widget.height,
        cursor: 'default'
      }}
    >
      {/* Top Drag Handle Bar */}
      <div 
        onMouseDown={onMouseDown}
        className="h-3 bg-black w-full cursor-grab active:cursor-grabbing flex items-center justify-between group-hover:bg-gray-800 transition-colors shrink-0 relative"
      >
        {/* Actions visible on hover/select */}
        <div 
          className={`absolute top-0 right-0 -mt-3 mr-1 flex gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity z-30`}
          onMouseDown={e => e.stopPropagation()} // Prevent drag on button click
        >
          <button 
            onClick={(e) => { e.stopPropagation(); selectWidget(widget.id); }}
            className="bg-black text-white p-1 hover:bg-[#ffe45e] hover:text-black border-2 border-black cursor-pointer"
            title="Settings"
          >
            <Settings size={14} strokeWidth={3} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }}
            className="bg-[#ff499e] text-white p-1 hover:bg-red-600 border-2 border-black cursor-pointer"
            title="Delete"
          >
            <X size={14} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Widget Content */}
      <div 
        className="flex-1 w-full min-h-0 overflow-hidden cursor-pointer relative" 
        onClick={(e) => { e.stopPropagation(); selectWidget(widget.id); }}
      >
        {children}
      </div>

      {/* Manual Resize Handle */}
      <div 
        onMouseDown={onResizeMouseDown}
        className="absolute bottom-0 right-0 z-20"
        style={{
          width: 16,
          height: 16,
          cursor: 'se-resize',
          background: 'black',
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
        }}
      />
    </div>
  );
};

export default CanvasWidgetWrapper;
