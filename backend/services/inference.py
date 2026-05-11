import numpy as np
from services.model_store import latest_model_store

def perform_inference(input_values: dict):
    """
    Takes a dictionary of feature values, preprocesses them using saved
    scalers/encoders, and returns the prediction.
    """
    model            = latest_model_store.get("model")
    feature_cols     = latest_model_store.get("feature_cols")
    feature_encoders = latest_model_store.get("feature_encoders", {})
    scaler           = latest_model_store.get("scaler")
    target_encoder   = latest_model_store.get("target_encoder")
    task             = latest_model_store.get("task")

    if model is None:
        raise ValueError("No trained model found. Please train a model first.")

    # 1. Align features in correct order
    ordered_features = []
    for col in feature_cols:
        if col not in input_values:
            raise ValueError(f"Missing required feature: '{col}'")
        
        val = input_values[col]
        
        # Apply LabelEncoding if this feature was categorical during training
        if col in feature_encoders:
            le = feature_encoders[col]
            try:
                # We expect the input to be the original string/value
                val = le.transform([str(val)])[0]
            except Exception:
                # If value is unseen, fallback to first class or handle gracefully
                val = 0
        
        ordered_features.append(float(val))

    # 2. Convert to numpy array
    X = np.array(ordered_features).reshape(1, -1)

    # 3. Apply Scaling (mostly for DL)
    if scaler:
        X = scaler.transform(X)

    # 4. Predict
    if task == "dl_binary":
        # Raw probability from our custom NN
        prob = model.predict(X)[0][0]
        prediction_idx = 1 if prob >= 0.5 else 0
        if target_encoder:
            result = target_encoder.inverse_transform([prediction_idx])[0]
        else:
            result = prediction_idx
        return {"result": str(result), "probability": round(float(prob), 4)}

    elif task == "classification":
        prediction_idx = model.predict(X)[0]
        if target_encoder:
            result = target_encoder.inverse_transform([prediction_idx])[0]
        else:
            result = int(prediction_idx)
        return {"result": str(result)}

    elif task == "clustering":
        cluster_id = model.predict(X)[0]
        return {"result": f"Cluster {int(cluster_id)}"}

    else:
        raise ValueError(f"Unsupported inference task: '{task}'")
