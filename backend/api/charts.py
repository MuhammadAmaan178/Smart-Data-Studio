from flask import Blueprint, request, jsonify
from services.data_processor import global_store
from services.visualizer import generate_chart

charts_bp = Blueprint('charts', __name__)

@charts_bp.route('/charts', methods=['POST'])
def create_chart():
    df = global_store.get("df")
    
    if df is None:
        return jsonify({"error": "No data available. Please upload a dataset first."}), 400
        
    config = request.json
    if not config:
        return jsonify({"error": "No chart configuration provided"}), 400
        
    try:
        img_base64 = generate_chart(df, config)
        return jsonify({"image": img_base64})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        print("Error generating chart:", e)
        return jsonify({"error": "An unexpected error occurred during chart generation."}), 500
