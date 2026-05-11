from flask import Blueprint, request, jsonify
from services.data_processor import global_store
from services.ml_engine import run_ml

ml_bp = Blueprint('ml', __name__)

@ml_bp.route('/ml/run', methods=['POST'])
def run_model():
    df = global_store.get("df")

    if df is None:
        return jsonify({"error": "No data available. Please upload a dataset first."}), 400

    payload = request.json
    if not payload:
        return jsonify({"error": "No configuration payload provided."}), 400

    try:
        result = run_ml(df, payload)
        return jsonify(result)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        print("Unexpected ML error:", e)
        return jsonify({"error": "An unexpected error occurred during model execution."}), 500
