import numpy as np
import pandas as pd
import time
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, r2_score, mean_absolute_error, mean_squared_error
from services.model_store import latest_model_store, clear_store

# ─── Activation Functions and Derivatives ───────────────────────────
def _relu(z):        return np.maximum(0, z)
def _relu_deriv(z):  return (z > 0).astype(float)

def _sigmoid(z):     return 1.0 / (1.0 + np.exp(-np.clip(z, -500, 500)))
def _sigmoid_deriv(z):
    s = _sigmoid(z)
    return s * (1.0 - s)

def _tanh(z):        return np.tanh(z)
def _tanh_deriv(z):  return 1.0 - np.tanh(z) ** 2

def _leaky_relu(z):  return np.where(z > 0, z, 0.01 * z)
def _leaky_relu_deriv(z): return np.where(z > 0, 1.0, 0.01)

def _elu(z):         return np.where(z > 0, z, 1.0 * (np.exp(np.clip(z, -500, 500)) - 1))
def _elu_deriv(z):   
    e = _elu(z)
    return np.where(z > 0, 1.0, e + 1.0)

def _linear(z):      return z
def _linear_deriv(z): return np.ones_like(z)

def _softmax(z):
    # Stabilize softmax to avoid overflow
    shift_z = z - np.max(z, axis=1, keepdims=True)
    exps = np.exp(shift_z)
    return exps / np.sum(exps, axis=1, keepdims=True)

_ACTIVATIONS = {
    'relu': (_relu, _relu_deriv),
    'sigmoid': (_sigmoid, _sigmoid_deriv),
    'tanh': (_tanh, _tanh_deriv),
    'leaky_relu': (_leaky_relu, _leaky_relu_deriv),
    'elu': (_elu, _elu_deriv),
    'linear': (_linear, _linear_deriv),
}

# ─── Loss and Evaluation Helper Calculations ───────────────────────
def calculate_loss(y_true, y_pred, task_type, output_dim):
    y_true = np.array(y_true).reshape(-1, 1)
    y_pred = np.array(y_pred).reshape(-1, y_pred.shape[1] if len(y_pred.shape) > 1 else 1)
    
    if task_type == "classification":
        if output_dim == 1:
            y_pred = np.clip(y_pred, 1e-15, 1.0 - 1e-15)
            return -np.mean(y_true * np.log(y_pred) + (1.0 - y_true) * np.log(1.0 - y_pred))
        else:
            y_pred = np.clip(y_pred, 1e-15, 1.0 - 1e-15)
            row_indices = np.arange(len(y_true))
            true_probs = y_pred[row_indices, y_true.astype(int).flatten()]
            return -np.mean(np.log(true_probs))
    else:
        return np.mean((y_true - y_pred) ** 2)

def calculate_accuracy(y_true, y_pred, task_type, output_dim):
    y_true = np.array(y_true).reshape(-1, 1)
    y_pred = np.array(y_pred).reshape(-1, y_pred.shape[1] if len(y_pred.shape) > 1 else 1)
    
    if task_type == "classification":
        if output_dim == 1:
            preds = (y_pred >= 0.5).astype(int)
            return np.mean(preds == y_true)
        else:
            preds = np.argmax(y_pred, axis=1).reshape(-1, 1)
            return np.mean(preds == y_true.astype(int))
    else:
        return np.mean(np.abs(y_true - y_pred))

