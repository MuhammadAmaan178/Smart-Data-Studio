from flask import Blueprint, request, jsonify
from services.data_processor import global_store, get_data_preview, generate_anomaly_report, apply_cleaning_actions

clean_bp = Blueprint('clean', __name__)

@clean_bp.route('/clean', methods=['POST'])
def clean_data():
    df = global_store["df"]
    
    if df is None:
        return jsonify({"error": "No data uploaded"}), 400
        
    actions = request.json
    if not actions:
        return jsonify({"error": "No actions provided"}), 400
        
    try:
        global_store["df"] = apply_cleaning_actions(df, actions)
        
        return jsonify({
            "data_preview": get_data_preview(global_store["df"]),
            "anomaly_report": generate_anomaly_report(global_store["df"])
        })
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        print("Error cleaning data:", e)
        return jsonify({"error": "An unexpected error occurred during cleaning."}), 500
