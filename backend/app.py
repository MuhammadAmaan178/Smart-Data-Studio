from flask import Flask
from flask_cors import CORS
from api.upload import upload_bp
from api.clean import clean_bp
from api.metrics import metrics_bp
from api.charts import charts_bp
from api.summary import summary_bp
from api.ml import ml_bp
from api.dl import dl_bp
from api.demo import demo_bp
from api.predict import predict_bp

app = Flask(__name__)
CORS(app)

# Register Blueprints
app.register_blueprint(upload_bp,  url_prefix='/api')
app.register_blueprint(clean_bp,   url_prefix='/api')
app.register_blueprint(metrics_bp, url_prefix='/api')
app.register_blueprint(charts_bp,  url_prefix='/api')
app.register_blueprint(summary_bp, url_prefix='/api')
app.register_blueprint(ml_bp,      url_prefix='/api')
app.register_blueprint(dl_bp,      url_prefix='/api')
app.register_blueprint(demo_bp,    url_prefix='/api')
app.register_blueprint(predict_bp, url_prefix='/api')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
