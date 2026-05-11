import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from services.model_store import latest_model_store, clear_store

# ─── Activation functions ─────────────────────────────────────────
def _relu(z):        return np.maximum(0, z)
def _relu_deriv(z):  return (z > 0).astype(float)
def _sigmoid(z):     return 1 / (1 + np.exp(-np.clip(z, -500, 500)))
def _tanh(z):        return np.tanh(z)
def _tanh_deriv(z):  return 1 - np.tanh(z) ** 2

_ACTIVATIONS = {
    'relu':    (_relu,    _relu_deriv),
    'sigmoid': (_sigmoid, lambda z: _sigmoid(z) * (1 - _sigmoid(z))),
    'tanh':    (_tanh,    _tanh_deriv),
}

# ─── Tiny Feedforward Neural Network ──────────────────────────────
class FeedforwardNN:
    """
    Pure-NumPy binary classifier. Trains via mini-batch SGD with backprop.
    """

    def __init__(self, layer_configs: list):
        self.layer_configs = layer_configs + [{"neurons": 1, "activation": "sigmoid"}]
        self.weights = []
        self.biases  = []
        self._initialized = False

    def _init_weights(self, n_features):
        np.random.seed(42)
        self.weights = []
        self.biases  = []
        prev_size = n_features
        for cfg in self.layer_configs:
            n = cfg["neurons"]
            scale = np.sqrt(2 / prev_size) if cfg["activation"] == "relu" else np.sqrt(1 / prev_size)
            self.weights.append(np.random.randn(prev_size, n) * scale)
            self.biases.append(np.zeros((1, n)))
            prev_size = n
        self._initialized = True

    def _forward(self, X):
        Zs, As = [], [X]
        for i, cfg in enumerate(self.layer_configs):
            act_fn, _ = _ACTIVATIONS[cfg["activation"]]
            Z = As[-1] @ self.weights[i] + self.biases[i]
            A = act_fn(Z)
            Zs.append(Z);  As.append(A)
        return Zs, As

    def _backward(self, Zs, As, y_batch, lr):
        m  = y_batch.shape[0]
        dA = -(y_batch / (As[-1] + 1e-9) - (1 - y_batch) / (1 - As[-1] + 1e-9))
        for i in reversed(range(len(self.layer_configs))):
            _, act_deriv = _ACTIVATIONS[self.layer_configs[i]["activation"]]
            dZ = dA * act_deriv(Zs[i])
            dW = As[i].T @ dZ / m
            dB = dZ.mean(axis=0, keepdims=True)
            dA = dZ @ self.weights[i].T
            self.weights[i] -= lr * dW
            self.biases[i]  -= lr * dB

    def _bce_loss(self, y_true, y_pred):
        y_pred = np.clip(y_pred, 1e-9, 1 - 1e-9)
        return -np.mean(y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred))

    def _accuracy(self, y_true, y_pred):
        return np.mean((y_pred >= 0.5).astype(int) == y_true)

    def fit(self, X_train, y_train, X_val, y_val, epochs=50, batch_size=32, lr=0.001):
        if not self._initialized:
            self._init_weights(X_train.shape[1])

        history = {"loss": [], "accuracy": [], "val_loss": [], "val_accuracy": []}
        n = len(X_train)

        for epoch in range(epochs):
            idx = np.random.permutation(n)
            X_shuf, y_shuf = X_train[idx], y_train[idx]

            for start in range(0, n, batch_size):
                X_b = X_shuf[start:start + batch_size]
                y_b = y_shuf[start:start + batch_size].reshape(-1, 1)
                Zs, As = self._forward(X_b)
                self._backward(Zs, As, y_b, lr)

            _, As_tr = self._forward(X_train)
            _, As_va = self._forward(X_val)
            y_tr_pred = As_tr[-1]
            y_va_pred = As_va[-1]

            history["loss"].append(round(float(self._bce_loss(y_train.reshape(-1, 1), y_tr_pred)), 4))
            history["accuracy"].append(round(float(self._accuracy(y_train.reshape(-1, 1), y_tr_pred)), 4))
            history["val_loss"].append(round(float(self._bce_loss(y_val.reshape(-1, 1), y_va_pred)), 4))
            history["val_accuracy"].append(round(float(self._accuracy(y_val.reshape(-1, 1), y_va_pred)), 4))

        return history

    def evaluate(self, X_test, y_test):
        _, As = self._forward(X_test)
        y_pred = As[-1]
        loss = float(self._bce_loss(y_test.reshape(-1, 1), y_pred))
        acc  = float(self._accuracy(y_test.reshape(-1, 1), y_pred))
        return round(loss, 4), round(acc, 4)

    def predict(self, X):
        _, As = self._forward(X)
        return As[-1]