# ─── Custom Deep Neural Network in Pure NumPy ───────────────────────
class FeedforwardNN:
    def __init__(self, layers_config: list, input_dim: int, task_type: str, output_dim: int):
        self.layers_config = layers_config
        self.task_type = task_type
        self.output_dim = output_dim
        
        self.weights = []
        self.biases = []
        
        prev_dim = input_dim
        for i, layer in enumerate(layers_config):
            neurons = layer["neurons"]
            activation = layer.get("activation", "relu").lower().replace(' ', '_')
            
            # He or Xavier scaling
            scale = np.sqrt(2.0 / prev_dim) if activation in ["relu", "leaky_relu", "elu"] else np.sqrt(1.0 / prev_dim)
            self.weights.append(np.random.randn(prev_dim, neurons) * scale)
            self.biases.append(np.zeros((1, neurons)))
            prev_dim = neurons
            
        # Output weights
        scale = np.sqrt(1.0 / prev_dim)
        self.weights.append(np.random.randn(prev_dim, output_dim) * scale)
        self.biases.append(np.zeros((1, output_dim)))
        
        # Optimizer moment vectors
        self.m_w = [np.zeros_like(w) for w in self.weights]
        self.v_w = [np.zeros_like(w) for w in self.weights]
        self.m_b = [np.zeros_like(b) for b in self.biases]
        self.v_b = [np.zeros_like(b) for b in self.biases]
        self.t = 0
        
    def forward(self, X, training=True):
        Zs, As = [], [X]
        masks = []
        
        # Hidden layers forward
        for i, layer in enumerate(self.layers_config):
            activation = layer.get("activation", "relu").lower().replace(' ', '_')
            dropout = float(layer.get("dropout", 0.0))
            
            act_fn, _ = _ACTIVATIONS.get(activation, (_relu, _relu_deriv))
            Z = As[-1] @ self.weights[i] + self.biases[i]
            A = act_fn(Z)
            
            if training and dropout > 0.0:
                mask = (np.random.rand(*A.shape) >= dropout) / (1.0 - dropout)
                A = A * mask
                masks.append(mask)
            else:
                masks.append(None)
                
            Zs.append(Z)
            As.append(A)
            
        # Output Layer forward
        Z_out = As[-1] @ self.weights[-1] + self.biases[-1]
        if self.task_type == "classification":
            if self.output_dim == 1:
                A_out = _sigmoid(Z_out)
            else:
                A_out = _softmax(Z_out)
        else:
            A_out = _linear(Z_out)
            
        Zs.append(Z_out)
        As.append(A_out)
        return Zs, As, masks
        
    def backward(self, Zs, As, masks, y_batch, lr, optimizer):
        m = y_batch.shape[0]
        d_weights = []
        d_biases = []
        
        # Output layer delta
        if self.task_type == "classification":
            # BCE or CCE loss simplifies beautifully to A_out - y
            if self.output_dim == 1:
                dZ = As[-1] - y_batch
            else:
                # Multiclass CCE with one-hot output shape alignment
                one_hot_y = np.zeros_like(As[-1])
                one_hot_y[np.arange(m), y_batch.astype(int).flatten()] = 1.0
                dZ = As[-1] - one_hot_y
        else:
            # MSE loss derivative: 2*(A_out - y)/m
            dZ = 2.0 * (As[-1] - y_batch) / m
            
        dW = As[-2].T @ dZ
        dB = np.sum(dZ, axis=0, keepdims=True)
        d_weights.append(dW)
        d_biases.append(dB)
        
        dA = dZ @ self.weights[-1].T
        
        # Backprop hidden layers
        for i in reversed(range(len(self.layers_config))):
            layer = self.layers_config[i]
            activation = layer.get("activation", "relu").lower().replace(' ', '_')
            _, act_deriv = _ACTIVATIONS.get(activation, (_relu, _relu_deriv))
            
            if masks[i] is not None:
                dA = dA * masks[i]
                
            dZ = dA * act_deriv(Zs[i])
            dW = As[i].T @ dZ
            dB = np.sum(dZ, axis=0, keepdims=True)
            
            d_weights.insert(0, dW)
            d_biases.insert(0, dB)
            
            dA = dZ @ self.weights[i].T
            
        # Update weights using optimizer
        self.t += 1
        for i in range(len(self.weights)):
            dW = d_weights[i]
            dB = d_biases[i]
            
            # Prevent exploding gradients
            dW = np.clip(dW, -5.0, 5.0)
            dB = np.clip(dB, -5.0, 5.0)
            
            if optimizer == "adam":
                beta1, beta2, eps = 0.9, 0.999, 1e-8
                self.m_w[i] = beta1 * self.m_w[i] + (1 - beta1) * dW
                self.v_w[i] = beta2 * self.v_w[i] + (1 - beta2) * (dW ** 2)
                self.m_b[i] = beta1 * self.m_b[i] + (1 - beta1) * dB
                self.v_b[i] = beta2 * self.v_b[i] + (1 - beta2) * (dB ** 2)
                
                m_w_corr = self.m_w[i] / (1 - beta1 ** self.t)
                v_w_corr = self.v_w[i] / (1 - beta2 ** self.t)
                m_b_corr = self.m_b[i] / (1 - beta1 ** self.t)
                v_b_corr = self.v_b[i] / (1 - beta2 ** self.t)
                
                self.weights[i] -= lr * m_w_corr / (np.sqrt(v_w_corr) + eps)
                self.biases[i] -= lr * m_b_corr / (np.sqrt(v_b_corr) + eps)
                
            elif optimizer == "rmsprop":
                decay_rate, eps = 0.9, 1e-8
                self.v_w[i] = decay_rate * self.v_w[i] + (1 - decay_rate) * (dW ** 2)
                self.v_b[i] = decay_rate * self.v_b[i] + (1 - decay_rate) * (dB ** 2)
                self.weights[i] -= lr * dW / (np.sqrt(self.v_w[i]) + eps)
                self.biases[i] -= lr * dB / (np.sqrt(self.v_b[i]) + eps)
                
            elif optimizer == "adagrad":
                eps = 1e-8
                self.v_w[i] += dW ** 2
                self.v_b[i] += dB ** 2
                self.weights[i] -= lr * dW / (np.sqrt(self.v_w[i]) + eps)
                self.biases[i] -= lr * dB / (np.sqrt(self.v_b[i]) + eps)
                
            else: # sgd
                momentum = 0.9
                self.m_w[i] = momentum * self.m_w[i] + lr * dW
                self.m_b[i] = momentum * self.m_b[i] + lr * dB
                self.weights[i] -= self.m_w[i]
                self.biases[i] -= self.m_b[i]
                
    def predict(self, X):
        _, As, _ = self.forward(X, training=False)
        return As[-1]
        
    def get_params_count(self):
        total = sum(w.size for w in self.weights) + sum(b.size for b in self.biases)
        return total

