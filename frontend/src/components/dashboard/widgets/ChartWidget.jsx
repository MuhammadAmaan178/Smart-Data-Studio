import React, { useState, useEffect } from 'react';
import { getChartData, getFullDataset } from '../../../api/client';
import { BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ZAxis, ComposedChart, ReferenceLine
} from 'recharts';

const THEMES = {
  BRUTAL: ['#ffe45e', '#ff499e', '#00f0ff', '#ff8c00', '#000000'],
  NEON: ['#00f0ff', '#ff499e', '#bd00ff', '#00ff9d', '#ffe45e'],
  MONO: ['#000000', '#444444', '#888888', '#bbbbbb', '#eeeeee'],
  WARM: ['#ff8c00', '#ffb703', '#fb8500', '#e85d04', '#dc2f02']
};

const percentile = (arr, p) => {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

const BoxPlotShape = (props) => {
  const { x, y, width, height, payload, fill } = props;
  const { min, q1, median, q3, max } = payload;
  
  if (max === min) return null;
  const scale = height / (max - min);
  const q3Y = y + (max - q3) * scale;
  const q1Y = y + (max - q1) * scale;
  const medianY = y + (max - median) * scale;
  const cx = x + width / 2;

  return (
    <g>
      <line x1={cx} y1={y} x2={cx} y2={y + height} stroke="#000" strokeWidth={2} />
      <line x1={cx - width/4} y1={y} x2={cx + width/4} y2={y} stroke="#000" strokeWidth={2} />
      <line x1={cx - width/4} y1={y + height} x2={cx + width/4} y2={y + height} stroke="#000" strokeWidth={2} />
      <rect x={x} y={q3Y} width={width} height={q1Y - q3Y} fill={fill} stroke="#000" strokeWidth={2} />
      <line x1={x} y1={medianY} x2={x + width} y2={medianY} stroke="#000" strokeWidth={3} />
      <circle cx={cx} cy={medianY} r={4} fill="#fff" stroke="#000" strokeWidth={2} />
    </g>
  );
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
  const [rawValues, setRawValues] = useState([]);
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
      if (chart_type === 'BOXPLOT' || chart_type === 'VIOLIN') {
        const res = await getFullDataset();
        const rawData = res.data;
        
        const yValues = rawData
          .map(row => parseFloat(row[y_column]))
          .filter(v => !isNaN(v));
          
        setRawValues(yValues);
        setData([]);
        return;
      }

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
          <div style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={150}>
              <BarChart {...commonProps}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />}
                <XAxis dataKey={x_column} tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
                <YAxis tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
                <Tooltip content={<CustomTooltip />} />
                {showLegend && <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />}
                <Bar dataKey={chart_type === 'HISTOGRAM' ? 'count' : y_column} fill={colors[0]} stroke="#000" strokeWidth={2} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      
      case 'LINE':
        return (
          <div style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={150}>
              <LineChart {...commonProps}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />}
                <XAxis dataKey={x_column} tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
                <YAxis tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
                <Tooltip content={<CustomTooltip />} />
                {showLegend && <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />}
                <Line type="monotone" dataKey={y_column} stroke={colors[0]} strokeWidth={3} dot={{ stroke: '#000', strokeWidth: 2, fill: colors[0], r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
        
      case 'AREA':
        return (
          <div style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={150}>
              <AreaChart {...commonProps}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />}
                <XAxis dataKey={x_column} tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
                <YAxis tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
                <Tooltip content={<CustomTooltip />} />
                {showLegend && <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />}
                <Area type="monotone" dataKey={y_column} stroke="#000" strokeWidth={2} fill={colors[0]} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      case 'SCATTER':
      case 'BUBBLE':
        return (
          <div style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={150}>
              <ScatterChart {...commonProps}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />}
                <XAxis type="number" dataKey={x_column} name={x_column} tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
                <YAxis type="number" dataKey={y_column} name={y_column} tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }} stroke="#000" />
                {chart_type === 'BUBBLE' && size_column && <ZAxis type="number" dataKey={size_column} range={[20, 400]} name={size_column} />}
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                {showLegend && <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />}
                <Scatter name={`${y_column} vs ${x_column}`} data={data} fill={colors[0]} stroke="#000" strokeWidth={1} isAnimationActive={false} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );

      case 'PIE':
        return (
          <div style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={150}>
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
            </ResponsiveContainer>
          </div>
        );

      case 'BOXPLOT': {
        if (!rawValues || rawValues.length === 0) return null;
        
        const computeBoxStats = (values) => {
          const sorted = [...values].sort((a, b) => a - b);
          const q1 = percentile(sorted, 25);
          const median = percentile(sorted, 50);
          const q3 = percentile(sorted, 75);
          const iqr = q3 - q1;
          const min = Math.max(sorted[0], q1 - 1.5 * iqr);
          const max = Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr);
          return { min, q1, median, q3, max };
        };

        const stats = computeBoxStats(rawValues);
        const boxData = [
          { name: y_column, min: stats.min, q1: stats.q1, 
            median: stats.median, q3: stats.q3, max: stats.max,
            // For Bar: render from q1 to q3
            boxBottom: stats.q1,
            boxHeight: stats.q3 - stats.q1,
            // Invisible base bar to offset the box up from 0
            base: stats.q1 
          }
        ];

        return (
          <div style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height={widget.height ? widget.height - 80 : "100%"}>
              <ComposedChart data={boxData} margin={{top:20,right:30,left:20,bottom:20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000020" />
                <XAxis dataKey="name" tick={{ fontWeight: 'bold', fontSize: 11 }} />
                <YAxis domain={[stats.min - 0.5, stats.max + 0.5]} 
                       tick={{ fontWeight: 'bold', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    border: '2px solid black', 
                    borderRadius: 0, 
                    boxShadow: '4px 4px 0px #000',
                    background: 'white'
                  }}
                  formatter={(value, name) => [typeof value === 'number' ? value.toFixed(3) : value, name]}
                />
                
                {/* Whisker line — full range min to max */}
                <Bar dataKey="max" fill="transparent" stroke="none" />
                
                {/* Invisible base to push box up to Q1 */}
                <Bar dataKey="base" stackId="box" fill="transparent" stroke="none" />
                
                {/* IQR Box — Q1 to Q3 */}
                <Bar dataKey="boxHeight" stackId="box" 
                     fill="#ffe45e" stroke="black" strokeWidth={2}
                     label={false} />
                
                {/* Median line as a scatter dot */}
                <Scatter data={[{ name: y_column, value: stats.median }]}
                         dataKey="value" fill="black" shape={(props) => {
                           const { cx, cy } = props;
                           return <line x1={cx - 20} y1={cy} x2={cx + 20} y2={cy} 
                                        stroke="black" strokeWidth={3} />;
                         }} />
                         
                {/* Reference lines for whiskers */}
                <ReferenceLine y={stats.min} stroke="black" strokeWidth={2} 
                               strokeDasharray="4 2" 
                               label={{ value: `Min: ${stats.min.toFixed(2)}`, 
                                        position: 'right', fontSize: 10 }} />
                <ReferenceLine y={stats.max} stroke="black" strokeWidth={2}
                               strokeDasharray="4 2"
                               label={{ value: `Max: ${stats.max.toFixed(2)}`, 
                                        position: 'right', fontSize: 10 }} />
                <ReferenceLine y={stats.median} stroke="#ff499e" strokeWidth={2}
                               label={{ value: `Median: ${stats.median.toFixed(2)}`, 
                                        position: 'right', fontSize: 10, fill: '#ff499e' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        );
      }

      case 'VIOLIN': {
        if (!rawValues || rawValues.length === 0) return null;
        
        const gaussianKDE = (values, bandwidth) => {
          const min = Math.min(...values);
          const max = Math.max(...values);
          const points = 60;
          const step = (max - min) / points;
          
          return Array.from({ length: points + 1 }, (_, i) => {
            const x = min + i * step;
            const density = values.reduce((sum, v) => {
              const z = (x - v) / bandwidth;
              return sum + Math.exp(-0.5 * z * z) / 
                     (bandwidth * Math.sqrt(2 * Math.PI));
            }, 0) / values.length;
            return { 
              x: parseFloat(x.toFixed(3)), 
              density: parseFloat(density.toFixed(5)),
              negativeDensity: parseFloat((-density).toFixed(5))
            };
          });
        };

        const std = Math.sqrt(
          rawValues.reduce((sum, v) => {
            const mean = rawValues.reduce((a, b) => a + b, 0) / rawValues.length;
            return sum + Math.pow(v - mean, 2);
          }, 0) / rawValues.length
        );
        const bandwidth = 1.06 * std * Math.pow(rawValues.length, -0.2);

        const kdeData = gaussianKDE(rawValues, bandwidth);

        return (
          <div style={{ width: '100%', height: widget.height ? widget.height - 80 : "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={kdeData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#00000020" />
                <XAxis 
                  dataKey="x" 
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickCount={8}
                  tick={{ fontWeight: 'bold', fontSize: 11 }}
                  label={{ 
                    value: y_column, 
                    position: 'insideBottom', 
                    offset: -10,
                    fontWeight: 'bold'
                  }}
                />
                <YAxis 
                  tick={{ fontWeight: 'bold', fontSize: 11 }}
                  label={{ 
                    value: 'Density', 
                    angle: -90, 
                    position: 'insideLeft',
                    fontWeight: 'bold'
                  }}
                />
                <Tooltip
                  contentStyle={{
                    border: '2px solid black',
                    borderRadius: 0,
                    boxShadow: '4px 4px 0px #000',
                    background: 'white',
                    fontWeight: 'bold'
                  }}
                  formatter={(value, name) => [
                    Math.abs(value).toFixed(5), 
                    name === 'density' ? 'Density' : 'Mirror'
                  ]}
                  labelFormatter={(label) => `Value: ${label}`}
                />
                
                {/* Top half of violin */}
                <Area
                  type="monotone"
                  dataKey="density"
                  stroke="black"
                  strokeWidth={2}
                  fill={colors[0]}
                  fillOpacity={0.8}
                  dot={false}
                  activeDot={{ r: 4, fill: 'black' }}
                />
                
                {/* Bottom mirror half of violin */}
                <Area
                  type="monotone"
                  dataKey="negativeDensity"
                  stroke="black"
                  strokeWidth={2}
                  fill={colors[0]}
                  fillOpacity={0.8}
                  dot={false}
                  activeDot={{ r: 4, fill: 'black' }}
                />
                
                {/* Median reference line */}
                <ReferenceLine 
                  x={parseFloat(percentile(
                    [...rawValues].sort((a,b) => a-b), 50
                  ).toFixed(3))}
                  stroke="#ff499e" 
                  strokeWidth={2}
                  label={{ 
                    value: 'Median', 
                    position: 'top', 
                    fill: '#ff499e',
                    fontWeight: 'bold',
                    fontSize: 11
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      }

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
          (data.length > 0 || rawValues.length > 0) && (
            <div style={{ width: '100%', height: 'calc(100% - 40px)' }}>
              {renderChart()}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ChartWidget;
