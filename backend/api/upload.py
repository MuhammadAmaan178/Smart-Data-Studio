from flask import Blueprint, request, jsonify
import pandas as pd
import io
from services.data_processor import global_store, get_data_preview, generate_anomaly_report

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file:
        try:
            stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
            global_store["df"] = pd.read_csv(stream)
            
            return jsonify({
                "data_preview": get_data_preview(global_store["df"]),
                "anomaly_report": generate_anomaly_report(global_store["df"])
            })
        except Exception as e:
            print("Error uploading file:", e)
            return jsonify({"error": str(e)}), 500

@upload_bp.route('/export', methods=['GET'])
def export_data():
    df = global_store.get("df")
    if df is None:
        return jsonify({
            "success": True,
            "data": []
        }), 200
    
    # Return full dataset as records for SDS serialization
    return jsonify({
        "success": True,
        "data": df.to_dict(orient='records')
    })

@upload_bp.route('/restore', methods=['POST'])
def restore_data():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided for restoration"}), 400
    
    try:
        # Check if data is wrapped in the 'data' key or is the raw list
        records = data.get("data") if isinstance(data, dict) else data
        global_store["df"] = pd.DataFrame(records)
        
        return jsonify({
            "success": True,
            "data_preview": get_data_preview(global_store["df"]),
            "anomaly_report": generate_anomaly_report(global_store["df"])
        })
    except Exception as e:
        print("Restoration Error:", e)
        return jsonify({"error": str(e)}), 500