# ─── Public Entry Point ────────────────────────────────────────────
def train_dl(df: pd.DataFrame, payload: dict) -> dict:
    start_time = time.time()
    
    task_type = payload.get("task_type", "classification")
    feature_cols = payload.get("feature_columns", payload.get("feature_cols", []))
    target_col = payload.get("target_column", payload.get("target_col"))
    hidden_layers = payload.get("layers", payload.get("hidden_layers", [
        {"neurons": 64, "activation": "relu", "dropout": 0.0},
        {"neurons": 32, "activation": "relu", "dropout": 0.0}
    ]))
    epochs = int(payload.get("epochs", 50))
    batch_size = int(payload.get("batch_size", 32))
    lr = float(payload.get("learning_rate", 0.001))
    optimizer = payload.get("optimizer", "adam").lower()
    val_split = float(payload.get("validation_split", 20.0)) / 100.0
    test_size = float(payload.get("test_size", 20.0)) / 100.0
    
    if not target_col or target_col not in df.columns:
        raise ValueError("A valid target column is required.")
    if not feature_cols:
        raise ValueError("At least one feature column is required.")
        
    cols_needed = feature_cols + [target_col]
    df_clean = df[cols_needed].dropna().reset_index(drop=True)
    if len(df_clean) < 10:
        raise ValueError("Not enough rows (need at least 10 non-null rows).")
        
    X_raw = df_clean[feature_cols].copy()
    
    clear_store()
    latest_model_store["feature_cols"] = feature_cols
    latest_model_store["task_type"] = task_type
    latest_model_store["feature_encoders"] = {}
    
    for col in X_raw.columns:
        if X_raw[col].dtype == object:
            le = LabelEncoder()
            X_raw[col] = le.fit_transform(X_raw[col].astype(str))
            latest_model_store["feature_encoders"][col] = le
            
    y_raw = df_clean[target_col]
    le_target = LabelEncoder()
    
    if task_type == "classification":
        y_enc = le_target.fit_transform(y_raw.astype(str))
        latest_model_store["target_encoder"] = le_target
        output_classes = np.unique(y_enc)
        output_dim = 1 if len(output_classes) <= 2 else len(output_classes)
        latest_model_store["task"] = "dl_binary" if output_dim == 1 else "classification"
    else:
        # Regression
        y_enc = y_raw.values.astype('float32')
        output_dim = 1
        latest_model_store["task"] = "regression"
        
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_raw.values.astype('float32'))
    latest_model_store["scaler"] = scaler
    
    # Validation split and test split separation
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_enc.astype('float32'), test_size=test_size, random_state=42
    )
    
    if val_split > 0.0:
        X_tr, X_val, y_tr, y_val = train_test_split(
            X_train, y_train, test_size=val_split, random_state=42
        )
    else:
        X_tr, y_tr = X_train, y_train
        X_val, y_val = X_train, y_train
        
    model = FeedforwardNN(hidden_layers, X_tr.shape[1], task_type, output_dim)
    
    history = {"loss": [], "val_loss": [], "accuracy": [], "val_accuracy": []}
    
    # Store initial progress bounds
    latest_model_store["epoch_progress"] = {
        "current": 0, "total": epochs, "loss": 0.0, "val_loss": 0.0, "accuracy": 0.0, "val_accuracy": 0.0, "complete": False
    }
    
    # Train loops
    n = len(X_tr)
    for epoch in range(epochs):
        idx = np.random.permutation(n)
        X_shuf, y_shuf = X_tr[idx], y_tr[idx]
        
        for start in range(0, n, batch_size):
            X_b = X_shuf[start:start + batch_size]
            y_b = y_shuf[start:start + batch_size].reshape(-1, 1 if output_dim == 1 or task_type == "regression" else 1)
            Zs, As, masks = model.forward(X_b, training=True)
            model.backward(Zs, As, masks, y_b, lr, optimizer)
            
        # Metrics per epoch
        y_tr_pred = model.predict(X_tr)
        y_va_pred = model.predict(X_val)
        
        tr_loss = float(calculate_loss(y_tr, y_tr_pred, task_type, output_dim))
        va_loss = float(calculate_loss(y_val, y_va_pred, task_type, output_dim))
        tr_acc = float(calculate_accuracy(y_tr, y_tr_pred, task_type, output_dim))
        va_acc = float(calculate_accuracy(y_val, y_va_pred, task_type, output_dim))
        
        history["loss"].append(round(tr_loss, 4))
        history["val_loss"].append(round(va_loss, 4))
        history["accuracy"].append(round(tr_acc, 4))
        history["val_accuracy"].append(round(va_acc, 4))
        
        # Save active status so the polling endpoint can see it live!
        latest_model_store["epoch_progress"] = {
            "current": epoch + 1,
            "total": epochs,
            "loss": round(tr_loss, 4),
            "val_loss": round(va_loss, 4),
            "accuracy": round(tr_acc * 100, 1) if task_type == "classification" else round(tr_acc, 4),
            "val_accuracy": round(va_acc * 100, 1) if task_type == "classification" else round(va_acc, 4),
            "complete": False
        }
        # Artificial brief sleep during training so the user's interface can poll and see it animate!
        time.sleep(0.01)
        
    latest_model_store["epoch_progress"]["complete"] = True
    
    # Test set evaluations
    y_test_pred = model.predict(X_test)
    test_loss_val = float(calculate_loss(y_test, y_test_pred, task_type, output_dim))
    
    final_metrics = {}
    if task_type == "classification":
        if output_dim == 1:
            y_test_pred_idx = (y_test_pred >= 0.5).astype(int).flatten()
        else:
            y_test_pred_idx = np.argmax(y_test_pred, axis=1).flatten()
            
        y_test_true = y_test.astype(int).flatten()
        
        acc = float(accuracy_score(y_test_true, y_test_pred_idx))
        prec = float(precision_score(y_test_true, y_test_pred_idx, average="weighted", zero_division=0))
        rec = float(recall_score(y_test_true, y_test_pred_idx, average="weighted", zero_division=0))
        f1 = float(f1_score(y_test_true, y_test_pred_idx, average="weighted", zero_division=0))
        
        # Target classes
        class_labels = le_target.inverse_transform(np.arange(len(np.unique(y_enc)))).tolist() if len(np.unique(y_enc)) > 1 else ["0", "1"]
        cm = confusion_matrix(y_test_true, y_test_pred_idx).tolist()
        
        final_metrics = {
            "accuracy": round(acc * 100, 2),
            "precision": round(prec * 100, 2),
            "recall": round(rec * 100, 2),
            "f1": round(f1 * 100, 2),
            "confusion_matrix": cm,
            "classes": class_labels
        }
    else:
        # Regression
        y_test_true = y_test.flatten()
        y_test_pred_vals = y_test_pred.flatten()
        
        r2 = float(r2_score(y_test_true, y_test_pred_vals))
        mae = float(mean_absolute_error(y_test_true, y_test_pred_vals))
        mse = float(mean_squared_error(y_test_true, y_test_pred_vals))
        rmse = float(np.sqrt(mse))
        
        final_metrics = {
            "r2": round(r2, 4),
            "mae": round(mae, 4),
            "mse": round(mse, 4),
            "rmse": round(rmse, 4)
        }
        
    latest_model_store["model"] = model
    
    # Calculate bounds for smart autofill prediction min/max values
    feature_bounds = {col: {"min": float(X_raw[col].min()), "max": float(X_raw[col].max())} for col in X_raw.columns}
    latest_model_store["feature_bounds"] = feature_bounds
    
    training_time_ms = float((time.time() - start_time) * 1000.0)
    
    return {
        "task_type": task_type,
        "history": history,
        "final_metrics": final_metrics,
        "total_params": int(model.get_params_count()),
        "training_time_ms": round(training_time_ms, 2),
        "epochs_trained": epochs,
        "train_size": len(X_tr),
        "val_size": len(X_val),
        "test_size": len(X_test),
        "n_features": len(feature_cols),
        "feature_bounds": feature_bounds,
        "architecture": [{"neurons": int(cfg["neurons"]), "activation": cfg["activation"], "dropout": float(cfg.get("dropout", 0.0))} for cfg in hidden_layers]
    }
