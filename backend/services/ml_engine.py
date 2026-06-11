import pandas as pd
import numpy as np
import time
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, r2_score,
    mean_absolute_error, mean_squared_error, silhouette_score
)
# Classification Algorithms
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC

# Regression Algorithms
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor

# Clustering Algorithms
from sklearn.cluster import KMeans

from services.model_store import latest_model_store, clear_store
from services.data_processor import global_store

def run_ml(df, payload):
    """
    Train and evaluate machine learning models for classification, regression, and clustering.
    All numpy types are cast to native Python types.
    """
    task_type = payload.get("task_type") or payload.get("task")
    algorithm = payload.get("algorithm", "").lower()
    hyperparameters = payload.get("hyperparameters") or payload.get("params", {})
    feature_cols = payload.get("feature_columns") or payload.get("feature_cols", [])
    target_col = payload.get("target_column") or payload.get("target_col")
    test_size_val = payload.get("test_size", 20)

    # 1. Validation
    if not feature_cols:
        raise ValueError("At least one feature column is required.")
    for col in feature_cols:
        if col not in df.columns:
            raise ValueError(f"Feature column '{col}' not found in dataset.")

    # Drop NaNs
    cols_to_clean = list(feature_cols)
    if task_type != "clustering" and target_col:
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in dataset.")
        cols_to_clean.append(target_col)

    df_clean = df[cols_to_clean].dropna().reset_index(drop=True)
    if len(df_clean) < 10:
        raise ValueError("Not enough clean rows left (need at least 10 clean rows).")

    # Features X
    X = df_clean[feature_cols].copy()

    # Encode categorical features and save encoders
    clear_store()
    feature_encoders = {}
    for col in X.columns:
        if X[col].dtype == object or X[col].dtype == bool:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            feature_encoders[col] = le

    latest_model_store["feature_cols"] = feature_cols
    latest_model_store["feature_encoders"] = feature_encoders
    latest_model_store["task"] = task_type

    # Save feature bounds (min/max)
    feature_bounds = {}
    for col in feature_cols:
        col_series = X[col]
        feature_bounds[col] = {
            "min": float(col_series.min()) if not col_series.empty else 0.0,
            "max": float(col_series.max()) if not col_series.empty else 1.0
        }
    latest_model_store["feature_bounds"] = feature_bounds

    # Start timing
    start_time = time.time()

    # 2. Dispatch tasks
    if task_type == "classification":
        res = _run_classification(X, df_clean, target_col, algorithm, hyperparameters, test_size_val)
    elif task_type == "regression":
        res = _run_regression(X, df_clean, target_col, algorithm, hyperparameters, test_size_val)
    elif task_type == "clustering":
        res = _run_clustering(X, algorithm, hyperparameters)
    else:
        raise ValueError(f"Unsupported task type: {task_type}")

    # End timing
    duration_ms = round((time.time() - start_time) * 1000, 2)
    res["training_time_ms"] = duration_ms
    res["feature_bounds"] = feature_bounds

    # Store trained model in global_store as well
    global_store["trained_model"] = latest_model_store["model"]

    return res

def _run_classification(X, df_clean, target_col, algorithm, params, test_size_val):
    if not target_col:
        raise ValueError("Target column is required for classification.")

    y = df_clean[target_col]
    le_target = LabelEncoder()
    y_encoded = le_target.fit_transform(y.astype(str))
    latest_model_store["target_encoder"] = le_target

    if len(np.unique(y_encoded)) < 2:
        raise ValueError("Target column must have at least 2 unique classes.")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=float(test_size_val)/100.0, random_state=42
    )

    # Instantiate model
    if algorithm == "knn":
        k = int(params.get("k", 5))
        weights = params.get("weights", "uniform")
        model = KNeighborsClassifier(n_neighbors=k, weights=weights)
    elif algorithm == "decision_tree":
        max_depth = params.get("max_depth")
        max_depth = int(max_depth) if max_depth and str(max_depth).strip() != "" else None
        min_split = int(params.get("min_samples_split", 2))
        crit = params.get("criterion", "gini")
        model = DecisionTreeClassifier(max_depth=max_depth, min_samples_split=min_split, criterion=crit, random_state=42)
    elif algorithm == "svm":
        C = float(params.get("C", 1.0))
        kernel = params.get("kernel", "rbf")
        model = SVC(C=C, kernel=kernel, probability=True, random_state=42)
    else:
        raise ValueError(f"Unknown classification algorithm: {algorithm}")

    model.fit(X_train, y_train)
    latest_model_store["model"] = model

    y_pred = model.predict(X_test)

    # Compute metrics
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

    cm = confusion_matrix(y_test, y_pred).tolist()
    class_labels = le_target.inverse_transform(sorted(np.unique(y_encoded))).tolist()

    report_dict = classification_report(y_test, y_pred, target_names=class_labels, output_dict=True, zero_division=0)

    # Convert all metrics in report to standard python floats/ints
    cleaned_report = {}
    for key, val in report_dict.items():
        if isinstance(val, dict):
            cleaned_report[key] = {inner_k: float(inner_v) for inner_k, inner_v in val.items()}
        else:
            cleaned_report[key] = float(val)

    return {
        "task_type": "classification",
        "algorithm": algorithm.upper(),
        "accuracy": round(acc * 100, 2),
        "precision": round(prec * 100, 2),
        "recall": round(rec * 100, 2),
        "f1": round(f1 * 100, 2),
        "confusion_matrix": cm,
        "classification_report": cleaned_report,
        "classes": class_labels,
        "train_size": len(X_train),
        "test_size": len(X_test)
    }

