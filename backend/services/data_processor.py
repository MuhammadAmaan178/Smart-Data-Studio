import pandas as pd
import numpy as np
import operator as op_module

# Global store for the MVP
global_store = {
    "df": None
}

# ── Supported demo datasets ───────────────────────────────────────
DEMO_DATASETS = {'titanic', 'penguins', 'breast_cancer', 'iris', 'wine'}

def load_demo_dataset(name: str):
    """
    Load a named demo dataset into global_store['df'].
    Returns (data_preview, anomaly_report) on success, raises ValueError for
    unknown names and propagates any library-level errors.
    """
    if name not in DEMO_DATASETS:
        raise ValueError(f"Unknown dataset '{name}'. Choose from: {', '.join(sorted(DEMO_DATASETS))}")

    if name in ('titanic', 'penguins'):
        import seaborn as sns
        df = sns.load_dataset(name)

    elif name == 'breast_cancer':
        from sklearn.datasets import load_breast_cancer
        raw = load_breast_cancer(as_frame=True)
        df  = raw.frame   # already contains 'target' column

    elif name == 'iris':
        from sklearn.datasets import load_iris
        raw = load_iris(as_frame=True)
        df  = raw.frame

    elif name == 'wine':
        from sklearn.datasets import load_wine
        raw = load_wine(as_frame=True)
        df  = raw.frame

    global_store['df'] = df
    return get_data_preview(df), generate_anomaly_report(df)

def get_possible_dtypes(series):
    current_dtype = str(series.dtype)
    if 'int' in current_dtype or 'float' in current_dtype:
        return ['int', 'float', 'string']
    
    if current_dtype == 'object' or current_dtype == 'string':
        try:
            pd.to_numeric(series.dropna().head(100), errors='raise')
            return ['int', 'float', 'string']
        except (ValueError, TypeError):
            return ['string', 'category', 'boolean']
            
    if 'bool' in current_dtype:
        return ['boolean', 'string']
        
    return ['string', 'int', 'float', 'boolean']

def generate_anomaly_report(df):
    report = {
        "total_rows": len(df),
        "total_duplicates": int(df.duplicated().sum()),
        "columns": {}
    }
    
    for col in df.columns:
        report["columns"][col] = {
            "missing_values": int(df[col].isnull().sum()),
            "inferred_type": str(df[col].dtype),
            "possible_dtypes": get_possible_dtypes(df[col])
        }
    return report

def get_data_preview(df):
    # Handle NaN values for JSON serialization by replacing them with None
    preview_df = df.head(10).replace({np.nan: None})
    return preview_df.to_dict(orient='records')


def _safe(val):
    """Convert numpy scalars and NaN to JSON-safe Python types."""
    if val is None:
        return None
    if isinstance(val, float) and np.isnan(val):
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return round(float(val), 4)
    return val


def generate_data_profile(df):
    """
    Returns a comprehensive data profile dictionary.
    All NaN values are replaced with None for safe JSON serialisation.
    """
    # ── Overview ──────────────────────────────────────────────────
    total_missing   = int(df.isnull().sum().sum())
    total_dupes     = int(df.duplicated().sum())
    memory_kb       = round(df.memory_usage(deep=True).sum() / 1024, 2)

    overview = {
        "total_rows":      len(df),
        "total_cols":      len(df.columns),
        "missing_cells":   total_missing,
        "duplicate_rows":  total_dupes,
        "memory_kb":       memory_kb,
    }

    # ── Per-column stats ──────────────────────────────────────────
    columns = []
    for col in df.columns:
        series = df[col]
        is_numeric = pd.api.types.is_numeric_dtype(series)

        base = {
            "name":          col,
            "dtype":         str(series.dtype),
            "missing_count": int(series.isnull().sum()),
            "unique_count":  int(series.nunique()),
            "is_numeric":    is_numeric,
        }

        if is_numeric:
            desc = series.describe()
            base.update({
                "mean":  _safe(desc.get("mean")),
                "std":   _safe(desc.get("std")),
                "min":   _safe(desc.get("min")),
                "q25":   _safe(desc.get("25%")),
                "q50":   _safe(desc.get("50%")),
                "q75":   _safe(desc.get("75%")),
                "max":   _safe(desc.get("max")),
            })
        else:
            mode_result = series.mode()
            top_val     = str(mode_result.iloc[0]) if not mode_result.empty else None
            top_freq    = int((series == mode_result.iloc[0]).sum()) if not mode_result.empty else None
            base.update({
                "top_value":           top_val,
                "top_value_frequency": top_freq,
            })

        columns.append(base)

    return {"overview": overview, "columns": columns}

