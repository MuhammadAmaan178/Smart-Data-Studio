from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
import math
from services.data_processor import global_store

dashboard_bp = Blueprint('dashboard', __name__)

def check_df():
    df = global_store.get('df')
    if df is None:
        return None, jsonify({"error": "No dataset loaded"}), 400
    return df, None, None

def safe_cast(val):
    if pd.isna(val) or val is pd.NaT:
        return None
    if isinstance(val, (np.integer, int)):
        return int(val)
    if isinstance(val, (np.floating, float)):
        if math.isnan(val) or math.isinf(val):
            return None
        return float(val)
    if isinstance(val, np.ndarray):
        return [safe_cast(x) for x in val]
    return val

@dashboard_bp.route('/metrics', methods=['POST'])
def get_dashboard_metrics():
    df, err, status = check_df()
    if err: return err, status
    
    data = request.json
    col = data.get('column')
    agg = data.get('aggregation')
    
    if not col or col not in df.columns:
        return jsonify({"error": "Valid column is required"}), 400
    if not agg:
        return jsonify({"error": "Aggregation type is required"}), 400
        
    try:
        series = df[col]
        val = None
        
        if agg.upper() == 'COUNT':
            val = series.count()
        elif agg.upper() == 'SUM':
            val = series.sum()
        elif agg.upper() == 'MEAN':
            val = series.mean()
        elif agg.upper() == 'MIN':
            val = series.min()
        elif agg.upper() == 'MAX':
            val = series.max()
        elif agg.upper() == 'MEDIAN':
            val = series.median()
        else:
            return jsonify({"error": "Invalid aggregation type"}), 400
            
        return jsonify({
            "column": col,
            "aggregation": agg,
            "value": safe_cast(val)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@dashboard_bp.route('/chart-data', methods=['POST'])
def get_chart_data():
    df, err, status = check_df()
    if err: return err, status
    
    data = request.json
    x_col = data.get('x_column')
    y_col = data.get('y_column')
    chart_type = data.get('chart_type', '').upper()
    agg = data.get('aggregation', 'MEAN').upper()
    
    if not x_col or x_col not in df.columns:
        return jsonify({"error": "Valid X column is required"}), 400
        
    try:
        result_data = []
        
        if chart_type in ['BAR', 'LINE', 'AREA']:
            if not y_col or y_col not in df.columns:
                return jsonify({"error": "Valid Y column required for this chart type"}), 400
            
            # Group by X and aggregate Y
            if agg == 'COUNT':
                grouped = df.groupby(x_col)[y_col].count()
            elif agg == 'SUM':
                grouped = df.groupby(x_col)[y_col].sum()
            elif agg == 'MEAN':
                grouped = df.groupby(x_col)[y_col].mean()
            elif agg == 'MIN':
                grouped = df.groupby(x_col)[y_col].min()
            elif agg == 'MAX':
                grouped = df.groupby(x_col)[y_col].max()
            else:
                grouped = df.groupby(x_col)[y_col].mean()
                
            # Limit to top 50 categories to prevent chart chaos if many categories
            if len(grouped) > 50:
                grouped = grouped.head(50)
                
            for k, v in grouped.items():
                result_data.append({x_col: safe_cast(k), y_col: safe_cast(v)})
                
        elif chart_type == 'SCATTER':
            sample = df[[x_col, y_col]].dropna().head(500)
            return jsonify({
              'data': sample.rename(columns={x_col:'x', y_col:'y'}).to_dict('records'),
              'x_key': 'x', 'y_key': 'y'
            })
                
        elif chart_type == 'PIE':
            # Value counts of X
            counts = df[x_col].value_counts().head(10)
            for k, v in counts.items():
                result_data.append({x_col: safe_cast(k), "value": safe_cast(v)})
            y_col = "value"
            
        elif chart_type == 'HISTOGRAM':
            # Compute bins
            numeric_series = pd.to_numeric(df[x_col], errors='coerce').dropna()
            if len(numeric_series) > 0:
                counts, bins = np.histogram(numeric_series, bins=20)
                for i in range(len(counts)):
                    bin_label = f"{safe_cast(bins[i]):.1f} - {safe_cast(bins[i+1]):.1f}"
                    result_data.append({x_col: bin_label, "count": safe_cast(counts[i])})
            y_col = "count"
            

        else:
            return jsonify({"error": "Unsupported chart type"}), 400

        return jsonify({
            "data": result_data,
            "x_key": x_col,
            "y_key": y_col
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400
