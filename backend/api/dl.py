from flask import Blueprint, request, jsonify
from services.data_processor import global_store
from services.dl_engine import train_dl

dl_bp = Blueprint('dl', __name__)

@dl_bp.route('/dl/train', methods=['POST'])
def train_model():
    df = global_store.get("df")

    if df is None:
        return jsonify({"error": "No data available. Please upload a dataset first."}), 400

    payload = request.json
    if not payload:
        return jsonify({"error": "No configuration payload provided."}), 400

    try:
        result = train_dl(df, payload)
        return jsonify(result)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        print("Unexpected DL error:", e)
        return jsonify({"error": "An unexpected error occurred during training."}), 500