def apply_cleaning_actions(df, actions):
    """
    Applies a list of cleaning actions to the DataFrame.
    Raises ValueError if a conversion or operation fails.
    """
    operators = {
        '+': op_module.add,
        '-': op_module.sub,
        '*': op_module.mul,
        '/': op_module.truediv,
        '>': op_module.gt,
        '<': op_module.lt,
        '==': op_module.eq,
        '!=': op_module.ne
    }

    for action_info in actions:
        action = action_info.get("action")
        col = action_info.get("column")
        
        if action == "drop_duplicates":
            df.drop_duplicates(inplace=True)
            
        elif action == "drop_rows" and col:
            df.dropna(subset=[col], inplace=True)
            
        elif action == "fill_mean" and col:
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col].fillna(df[col].mean(), inplace=True)
                
        elif action == "fill_median" and col:
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col].fillna(df[col].median(), inplace=True)
                
        elif action == "fill_0" and col:
            df[col].fillna(0, inplace=True)
            
        elif action == "change_dtype" and col:
            new_type = action_info.get("new_type")
            try:
                if new_type in ["int", "int64"]:
                    df[col] = pd.to_numeric(df[col], errors='raise').astype(int)
                elif new_type in ["float", "float64"]:
                    df[col] = pd.to_numeric(df[col], errors='raise').astype(float)
                elif new_type in ["string", "object", "str"]:
                    df[col] = df[col].astype(str)
                elif new_type == "boolean":
                    if df[col].dtype == object:
                        df[col] = df[col].astype(str).str.lower().map({'true': True, 'false': False, '1': True, '0': False})
                    else:
                        df[col] = df[col].astype(bool)
            except Exception as e:
                raise ValueError(f"Cannot convert column {col} to {new_type}.")
                
        elif action == "drop_column" and col:
            df.drop(columns=[col], inplace=True)
            
        elif action == "add_column":
            new_col = action_info.get("new_column_name")
            method = action_info.get("method")
            params = action_info.get("parameters", {})
            
            if not new_col:
                raise ValueError("New column name is required.")
                
            try:
                if method == "constant":
                    val = params.get("value")
                    df[new_col] = val
                    
                elif method == "arithmetic":
                    col1 = params.get("col1")
                    op = params.get("operator")
                    col2 = params.get("col2")
                    if col1 not in df.columns or col2 not in df.columns:
                        raise ValueError("Invalid columns for arithmetic.")
                    if op not in ['+', '-', '*', '/']:
                        raise ValueError(f"Unsupported operator: {op}")
                    df[new_col] = operators[op](df[col1], df[col2])
                        
                elif method == "string_concat":
                    col1 = params.get("col1")
                    sep = params.get("separator", "")
                    col2 = params.get("col2")
                    if col1 not in df.columns or col2 not in df.columns:
                        raise ValueError("Invalid columns for concatenation.")
                    df[new_col] = df[col1].astype(str) + sep + df[col2].astype(str)
                    
                elif method == "conditional":
                    t_col = params.get("target_col")
                    cond_op = params.get("condition_op")
                    cond_val = params.get("condition_val")
                    true_val = params.get("true_val")
                    false_val = params.get("false_val")
                    
                    if t_col not in df.columns:
                        raise ValueError("Invalid target column for conditional.")
                    if cond_op not in ['>', '<', '==', '!=']:
                        raise ValueError(f"Unsupported operator: {cond_op}")
                        
                    # Parse numeric if possible
                    try:
                        cond_val_parsed = float(cond_val)
                    except (ValueError, TypeError):
                        cond_val_parsed = cond_val
                        
                    condition = operators[cond_op](df[t_col], cond_val_parsed)
                    df[new_col] = np.where(condition, true_val, false_val)
                    
                elif method == "date_extract":
                    d_col = params.get("date_col")
                    part = params.get("extract_part")
                    if d_col not in df.columns:
                        raise ValueError("Invalid date column.")
                    
                    temp_dt = pd.to_datetime(df[d_col], errors='coerce')
                    if part == "year":
                        df[new_col] = temp_dt.dt.year
                    elif part == "month":
                        df[new_col] = temp_dt.dt.month
                    elif part == "day":
                        df[new_col] = temp_dt.dt.day
                    else:
                        raise ValueError(f"Unsupported date part: {part}")
                        
                elif method == "advanced_math":
                    t_col = params.get("target_col")
                    math_op = params.get("math_op")
                    if t_col not in df.columns:
                        raise ValueError("Invalid target column.")
                    if not pd.api.types.is_numeric_dtype(df[t_col]):
                        raise ValueError("Target column must be numeric for advanced math.")
                        
                    if math_op == "round":
                        df[new_col] = np.round(df[t_col])
                    elif math_op == "log":
                        # Replacing 0 or negative values with NaN to avoid runtime warnings
                        safe_col = np.where(df[t_col] > 0, df[t_col], np.nan)
                        df[new_col] = np.log(safe_col)
                    elif math_op == "sqrt":
                        safe_col = np.where(df[t_col] >= 0, df[t_col], np.nan)
                        df[new_col] = np.sqrt(safe_col)
                    else:
                        raise ValueError(f"Unsupported math operation: {math_op}")
                else:
                    raise ValueError(f"Unknown add_column method: {method}")
                    
            except Exception as e:
                raise ValueError(f"Failed to add column '{new_col}' via '{method}': {str(e)}")
                    
    return df
