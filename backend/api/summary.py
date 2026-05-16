import numpy as np
from flask import Blueprint, jsonify
from services.data_processor import global_store, generate_data_profile

summary_bp = Blueprint('summary', __name__)

@summary_bp.route('/summary', methods=['GET'])
def get_summary():
    df = global_store.get("df")

    if df is None:
        return jsonify({"error": "No data available. Please upload a dataset first."}), 400

    try:
        profile = generate_data_profile(df)
        return jsonify(profile)
    except Exception as e:
        print("Error generating data profile:", e)
        return jsonify({"error": str(e)}), 500

@summary_bp.route('/clear', methods=['POST'])
def clear_data():
    global_store["df"] = None
    return jsonify({"message": "Backend state cleared successfully"}), 200

@summary_bp.route('/correlation', methods=['POST'])
def get_correlation():
    df = global_store.get("df")
    if df is None:
        return jsonify({"error": "No data available."}), 400

    try:
        corr_df = df.select_dtypes(include='number').corr().round(2)
        # Replace NaN with None so it translates to JSON null
        corr_df = corr_df.replace({np.nan: None})
        return jsonify({
            "columns": corr_df.columns.tolist(),
            "matrix": corr_df.values.tolist()
        })
    except Exception as e:
        print("Error generating correlation matrix:", e)
        return jsonify({"error": str(e)}), 500
