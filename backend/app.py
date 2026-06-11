import os
from dotenv import load_dotenv
load_dotenv(override=True)

import numpy as np
import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS


from services.data_processor import global_store
from api.upload import upload_bp
from api.clean import clean_bp
from api.metrics import metrics_bp
from api.charts import charts_bp
from api.summary import summary_bp
from api.ml import ml_bp
from api.dl import dl_bp
from api.demo import demo_bp
from api.predict import predict_bp
from api.features import features_bp
from api.dashboard import dashboard_bp
from api.auth import auth_bp
from api.projects import projects_bp

app = Flask(__name__)
app.url_map.strict_slashes = False
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        from flask import Response
        res = Response()
        origin = request.headers.get('Origin', '*')
        res.headers['Access-Control-Allow-Origin'] = origin
        res.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        res.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        res.headers['Access-Control-Allow-Credentials'] = 'true'
        return res, 200

@app.route('/api/cors-test', methods=['GET', 'OPTIONS'])
def cors_test():
    return jsonify({'cors': 'working'}), 200

@app.errorhandler(Exception)
def handle_exception(e):
    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        return e
    
    response = jsonify({"error": str(e)})
    origin = request.headers.get('Origin', '*')
    response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response, 500

# Configure strict_slashes = False for all blueprints to prevent Vercel trailing-slash routing issues
for bp in [auth_bp, projects_bp, upload_bp, clean_bp, metrics_bp, charts_bp,
           summary_bp, ml_bp, dl_bp, demo_bp, predict_bp, features_bp, dashboard_bp]:
    bp.strict_slashes = False

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(projects_bp, url_prefix='/api/projects')
app.register_blueprint(upload_bp,  url_prefix='/api')
app.register_blueprint(clean_bp,   url_prefix='/api')
app.register_blueprint(metrics_bp, url_prefix='/api')
app.register_blueprint(charts_bp,  url_prefix='/api')
app.register_blueprint(summary_bp, url_prefix='/api')
app.register_blueprint(ml_bp,      url_prefix='/api')
app.register_blueprint(dl_bp,      url_prefix='/api')
app.register_blueprint(demo_bp,    url_prefix='/api')
app.register_blueprint(predict_bp, url_prefix='/api')
app.register_blueprint(features_bp, url_prefix='/api/features')
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')


CLEAN_LOG = []

@app.route('/api/missing-info', methods=['POST'])
def missing_info():
    df = global_store.get('df')
    if df is None:
        return jsonify({"error": "No dataset loaded"}), 400
    
    missing_data = []
    total_rows = len(df)
    
    for col in df.columns:
        missing_count = int(df[col].isna().sum())
        if missing_count > 0:
            missing_percent = round((missing_count / total_rows) * 100, 2)
            missing_data.append({
                "column_name": col,
                "missing_count": missing_count,
                "missing_percent": missing_percent,
                "dtype": str(df[col].dtype)
            })
            
    return jsonify(missing_data)

@app.route('/api/handle-missing', methods=['POST'])
def handle_missing():
    df = global_store.get('df')
    if df is None:
        return jsonify({"error": "No dataset loaded"}), 400
        
    data = request.json
    col = data.get('column')
    strategy = data.get('strategy')
    
    if not col or col not in df.columns:
        return jsonify({"error": f"Invalid column {col}"}), 400
        
    initial_rows = len(df)
    
    if strategy == "drop_rows":
        df.dropna(subset=[col], inplace=True)
    elif strategy == "fill_mean":
        df[col] = df[col].fillna(df[col].mean())
    elif strategy == "fill_median":
        df[col] = df[col].fillna(df[col].median())
    elif strategy == "fill_mode":
        df[col] = df[col].fillna(df[col].mode()[0])
    elif strategy == "fill_custom":
        val = data.get('custom_value', '')
        # attempt to cast val to correct type
        if 'int' in str(df[col].dtype):
            try: val = int(val)
            except: pass
        elif 'float' in str(df[col].dtype):
            try: val = float(val)
            except: pass
        df[col] = df[col].fillna(val)
    else:
        return jsonify({"error": "Unknown strategy"}), 400
        
    global_store['df'] = df
    rows_affected = initial_rows - len(df) if strategy == "drop_rows" else len(df)
    new_missing_count = int(df[col].isna().sum())
    
    CLEAN_LOG.append({
        "action": "Handle Missing",
        "column": col,
        "detail": f"Applied {strategy}",
        "rows_affected": int(rows_affected),
        "timestamp": datetime.datetime.now().isoformat()
    })
    
    return jsonify({
        "success": True, 
        "rows_affected": int(rows_affected), 
        "new_missing_count": new_missing_count
    })

