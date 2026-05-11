# This module acts as a simple in-memory cache for the latest trained model and its preprocessing artifacts.
# In a production app, these would be serialized to disk (.joblib or .h5) and associated with a session ID.

latest_model_store = {
    "model": None,           # The trained sklearn or FeedforwardNN model object
    "scaler": None,          # The StandardScaler instance (if used)
    "feature_encoders": {},  # Dictionary of LabelEncoders for categorical feature columns
    "target_encoder": None,  # The LabelEncoder for the target column
    "feature_cols": [],      # List of strings (ordered column names)
    "task": None,            # 'classification' | 'clustering' | 'dl_binary'
}

def clear_store():
    latest_model_store["model"] = None
    latest_model_store["scaler"] = None
    latest_model_store["feature_encoders"] = {}
    latest_model_store["target_encoder"] = None
    latest_model_store["feature_cols"] = []
    latest_model_store["task"] = None
