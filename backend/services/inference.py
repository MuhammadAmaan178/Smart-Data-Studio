import numpy as np
from services.model_store import latest_model_store

def perform_inference(input_values: dict):
    """
    Takes a dictionary of feature values, pre-processes them,
    runs the trained model, and returns the prediction result.
    Supports classification, regression, and clustering.
    """
    model = latest_model_store.get("model")
    feature_cols = latest_model_store.get("feature_cols")
    feature_encoders = latest_model_store.get("feature_encoders", {})
    scaler = latest_model_store.get("scaler")
    target_encoder = latest_model_store.get("target_encoder")
    task = latest_model_store.get("task")

    if model is None:
        raise ValueError("No trained model found. Please train a model first.")

    # Accept either { inputs: {col: val, ...} } or { col: val, ... }
    inputs = input_values.get("inputs") if "inputs" in input_values and isinstance(input_values.get("inputs"), dict) else input_values

    # 1. Align features in correct order
    ordered_features = []
    for col in feature_cols:
        if col not in inputs:
            # Try lowercase or search, or default to 0
            found = False
            for k, v in inputs.items():
                if k.lower() == col.lower():
                    inputs[col] = v
                    found = True
                    break
            if not found:
                inputs[col] = 0.0

        val = inputs[col]

        # Apply label encoder if categorical
        if col in feature_encoders:
            le = feature_encoders[col]
            try:
                # If numeric or string, fit transforms
                val = le.transform([str(val)])[0]
            except Exception:
                val = 0

        ordered_features.append(float(val))

    # 2. Reshape for sklearn
    X = np.array(ordered_features).reshape(1, -1)

    # 3. Predict
    if task == "dl_binary":
        prob = model.predict(X)[0][0]
        prediction_idx = 1 if prob >= 0.5 else 0
        if target_encoder:
            result = target_encoder.inverse_transform([prediction_idx])[0]
        else:
            result = prediction_idx
        return {
            "prediction": str(result),
            "result": str(result),
            "confidence": float(prob) if prediction_idx == 1 else float(1.0 - prob)
        }

    elif task == "classification":
        prediction_idx = model.predict(X)[0]
        if target_encoder:
            result = target_encoder.inverse_transform([prediction_idx])[0]
        else:
            result = int(prediction_idx)

        # Get confidence if model supports it
        confidence = None
        if hasattr(model, "predict_proba"):
            try:
                proba = model.predict_proba(X)[0]
                confidence = float(np.max(proba))
            except Exception:
                pass

        res = {
            "prediction": str(result),
            "result": str(result)
        }
        if confidence is not None:
            res["confidence"] = confidence
        return res

    elif task == "regression":
        pred_val = float(model.predict(X)[0])
        return {
            "prediction": pred_val,
            "result": str(round(pred_val, 4))
        }

    elif task == "clustering":
        cluster_id = int(model.predict(X)[0])
        cluster_name = f"Cluster {cluster_id}"
        return {
            "prediction": cluster_name,
            "result": cluster_name
        }

    else:
        raise ValueError(f"Unsupported inference task: '{task}'")
