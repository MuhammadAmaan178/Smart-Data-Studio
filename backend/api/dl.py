import numpy as np
from flask import Blueprint, request, jsonify
from services.data_processor import global_store
from services.dl_engine import train_dl
from services.model_store import latest_model_store

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
        return jsonify({"error": f"An unexpected error occurred during training: {str(e)}"}), 500

@dl_bp.route('/dl/status', methods=['GET'])
def get_status():
    progress = latest_model_store.get("epoch_progress", {"current": 0, "total": 0, "complete": True})
    return jsonify(progress)

@dl_bp.route('/dl/predict', methods=['POST', 'GET'])
def dl_predict():
    try:
        input_data = request.json or request.args.to_dict() or {}
        model = latest_model_store.get("model")
        scaler = latest_model_store.get("scaler")
        feature_cols = latest_model_store.get("feature_cols")
        feature_encoders = latest_model_store.get("feature_encoders", {})
        target_encoder = latest_model_store.get("target_encoder")
        task_type = latest_model_store.get("task_type", "classification")
        
        if not model:
            return jsonify({"error": "No trained Deep Learning model found. Please train a model first."}), 400
            
        inputs = input_data.get("inputs") if "inputs" in input_data and isinstance(input_data.get("inputs"), dict) else input_data
        
        # Align features in correct order
        ordered_features = []
        for col in feature_cols:
            val = inputs.get(col, 0.0)
            if col in feature_encoders:
                le = feature_encoders[col]
                try:
                    val = le.transform([str(val)])[0]
                except:
                    val = 0
            try:
                ordered_features.append(float(val))
            except:
                ordered_features.append(0.0)
            
        X = np.array(ordered_features).reshape(1, -1)
        if scaler:
            X = scaler.transform(X)
            
        # Predict using FeedforwardNN
        pred_out = model.predict(X)[0]
        
        if task_type == 'classification':
            if len(pred_out) == 1:
                # Binary classification
                prob = float(pred_out[0])
                pred_idx = 1 if prob >= 0.5 else 0
                confidence = prob if pred_idx == 1 else (1.0 - prob)
            else:
                # Multiclass classification
                pred_idx = int(np.argmax(pred_out))
                confidence = float(pred_out[pred_idx])
                
            if target_encoder:
                result = target_encoder.inverse_transform([pred_idx])[0]
            else:
                result = pred_idx
                
            return jsonify({
                "prediction": str(result),
                "confidence": round(confidence, 4),
                "result": str(result)
            }), 200
        else:
            # Regression
            pred_val = float(pred_out[0])
            return jsonify({
                "prediction": round(pred_val, 4),
                "result": str(round(pred_val, 4))
            }), 200
            
    except Exception as e:
        print("Prediction logic error:", e)
        return jsonify({"error": str(e)}), 500

@dl_bp.route('/dl/feature-bounds', methods=['POST', 'GET'])
def get_dl_feature_bounds():
    bounds = latest_model_store.get("feature_bounds", {})
    return jsonify({"bounds": bounds})
