from flask import Blueprint, request, jsonify
from services.inference import perform_inference

predict_bp = Blueprint('predict', __name__)

@predict_bp.route('/predict', methods=['POST'])
def predict():
    """
    Live inference endpoint. Expects a JSON payload of feature values.
    """
    try:
        input_data = request.json
        if not input_data:
            return jsonify({"error": "No input data provided"}), 400
            
        result = perform_inference(input_data)
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Prediction logic error: {e}")
        return jsonify({"error": f"Python Error: {str(e)}"}), 500

@predict_bp.route('/feature-bounds', methods=['GET'])
def get_feature_bounds():
    from services.model_store import latest_model_store
    bounds = latest_model_store.get("feature_bounds", {})
    return jsonify({"bounds": bounds})
