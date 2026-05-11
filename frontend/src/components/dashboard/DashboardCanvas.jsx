import React, { useState, useRef, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import RightSidebar from './RightSidebar';
import MetricCard from '../widgets/MetricCard';
import ChartCard from '../widgets/ChartCard';
import HeadingCard from '../widgets/HeadingCard';

/* ─── Custom WidthProvider via ResizeObserver ─────────────────────────
   Bypasses broken ESM named-exports from react-grid-layout.           */
const useContainerWidth = (ref) => {
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(ref.current);
    setWidth(ref.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [ref]);
  return width;
};

/* ─── Default sizes per widget type ──────────────────────────────── */
const DEFAULT_SIZES = {
  metric:  { w: 3,  h: 2,  minW: 2, minH: 1 },
  chart:   { w: 6,  h: 4,  minW: 4, minH: 3 },
  heading: { w: 12, h: 1,  minW: 3, minH: 1 },
};

/* ─── Default settings seeded on drop ──────────────────────────── */
const DEFAULT_WIDGET_SETTINGS = {
  heading: {
    text: 'New Heading', fontSize: 'text-3xl', fontWeight: 'font-bold',
    textAlign: 'text-left', textDecoration: 'no-underline',
    fontStyle: 'not-italic', color: '#111827', fontFamily: 'font-sans',
    backgroundColor: 'transparent',
  },
  metric: {
    column: '', metricType: 'mean',
    fontSize: 'text-4xl', fontWeight: 'font-bold',
    textAlign: 'text-center', textDecoration: 'no-underline',
    fontStyle: 'not-italic', color: '', fontFamily: 'font-sans',
    backgroundColor: 'transparent',
  },
};

const DashboardCanvas = ({ cards, setCards, layout, setLayout, anomalyReport }) => {
  const canvasRef = useRef(null);
  const gridWidth = useContainerWidth(canvasRef);

  /* ── Contextual Inspector State ───────────────────────────────── */
  const [selectedWidgetId, setSelectedWidgetId] = useState(null);
  const [widgetData, setWidgetData]             = useState({}); // { id → { chartImage?, metricData?, text? } }

  /* ── Widget Data Updaters ────────────────────────────────────── */
  const handleUpdateChart          = (id, image)    => setWidgetData(p => ({ ...p, [id]: { ...p[id], chartImage: image  } }));
  const handleUpdateMetric         = (id, data)     => setWidgetData(p => ({ ...p, [id]: { ...p[id], metricData: data   } }));
  const handleUpdateMetricSettings = (id, settings) => setWidgetData(p => ({ ...p, [id]: { ...p[id], settings           } }));
  const handleUpdateHeading        = (id, settings) => setWidgetData(p => ({ ...p, [id]: { ...p[id], settings           } }));

  /* ── Grid Handlers ───────────────────────────────────────────── */
  const onLayoutChange = newLayout => setLayout(newLayout);

  const handleDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('widgetType');
    if (!type) return;

    const rect  = canvasRef.current.getBoundingClientRect();
    const colW  = rect.width / 12;
    const rowH  = 30;
    const newX  = Math.max(0, Math.min(11, Math.floor((e.clientX - rect.left - 32) / colW)));
    const newY  = Math.max(0, Math.floor((e.clientY - rect.top  - 32) / rowH));

    const id = `widget-${Date.now()}`;
    const { w, h, minW = 2, minH = 1 } = DEFAULT_SIZES[type] ?? { w: 4, h: 4, minW: 2, minH: 1 };

    setLayout(prev => [...prev, { i: id, x: newX, y: newY, w, h, minW, minH }]);
    setCards(prev  => [...prev, { id, type }]);
    // Seed default typography settings immediately so the card renders correctly before the user opens Properties
    if (DEFAULT_WIDGET_SETTINGS[type]) {
      setWidgetData(prev => ({ ...prev, [id]: { settings: { ...DEFAULT_WIDGET_SETTINGS[type] } } }));
    }
  };

  const handleDragOver = e => e.preventDefault();

  const handleRemoveCard = (id) => {
    setLayout(prev => prev.filter(i => i.i !== id));
    setCards(prev  => prev.filter(c => c.id !== id));
    setWidgetData(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (selectedWidgetId === id) setSelectedWidgetId(null);
  };

  const handleCanvasClick = () => setSelectedWidgetId(null);

  /* ── Render Widgets ──────────────────────────────────────────── */
  const renderCard = (card) => {
    const data       = widgetData[card.id] || {};
    const isSelected = selectedWidgetId === card.id;
    const onClick    = (e) => { e.stopPropagation(); setSelectedWidgetId(card.id); };

    switch (card.type) {
      case 'metric':  return <MetricCard  id={card.id} metricData={data.metricData}   settings={data.settings ?? null} isSelected={isSelected} onClick={onClick} />;
      case 'chart':   return <ChartCard   id={card.id} chartImage={data.chartImage}    isSelected={isSelected} onClick={onClick} />;
      case 'heading': return <HeadingCard id={card.id} settings={data.settings ?? null} isSelected={isSelected} onClick={onClick} />;
      default:        return <div>Unknown Widget</div>;
    }
  };

  return (
    <div className="flex h-full w-full absolute inset-0">

      {/* ── Canvas Area ─────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        id="grid-container"
        className="flex-1 min-w-0 overflow-y-auto relative"
        style={{
          backgroundColor: 'var(--canvas-bg, #f1f5f9)',
          backgroundImage: 'radial-gradient(circle, var(--dot-color, #cbd5e1) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleCanvasClick}
      >
        {/* Empty state hint */}
        {cards.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl px-10 py-8 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="text-5xl mb-3">📊</div>
              <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-300">Your canvas is empty</h2>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Drag a widget from the Toolbox on the right to get started</p>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="p-6 min-h-[800px]">
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            width={gridWidth - 48} /* account for p-6 (24px × 2) */
            onLayoutChange={onLayoutChange}
            isDraggable={true}
            isResizable={true}
            margin={[12, 12]}
            containerPadding={[0, 0]}
            draggableHandle=".drag-handle"
          >
            {layout.map(item => {
              const card = cards.find(c => c.id === item.i);
              if (!card) return null;
              return (
                <div
                  key={item.i}
                  className="flex flex-col rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  {/* Drag Handle */}
                  <div className="drag-handle w-full h-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-blue-200 dark:hover:bg-blue-900/50 cursor-grab active:cursor-grabbing transition-colors shrink-0 flex items-center justify-center">
                    <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
                  </div>

                  {/* Remove button (visible on hover) */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveCard(item.i); }}
                    className="absolute top-0 right-1 z-20 text-[10px] text-gray-400 hover:text-red-500 transition-colors cursor-pointer leading-none py-0.5 px-1"
                    title="Remove widget"
                  >✕</button>

                  {/* Widget content */}
                  <div className="flex-1 overflow-hidden">
                    {renderCard(card)}
                  </div>
                </div>
              );
            })}
          </GridLayout>
        </div>
      </div>

      {/* ── Right Sidebar — fixed w-80 ───────────────────────────── */}
      <div className="w-80 shrink-0">
        <RightSidebar
          selectedWidgetId={selectedWidgetId}
          setSelectedWidgetId={setSelectedWidgetId}
          cards={cards}
          widgetData={widgetData}
          anomalyReport={anomalyReport}
          onUpdateChart={handleUpdateChart}
          onUpdateMetric={handleUpdateMetric}
          onUpdateMetricSettings={handleUpdateMetricSettings}
          onUpdateHeading={handleUpdateHeading}
        />
      </div>
    </div>
  );
};

export default DashboardCanvas;