def _run_regression(X, df_clean, target_col, algorithm, params, test_size_val):
    if not target_col:
        raise ValueError("Target column is required for regression.")

    y = pd.to_numeric(df_clean[target_col], errors="coerce")
    valid_idx = y.notna()
    if not valid_idx.any():
        raise ValueError("Target column must contain numeric values for regression.")

    X_filtered = X[valid_idx]
    y_filtered = y[valid_idx]

    X_train, X_test, y_train, y_test = train_test_split(
        X_filtered, y_filtered, test_size=float(test_size_val)/100.0, random_state=42
    )

    # Instantiate model
    if algorithm == "linear_regression":
        fit_intercept = bool(params.get("fit_intercept", True))
        model = LinearRegression(fit_intercept=fit_intercept)
    elif algorithm == "random_forest_regressor" or algorithm == "random_forest":
        n_estimators = int(params.get("n_estimators", 100))
        max_depth = params.get("max_depth")
        max_depth = int(max_depth) if max_depth and str(max_depth).strip() != "" else None
        model = RandomForestRegressor(n_estimators=n_estimators, max_depth=max_depth, random_state=42)
    else:
        raise ValueError(f"Unknown regression algorithm: {algorithm}")

    model.fit(X_train, y_train)
    latest_model_store["model"] = model

    y_pred = model.predict(X_test)

    r2 = float(r2_score(y_test, y_pred))
    mae = float(mean_absolute_error(y_test, y_pred))
    mse = float(mean_squared_error(y_test, y_pred))
    rmse = float(np.sqrt(mse))

    residuals = (y_pred - y_test).tolist()

    return {
        "task_type": "regression",
        "algorithm": algorithm.upper(),
        "r2": round(r2, 4),
        "mae": round(mae, 4),
        "mse": round(mse, 4),
        "rmse": round(rmse, 4),
        "actuals": y_test.tolist(),
        "predictions": y_pred.tolist(),
        "residuals": residuals,
        "train_size": len(X_train),
        "test_size": len(X_test)
    }

def _run_clustering(X, algorithm, params):
    # Instantiate model
    if algorithm == "kmeans":
        n_clusters = int(params.get("n_clusters", 3))
        max_iter = int(params.get("max_iterations", params.get("max_iter", 300)))
        init_method = params.get("init", "k-means++")
        model = KMeans(n_clusters=n_clusters, max_iter=max_iter, init=init_method, random_state=42, n_init=10)
    else:
        raise ValueError(f"Unknown clustering algorithm: {algorithm}")

    labels = model.fit_predict(X)
    latest_model_store["model"] = model

    unique_labels = np.unique(labels)
    n_clusters_found = int(len(unique_labels) - (1 if -1 in labels else 0))

    # Silhouette score (requires at least 2 unique clusters, excluding noise)
    valid_silhouette = False
    sil_score = 0.0
    if len(set(labels)) > 1:
        # Ignore noise points or keep them depending on silhouette rule
        try:
            sil_score = float(silhouette_score(X, labels))
            valid_silhouette = True
        except Exception:
            pass

    inertia_val = None
    if hasattr(model, "inertia_"):
        inertia_val = float(model.inertia_)

    # Cluster sizes
    sizes = {}
    for lbl in labels:
        lbl_py = int(lbl)
        sizes[lbl_py] = sizes.get(lbl_py, 0) + 1

    # Cluster summary
    cluster_summary = []
    df_temp = X.copy()
    df_temp["__cluster"] = labels
    for lbl in sorted(np.unique(labels)):
        cluster_df = df_temp[df_temp["__cluster"] == lbl]
        size = len(cluster_df)
        percent = float(size) / len(df_temp) * 100.0
        
        summary = {
            "cluster": "Noise" if lbl == -1 else f"Cluster {int(lbl)}",
            "size": int(size),
            "percent": round(percent, 2)
        }
        # Add means for each feature
        for col in X.columns:
            summary[col] = float(cluster_df[col].mean()) if size > 0 else 0.0
            
        cluster_summary.append(summary)

    return {
        "task_type": "clustering",
        "algorithm": algorithm.upper(),
        "inertia": inertia_val,
        "silhouette_score": round(sil_score, 4),
        "n_clusters": n_clusters_found,
        "cluster_sizes": {str(k): int(v) for k, v in sizes.items()},
        "cluster_summary": cluster_summary,
        "labels_preview": [int(l) for l in labels[:60]],
        "total_rows": len(X)
    }