# ─── Public entry point ────────────────────────────────────────────
def train_dl(df: pd.DataFrame, payload: dict) -> dict:
    target_col   = payload.get("target_col")
    feature_cols = payload.get("feature_cols", [])
    epochs       = int(payload.get("epochs", 50))
    batch_size   = int(payload.get("batch_size", 32))
    hidden_layers = payload.get("hidden_layers", [{"neurons": 16, "activation": "relu"}])

    if not target_col or target_col not in df.columns:
        raise ValueError("A valid target column is required.")
    if not feature_cols:
        raise ValueError("At least one feature column is required.")
    for col in feature_cols:
        if col not in df.columns:
            raise ValueError(f"Feature column '{col}' not found in dataset.")

    cols_needed = feature_cols + [target_col]
    df_clean = df[cols_needed].dropna().reset_index(drop=True)

    if len(df_clean) < 20:
        raise ValueError("Not enough rows after dropping NaNs (need at least 20).")

    X_raw = df_clean[feature_cols].copy()
    
    # Prepare model store
    clear_store()
    latest_model_store["feature_cols"] = feature_cols
    latest_model_store["task"] = "dl_binary"
    latest_model_store["feature_encoders"] = {}

    for col in X_raw.columns:
        if X_raw[col].dtype == object:
            le = LabelEncoder()
            X_raw[col] = le.fit_transform(X_raw[col].astype(str))
            latest_model_store["feature_encoders"][col] = le

    y_raw = df_clean[target_col]
    le_target = LabelEncoder()
    y_enc = le_target.fit_transform(y_raw.astype(str))
    latest_model_store["target_encoder"] = le_target

    if len(np.unique(y_enc)) != 2:
        raise ValueError("Deep Learning Studio currently supports binary classification only (exactly 2 unique target classes).")

    # StandardScaler — critical for neural network convergence
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_raw.values.astype('float32'))
    latest_model_store["scaler"] = scaler

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_enc.astype('float32'), test_size=0.2, random_state=42
    )
    X_tr, X_val, y_tr, y_val = train_test_split(
        X_train, y_train, test_size=0.15, random_state=42
    )

    model = FeedforwardNN(hidden_layers)
    history = model.fit(X_tr, y_tr, X_val, y_val, epochs=epochs, batch_size=batch_size)
    
    # Cast history values to native Python floats for JSON serialization safety
    clean_history = {}
    for k, v in history.items():
        clean_history[k] = [float(x) for x in v]

    test_loss, test_accuracy = model.evaluate(X_test, y_test)

    latest_model_store["model"] = model

    # Calculate realistic bounds for smart autofill
    feature_bounds = {col: {"min": float(X_raw[col].min()), "max": float(X_raw[col].max())} for col in X_raw.columns}

    return {
        "test_accuracy":  round(float(test_accuracy) * 100, 2),
        "test_loss":      round(float(test_loss), 4),
        "history":        clean_history,
        "epochs_run":     epochs,
        "train_size":     len(X_tr),
        "val_size":       len(X_val),
        "test_size":      len(X_test),
        "n_features":     len(feature_cols),
        "feature_bounds": feature_bounds,
        "architecture":   [{"neurons": int(cfg["neurons"]), "activation": cfg["activation"]}
                           for cfg in hidden_layers] + [{"neurons": 1, "activation": "sigmoid"}],
    }
