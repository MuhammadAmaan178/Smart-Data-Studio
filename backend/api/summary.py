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
