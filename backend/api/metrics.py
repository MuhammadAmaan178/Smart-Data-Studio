from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from scipy import stats as scipy_stats
from services.data_processor import global_store

metrics_bp = Blueprint('metrics', __name__)

METRIC_LABELS = {
    'sum': 'Sum', 'mean': 'Mean', 'median': 'Median',
    'min': 'Min', 'max': 'Max', 'std': 'Std Dev',
    'var': 'Variance', 'count': 'Count', 'skew': 'Skewness',
    'kurtosis': 'Kurtosis'
}

@metrics_bp.route('/metrics', methods=['POST'])
def get_metrics():
    df = global_store["df"]

    if df is None:
        return jsonify({"error": "No data uploaded"}), 400

    data = request.json
    col = data.get('column_name')
    metric_type = data.get('metric_type')

    if not col or col not in df.columns:
        return jsonify({"error": "Invalid column"}), 400
    if not metric_type or metric_type not in METRIC_LABELS:
        return jsonify({"error": f"Unsupported metric_type: '{metric_type}'"}), 400

    try:
        if not pd.api.types.is_numeric_dtype(df[col]):
            return jsonify({"error": f"Column '{col}' is not numeric."}), 400

        series = df[col].dropna()
        result = None

        if metric_type == 'sum':        result = float(series.sum())
        elif metric_type == 'mean':     result = float(series.mean())
        elif metric_type == 'median':   result = float(series.median())
        elif metric_type == 'min':      result = float(series.min())
        elif metric_type == 'max':      result = float(series.max())
        elif metric_type == 'std':      result = float(series.std())
        elif metric_type == 'var':      result = float(series.var())
        elif metric_type == 'count':    result = int(series.count())
        elif metric_type == 'skew':     result = float(series.skew())
        elif metric_type == 'kurtosis': result = float(series.kurtosis())

        if result is None or (isinstance(result, float) and np.isnan(result)):
            return jsonify({"error": "Result is NaN — check your data."}), 400

        # Round floats to 2 decimal places
        display_value = round(result, 2) if isinstance(result, float) else result

        return jsonify({
            "value": display_value,
            "label": METRIC_LABELS[metric_type],
            "column": col
        })
    except Exception as e:
        print("Error getting metric:", e)
        return jsonify({"error": str(e)}), 500