@app.route('/api/string-clean', methods=['POST'])
def string_clean():
    df = global_store.get('df')
    if df is None:
        return jsonify({"error": "No dataset loaded"}), 400
        
    data = request.json
    col = data.get('column')
    ops = data.get('operations', [])
    
    if not col or col not in df.columns:
        return jsonify({"error": "Invalid column"}), 400
        
    if df[col].dtype != 'object' and not str(df[col].dtype).startswith('str'):
         return jsonify({"error": "Not a string column"}), 400
         
    initial_non_null = int(df[col].notna().sum())
    
    if "strip" in ops:
        df[col] = df[col].astype(str).str.strip()
    if "lowercase" in ops:
        df[col] = df[col].astype(str).str.lower()
    elif "uppercase" in ops:
        df[col] = df[col].astype(str).str.upper()
    if "remove_special" in ops:
        df[col] = df[col].astype(str).str.replace(r'[^a-zA-Z0-9\s]', '', regex=True)
        
    global_store['df'] = df
    
    CLEAN_LOG.append({
        "action": "String Clean",
        "column": col,
        "detail": f"Applied: {', '.join(ops)}",
        "rows_affected": initial_non_null,
        "timestamp": datetime.datetime.now().isoformat()
    })
    
    return jsonify({"success": True, "cells_affected": initial_non_null})

@app.route('/api/outlier-detect', methods=['POST'])
def outlier_detect():
    df = global_store.get('df')
    if df is None:
        return jsonify({"error": "No dataset loaded"}), 400
        
    col = request.json.get('column')
    if not col or col not in df.columns:
        return jsonify({"error": "Invalid column"}), 400
        
    if not np.issubdtype(df[col].dtype, np.number):
        return jsonify({"error": "Not a numeric column"}), 400
        
    s = df[col].dropna()
    if len(s) == 0:
        return jsonify({"outlier_count": 0, "lower_bound": 0, "upper_bound": 0, "total_rows": len(df)})
        
    q1 = s.quantile(0.25)
    q3 = s.quantile(0.75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    
    outliers = s[(s < lower_bound) | (s > upper_bound)]
    outlier_count = len(outliers)
    
    return jsonify({
        "outlier_count": int(outlier_count),
        "lower_bound": float(lower_bound),
        "upper_bound": float(upper_bound),
        "total_rows": len(df)
    })

@app.route('/api/outlier-handle', methods=['POST'])
def outlier_handle():
    df = global_store.get('df')
    if df is None:
        return jsonify({"error": "No dataset loaded"}), 400
        
    data = request.json
    col = data.get('column')
    strategy = data.get('strategy')
    
    if not col or col not in df.columns:
        return jsonify({"error": "Invalid column"}), 400
        
    s = df[col].dropna()
    q1 = s.quantile(0.25)
    q3 = s.quantile(0.75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    
    initial_rows = len(df)
    rows_affected = 0
    
    if strategy == "remove":
        # Keep rows where value is within bounds OR is NaN (we don't drop NaNs here)
        mask = df[col].isna() | ((df[col] >= lower_bound) & (df[col] <= upper_bound))
        df = df[mask]
        rows_affected = initial_rows - len(df)
    elif strategy == "cap":
        # Outliers count
        outliers = df[col][(df[col] < lower_bound) | (df[col] > upper_bound)]
        rows_affected = len(outliers)
        
        # Apply cap
        df.loc[df[col] < lower_bound, col] = lower_bound
        df.loc[df[col] > upper_bound, col] = upper_bound
    else:
        return jsonify({"error": "Unknown strategy"}), 400
        
    global_store['df'] = df
    
    CLEAN_LOG.append({
        "action": "Outlier Handle",
        "column": col,
        "detail": f"Strategy: {strategy}",
        "rows_affected": int(rows_affected),
        "timestamp": datetime.datetime.now().isoformat()
    })
    
    return jsonify({"success": True, "rows_affected": int(rows_affected)})

@app.route('/api/clean-report', methods=['POST', 'GET'])
def clean_report():
    return jsonify(CLEAN_LOG)

@app.route('/api/clear-clean-log', methods=['POST'])
def clear_clean_log():
    global CLEAN_LOG
    CLEAN_LOG = []
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7860, debug=False)
