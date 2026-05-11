from flask import Blueprint, jsonify
from services.data_processor import load_demo_dataset

demo_bp = Blueprint('demo', __name__)

@demo_bp.route('/load-demo/<string:dataset_name>', methods=['GET'])
def load_demo(dataset_name):
    """
    Load a standard demo dataset into the global DataFrame.
    Response shape mirrors /api/upload so the frontend can treat them identically.
    """
    try:
        data_preview, anomaly_report = load_demo_dataset(dataset_name)
        return jsonify({
            "dataset":       dataset_name,
            "data_preview":  data_preview,
            "anomaly_report": anomaly_report,
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"[load-demo] Error loading '{dataset_name}':", e)
        return jsonify({"error": str(e)}), 500
