import pandas as pd
import numpy as np
import datetime
import math
from flask import Blueprint, request, jsonify
from services.data_processor import global_store

features_bp = Blueprint('features', __name__)

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

@features_bp.route('/info', methods=['POST'])
def features_info():
    df = global_store.get('df')
    if df is None:
        return jsonify({
            "columns": [],
            "preview": []
        }), 200
    
    columns_info = [{"name": col, "dtype": str(df[col].dtype)} for col in df.columns]
    
    # Handle NaN for JSON serialization
    preview_df = df.head(3).replace({np.nan: None})
    # Safe cast all values
    preview_records = []
    for record in preview_df.to_dict('records'):
        preview_records.append({k: safe_cast(v) for k, v in record.items()})
    
    return jsonify({
        "columns": columns_info,
        "preview": preview_records
    })

@features_bp.route('/create-column', methods=['POST'])
def create_column():
    df, err, status = check_df()
    if err: return err, status
    
    data = request.json
    name = data.get('name')
    formula = data.get('formula')
    
    if not name or not formula:
        return jsonify({"error": "Name and formula are required"}), 400
    if name in df.columns:
        return jsonify({"error": f"Column '{name}' already exists"}), 400
        
    try:
        # Use eval to compute safe mathematical formulas
        new_col_series = df.eval(formula)
        df[name] = new_col_series
        global_store['df'] = df
        
        from app import CLEAN_LOG
        CLEAN_LOG.append({
            "action": "Feature Engineering",
            "column": name,
            "detail": f"Created via formula: {formula}",
            "rows_affected": len(df),
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        preview_vals = [safe_cast(v) for v in df[name].head(5).tolist()]
        return jsonify({
            "success": True,
            "new_column_name": name,
            "preview_values": preview_vals
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@features_bp.route('/rename-column', methods=['POST'])
def rename_column():
    df, err, status = check_df()
    if err: return err, status
    
    data = request.json
    old_name = data.get('old_name')
    new_name = data.get('new_name')
    
    if not old_name or not new_name:
        return jsonify({"error": "Old and new names are required"}), 400
    if old_name not in df.columns:
        return jsonify({"error": f"Column '{old_name}' not found"}), 400
    if new_name in df.columns:
        return jsonify({"error": f"Column '{new_name}' already exists"}), 400
        
    df.rename(columns={old_name: new_name}, inplace=True)
    global_store['df'] = df
    
    from app import CLEAN_LOG
    CLEAN_LOG.append({
        "action": "Feature Engineering",
        "column": new_name,
        "detail": f"Renamed from {old_name}",
        "rows_affected": len(df),
        "timestamp": datetime.datetime.now().isoformat()
    })
    
    return jsonify({"success": True})

@features_bp.route('/drop-column', methods=['POST'])
def drop_column():
    df, err, status = check_df()
    if err: return err, status
    
    data = request.json
    col = data.get('column')
    
    if not col or col not in df.columns:
        return jsonify({"error": "Valid column is required"}), 400
        
    df.drop(columns=[col], inplace=True)
    global_store['df'] = df
    
    from app import CLEAN_LOG
    CLEAN_LOG.append({
        "action": "Feature Engineering",
        "column": col,
        "detail": "Dropped column",
        "rows_affected": len(df),
        "timestamp": datetime.datetime.now().isoformat()
    })
    
    return jsonify({
        "success": True,
        "remaining_columns": len(df.columns)
    })

@features_bp.route('/bin-column', methods=['POST'])
def bin_column():
    df, err, status = check_df()
    if err: return err, status
    
    data = request.json
    col = data.get('column')
    bins = data.get('bins')
    labels = data.get('labels')
    
    if not col or col not in df.columns:
        return jsonify({"error": "Valid column is required"}), 400
    if not isinstance(bins, int) or bins < 2:
        return jsonify({"error": "Bins must be integer >= 2"}), 400
    if not labels or len(labels) != bins:
        return jsonify({"error": "Number of labels must match number of bins"}), 400
        
    try:
        new_col = f"{col}_binned"
        df[new_col] = pd.cut(df[col], bins=bins, labels=labels)
        global_store['df'] = df
        
        value_counts = df[new_col].value_counts().to_dict()
        value_counts = {str(k): int(v) for k, v in value_counts.items()}
        
        from app import CLEAN_LOG
        CLEAN_LOG.append({
            "action": "Feature Engineering",
            "column": new_col,
            "detail": f"Binned {col} into {bins} categories",
            "rows_affected": len(df),
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        return jsonify({
            "success": True,
            "new_column": new_col,
            "value_counts": value_counts
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@features_bp.route('/extract-date', methods=['POST'])
def extract_date():
    df, err, status = check_df()
    if err: return err, status
    
    data = request.json
    col = data.get('column')
    parts = data.get('parts', [])
    
    if not col or col not in df.columns:
        return jsonify({"error": "Valid column is required"}), 400
    if not parts:
        return jsonify({"error": "No parts selected"}), 400
        
    try:
        temp_dt = pd.to_datetime(df[col], errors='coerce')
        new_columns = []
        for part in parts:
            new_col = f"{col}_{part}"
            if part == 'year': df[new_col] = temp_dt.dt.year
            elif part == 'month': df[new_col] = temp_dt.dt.month
            elif part == 'day': df[new_col] = temp_dt.dt.day
            elif part == 'weekday': df[new_col] = temp_dt.dt.weekday
            elif part == 'quarter': df[new_col] = temp_dt.dt.quarter
            new_columns.append(new_col)
            
        global_store['df'] = df
        
        from app import CLEAN_LOG
        CLEAN_LOG.append({
            "action": "Feature Engineering",
            "column": col,
            "detail": f"Extracted date parts: {', '.join(parts)}",
            "rows_affected": len(df),
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        return jsonify({
            "success": True,
            "new_columns": new_columns
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@features_bp.route('/encode-column', methods=['POST'])
def encode_column():
    df, err, status = check_df()
    if err: return err, status
    
    data = request.json
    col = data.get('column')
    method = data.get('method')
    
    if not col or col not in df.columns:
        return jsonify({"error": "Valid column is required"}), 400
        
    try:
        new_columns = []
        mapping = {}
        
        if method == 'label':
            # Create a categorical type
            cat_series = df[col].astype('category')
            new_col_name = f"{col}_encoded"
            df[new_col_name] = cat_series.cat.codes
            # Build mapping {category: code}
            for code, category in enumerate(cat_series.cat.categories):
                mapping[str(category)] = int(code)
            new_columns.append(new_col_name)
            detail = "Applied label encoding"
            
        elif method == 'onehot':
            df = pd.get_dummies(df, columns=[col], drop_first=False)
            new_columns = [c for c in df.columns if c.startswith(f"{col}_")]
            detail = "Applied one-hot encoding"
            
        else:
            return jsonify({"error": "Invalid encoding method"}), 400
            
        global_store['df'] = df
        
        from app import CLEAN_LOG
        CLEAN_LOG.append({
            "action": "Feature Engineering",
            "column": col,
            "detail": detail,
            "rows_affected": len(df),
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        return jsonify({
            "success": True,
            "new_columns": new_columns,
            "mapping": mapping if method == 'label' else None
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@features_bp.route('/scale-column', methods=['POST'])
def scale_column():
    df, err, status = check_df()
    if err: return err, status
    
    data = request.json
    cols = data.get('columns', [])
    method = data.get('method')
    
    if not cols:
        return jsonify({"error": "Columns are required"}), 400
    missing = [c for c in cols if c not in df.columns]
    if missing:
        return jsonify({"error": f"Columns not found: {', '.join(missing)}"}), 400
        
    try:
        from sklearn.preprocessing import MinMaxScaler, StandardScaler, RobustScaler
        if method == 'minmax': scaler = MinMaxScaler()
        elif method == 'standard': scaler = StandardScaler()
        elif method == 'robust': scaler = RobustScaler()
        else: return jsonify({"error": "Invalid scaling method"}), 400
        
        df[cols] = scaler.fit_transform(df[cols])
        global_store['df'] = df
        
        from app import CLEAN_LOG
        CLEAN_LOG.append({
            "action": "Feature Engineering",
            "column": ', '.join(cols),
            "detail": f"Scaled using {method}",
            "rows_affected": len(df),
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        return jsonify({
            "success": True,
            "columns_scaled": cols
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@features_bp.route('/string-ops', methods=['POST'])
def string_ops():
    df, err, status = check_df()
    if err: return err, status
    
    data = request.json
    col = data.get('column')
    operation = data.get('operation')
    
    if not col or col not in df.columns:
        return jsonify({"error": "Valid column is required"}), 400
        
    try:
        initial_non_null = int(df[col].notna().sum())
        
        if operation == 'upper':
            df[col] = df[col].astype(str).str.upper()
        elif operation == 'lower':
            df[col] = df[col].astype(str).str.lower()
        elif operation == 'strip':
            df[col] = df[col].astype(str).str.strip()
        elif operation == 'remove_special':
            df[col] = df[col].astype(str).str.replace(r'[^a-zA-Z0-9\s]', '', regex=True)
        elif operation == 'extract_numbers':
            df[col] = df[col].astype(str).str.extract(r'(\d+\.?\d*)', expand=False)
        else:
            return jsonify({"error": "Invalid operation"}), 400
            
        global_store['df'] = df
        
        from app import CLEAN_LOG
        CLEAN_LOG.append({
            "action": "Feature Engineering",
            "column": col,
            "detail": f"Applied string operation: {operation}",
            "rows_affected": initial_non_null,
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        return jsonify({
            "success": True,
            "cells_affected": initial_non_null
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@features_bp.route('/preview', methods=['POST', 'GET'])
def preview():
    df = global_store.get('df')
    if df is None:
        return jsonify([]), 200
    
    preview_df = df.head(5).replace({np.nan: None})
    preview_records = []
    for record in preview_df.to_dict('records'):
        preview_records.append({k: safe_cast(v) for k, v in record.items()})
        
    return jsonify(preview_records)
