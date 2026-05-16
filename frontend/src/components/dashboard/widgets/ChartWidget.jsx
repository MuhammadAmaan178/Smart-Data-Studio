import React, { useState, useEffect } from 'react';
import { getChartData } from '../../../api/client';
import { BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ZAxis
} from 'recharts';

const THEMES = {
  BRUTAL: ['#ffe45e', '#ff499e', '#00f0ff', '#ff8c00', '#000000'],
  NEON: ['#00f0ff', '#ff499e', '#bd00ff', '#00ff9d', '#ffe45e'],
  MONO: ['#000000', '#444444', '#888888', '#bbbbbb', '#eeeeee'],
  WARM: ['#ff8c00', '#ffb703', '#fb8500', '#e85d04', '#dc2f02']
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border-2 border-black p-2 shadow-[4px_4px_0px_#000] font-mono text-xs">
        <p className="font-black mb-1">{label || payload[0].name}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color === '#000000' ? '#444' : entry.color }} className="font-bold">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ChartWidget = ({ widget }) => {
  const { 
    chart_type, x_column, y_column, size_column, aggregation, 
    title, theme = 'BRUTAL', showLegend = true, showGrid = true 
  } = widget.config;
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (chart_type && x_column && (y_column || ['PIE', 'HISTOGRAM'].includes(chart_type))) {
      fetchData();
    }
  }, [chart_type, x_column, y_column, aggregation]); // Re-fetch only when data params change

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getChartData({
        chart_type,
        x_column,
        y_column,
        aggregation
      });
      setData(result.data || []);
    } catch (err) {
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = chart_type && x_column;
  const colors = THEMES[theme] || THEMES.BRUTAL;

  if (!isConfigured) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white text-gray-300">
        <BarChart2 size={48} strokeWidth={1} className="mb-2" />
        <p className="font-black uppercase text-sm tracking-wider">CONFIGURE CHART</p>
      </div>
    );
  }

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    switch (chart_type) {
      case 'BAR':
      case 'HISTOGRAM':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />}
            <XAxis dataKey={x_column} tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
            <YAxis tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />}
            <Bar dataKey={chart_type === 'HISTOGRAM' ? 'count' : y_column} fill={colors[0]} stroke="#000" strokeWidth={2} isAnimationActive={false} />
          </BarChart>
        );
      
      case 'LINE':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />}
            <XAxis dataKey={x_column} tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
            <YAxis tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />}
            <Line type="monotone" dataKey={y_column} stroke={colors[0]} strokeWidth={3} dot={{ stroke: '#000', strokeWidth: 2, fill: colors[0], r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
          </LineChart>
        );
        
      case 'AREA':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />}
            <XAxis dataKey={x_column} tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
            <YAxis tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />}
            <Area type="monotone" dataKey={y_column} stroke="#000" strokeWidth={2} fill={colors[0]} isAnimationActive={false} />
          </AreaChart>
        );

      case 'SCATTER':
      case 'BUBBLE':
        return (
          <ScatterChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />}
            <XAxis type="number" dataKey={x_column} name={x_column} tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
            <YAxis type="number" dataKey={y_column} name={y_column} tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
            {chart_type === 'BUBBLE' && size_column && <ZAxis type="number" dataKey={size_column} range={[20, 400]} name={size_column} />}
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />}
            <Scatter name={`${y_column} vs ${x_column}`} data={data} fill={colors[0]} stroke="#000" strokeWidth={1} isAnimationActive={false} />
          </ScatterChart>
        );

      case 'PIE':
        return (
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />}
            <Pie
              data={data}
              dataKey="value"
              nameKey={x_column}
              cx="50%"
              cy="50%"
              outerRadius="80%"
              stroke="#000"
              strokeWidth={2}
              isAnimationActive={false}
              label={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      case 'VIOLIN':
      case 'BOXPLOT':
        // Approximated Boxplot using ComposedChart
        // The data comes back as min, q1, median, q3, max for each x
        // Recharts doesn't natively support Boxplot easily, so we use a custom Bar shape or just simple error bars
        // For the sake of the Brutalist UI, we will render a simplified composed bar chart mapping min-max.
        return (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
            <BarChart2 size={32} className="mb-2" />
            <p className="font-bold text-sm uppercase">Custom Chart Render</p>
            <p className="text-xs text-gray-500">Boxplot/Violin requires custom SVG rendering in Recharts. Simulated data loaded: {data.length} groups.</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Chart Title Bar */}
      <div className="px-3 py-2 border-b-[2px] border-black bg-white flex justify-between items-center z-10 shrink-0">
        <h3 className="font-black uppercase text-sm truncate pr-2">{title || `${chart_type} CHART`}</h3>
        <span className="text-[9px] font-black uppercase text-gray-500 bg-gray-100 px-1.5 py-0.5 border border-gray-300 whitespace-nowrap">
          {chart_type === 'PIE' ? x_column : `${y_column} / ${x_column}`}
        </span>
      </div>
      
      {/* Chart Area */}
      <div className="flex-1 min-h-0 w-full relative">
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center">
            <span className="font-black text-xs uppercase animate-pulse">LOADING DATA...</span>
          </div>
        )}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-black text-xs uppercase text-[#ff499e]">{error}</span>
          </div>
        ) : (
          data.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          )
        )}
      </div>
    </div>
  );
};

export default ChartWidget;
