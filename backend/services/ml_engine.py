import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, confusion_matrix
# Classification
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
# Clustering
from sklearn.cluster import KMeans, DBSCAN

from services.model_store import latest_model_store, clear_store

def run_ml(df, payload):
    """
    Dispatch ML task based on payload.
    Raises ValueError for user-facing errors.
    """
    task        = payload.get("task")         # 'classification' | 'clustering'
    algorithm   = payload.get("algorithm")    # 'knn' | 'decision_tree' | 'kmeans'
    feature_cols = payload.get("feature_cols", [])
    target_col  = payload.get("target_col")
    params      = payload.get("params", {})

    # ── Validate columns ────────────────────────────────────────────
    if not feature_cols:
        raise ValueError("At least one feature column is required.")
    for col in feature_cols:
        if col not in df.columns:
            raise ValueError(f"Feature column '{col}' not found in dataset.")

    # ── Pre-step: drop NaN rows on the columns we'll use ───────────
    cols_needed = feature_cols + ([target_col] if target_col else [])
    df_clean = df[cols_needed].dropna().reset_index(drop=True)

    if len(df_clean) < 10:
        raise ValueError("Not enough rows after dropping NaN values (need at least 10 clean rows).")

    X = df_clean[feature_cols]

    # Encode any object-type feature columns and SAVE encoders
    X = X.copy()
    feature_encoders = {}
    for col in X.columns:
        if X[col].dtype == object:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            feature_encoders[col] = le

    # Prepare model store for a fresh run
    clear_store()
    latest_model_store["feature_cols"] = feature_cols
    latest_model_store["feature_encoders"] = feature_encoders

    # Calculate realistic bounds for smart autofill
    feature_bounds = {col: {"min": float(X[col].min()), "max": float(X[col].max())} for col in X.columns}

    if task == "classification":
        res = _run_classification(X, df_clean, target_col, algorithm, params)
    elif task == "clustering":
        res = _run_clustering(X, algorithm, params)
    else:
        raise ValueError(f"Unsupported task: '{task}'")

    res["feature_bounds"] = feature_bounds
    return res


def _run_classification(X, df_clean, target_col, algorithm, params):
    if not target_col or target_col not in df_clean.columns:
        raise ValueError("A valid target column is required for classification.")

    y = df_clean[target_col]
    # Encode target if categorical
    le_target = LabelEncoder()
    y_encoded = le_target.fit_transform(y.astype(str))

    latest_model_store["target_encoder"] = le_target
    latest_model_store["task"] = "classification"

    if len(set(y_encoded)) < 2:
        raise ValueError("Target column must have at least 2 unique classes.")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42
    )

    if algorithm == "knn":
        model = KNeighborsClassifier(n_neighbors=max(1, int(params.get("k", 3))))
    elif algorithm == "decision_tree":
        md = params.get("max_depth")
        model = DecisionTreeClassifier(max_depth=int(md) if md else None, random_state=42)
    elif algorithm == "logistic_regression":
        model = LogisticRegression(max_iter=int(params.get("max_iter", 1000)), random_state=42)
    elif algorithm == "random_forest":
        model = RandomForestClassifier(n_estimators=int(params.get("n_estimators", 100)), random_state=42)
    elif algorithm == "svm":
        model = SVC(kernel=params.get("kernel", "rbf"), random_state=42, probability=True)
    elif algorithm == "naive_bayes":
        model = GaussianNB()
    else:
        raise ValueError(f"Unsupported classification algorithm: '{algorithm}'")

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    # Save trained model to store
    latest_model_store["model"] = model

    acc = round(accuracy_score(y_test, y_pred) * 100, 2)
    cm  = confusion_matrix(y_test, y_pred).tolist()
    class_labels = le_target.inverse_transform(sorted(set(y_encoded))).tolist()

    return {
        "task":            "classification",
        "algorithm":       algorithm,
        "accuracy":        acc,
        "confusion_matrix": cm,
        "class_labels":    class_labels,
        "train_size":      len(X_train),
        "test_size":       len(X_test),
    }


def _run_clustering(X, algorithm, params):
    latest_model_store["task"] = "clustering"
    
    if algorithm == "kmeans":
        n_clusters = int(params.get("clusters", 3))
        if n_clusters < 2: raise ValueError("Number of clusters must be at least 2.")
        
        model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        model.fit(X)
        latest_model_store["model"] = model

        labels  = model.labels_.tolist()
        inertia = round(float(model.inertia_), 2)

        return {
            "task":          "clustering",
            "algorithm":     algorithm,
            "n_clusters":    n_clusters,
            "inertia":       inertia,
            "labels_preview": labels[:50],
            "total_rows":    len(X),
        }
    elif algorithm == "dbscan":
        eps = float(params.get("eps", 0.5))
        min_samples = int(params.get("min_samples", 5))
        
        model = DBSCAN(eps=eps, min_samples=min_samples)
        labels = model.fit_predict(X)
        latest_model_store["model"] = model
        
        unique_clusters = set(labels) - {-1}
        return {
            "task": "clustering", "algorithm": "dbscan",
            "n_clusters": len(unique_clusters),
            "noise_points": int((labels == -1).sum()),
            "labels_preview": labels.tolist()[:50],
            "total_rows": len(X),
        }
    else:
        raise ValueError(f"Unsupported clustering algorithm: '{algorithm}'")
