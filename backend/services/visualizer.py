import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg') # Ensure it doesn't try to open a window
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

def generate_chart(df, config):
    if df is None or df.empty:
        raise ValueError("DataFrame is empty or None")

    chart_type = config.get("chart_type")
    x_col = config.get("x_col")
    y_col = config.get("y_col")
    hue = config.get("hue")
    palette = config.get("palette", "deep")
    title = config.get("title", f"{chart_type.capitalize()} Chart")
    xlabel = config.get("xlabel")
    ylabel = config.get("ylabel")
    legend_loc = config.get("legend_loc", "best")

    # Define allowed parameters for each seaborn function to prevent TypeErrors
    ALLOWED_PARAMS = {
        "barplot": ["estimator", "dodge"],
        "scatterplot": ["alpha", "s"],
        "lineplot": ["linewidth", "marker"],
        "histplot": ["bins", "kde"],
        "boxplot": ["orient"],
        "countplot": ["estimator", "dodge"],
        "correlation_heatmap": []
    }

    # Extract and map specific parameters from config
    plot_kwargs = {}
    if chart_type in ALLOWED_PARAMS:
        for p in ALLOWED_PARAMS[chart_type]:
            if p in config:
                val = config[p]
                # Special mappings for frontend-friendly names
                if p == "s" and "marker_size" in config: val = config["marker_size"]
                if p == "marker" and config.get("show_markers"): val = "o"
                elif p == "marker" and not config.get("show_markers"): val = None
                
                if val is not None:
                    plot_kwargs[p] = val

    # Additional manual mapping for specific frontend names if not already covered
    if chart_type == "scatterplot" and "marker_size" in config:
        plot_kwargs["s"] = config["marker_size"]
    if chart_type == "scatterplot" and "alpha" in config:
        plot_kwargs["alpha"] = float(config["alpha"])
    if chart_type == "lineplot" and "linewidth" in config:
        plot_kwargs["linewidth"] = float(config["linewidth"])
    if chart_type == "lineplot" and config.get("show_markers"):
        plot_kwargs["marker"] = "o"
    if chart_type == "histplot" and "bins" in config:
        try: plot_kwargs["bins"] = int(config["bins"])
        except: pass
    if chart_type == "histplot" and "kde" in config:
        plot_kwargs["kde"] = bool(config["kde"])
    if chart_type == "barplot" or chart_type == "countplot":
        if config.get("estimator") == "sum": plot_kwargs["estimator"] = np.sum
        elif config.get("estimator") == "median": plot_kwargs["estimator"] = np.median
        else: plot_kwargs["estimator"] = np.mean
        if "dodge" in config: plot_kwargs["dodge"] = bool(config["dodge"])
    if chart_type == "boxplot" and "orientation" in config:
        plot_kwargs["orient"] = "h" if config["orientation"] == "horizontal" else "v"

    # Clear previous plots
    plt.clf()
    plt.figure(figsize=(8, 6))
    
    if palette:
        try: sns.set_palette(palette)
        except: pass

    try:
        if chart_type == "barplot":
            if not x_col or not y_col: raise ValueError("Barplot requires X and Y columns.")
            sns.barplot(data=df, x=x_col, y=y_col, hue=hue if hue else None, **plot_kwargs)
            
        elif chart_type == "scatterplot":
            if not x_col or not y_col: raise ValueError("Scatterplot requires X and Y columns.")
            sns.scatterplot(data=df, x=x_col, y=y_col, hue=hue if hue else None, **plot_kwargs)
            
        elif chart_type == "lineplot":
            if not x_col or not y_col: raise ValueError("Lineplot requires X and Y columns.")
            sns.lineplot(data=df, x=x_col, y=y_col, hue=hue if hue else None, **plot_kwargs)
            
        elif chart_type == "histplot":
            if not x_col: raise ValueError("Histplot requires at least an X column.")
            sns.histplot(data=df, x=x_col, hue=hue if hue else None, **plot_kwargs)
            
        elif chart_type == "boxplot":
            if not x_col or not y_col: raise ValueError("Boxplot requires X and Y columns.")
            sns.boxplot(data=df, x=x_col, y=y_col, hue=hue if hue else None, **plot_kwargs)
            
        elif chart_type == "countplot":
            if not x_col: raise ValueError("Countplot requires an X column.")
            sns.countplot(data=df, x=x_col, hue=hue if hue else None, **plot_kwargs)
            
        elif chart_type == "correlation_heatmap":
            numeric_df = df.select_dtypes(include=[np.number])
            if numeric_df.empty: raise ValueError("No numeric columns available.")
            corr = numeric_df.corr()
            sns.heatmap(corr, annot=True, cmap=palette if palette != 'deep' else 'coolwarm', fmt=".2f")
            
        else:
            raise ValueError(f"Unsupported chart type: {chart_type}")

        plt.title(title)
        if xlabel: plt.xlabel(xlabel)
        if ylabel: plt.ylabel(ylabel)
        if hue and legend_loc:
            plt.legend(loc=legend_loc)
            
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format="png")
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        return f"data:image/png;base64,{img_base64}"

    except Exception as e:
        plt.close()
        raise ValueError(f"Failed to generate chart: {str(e)}")
