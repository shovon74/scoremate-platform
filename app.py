from flask import Flask, render_template
from config import Config
from blueprints.writing.task2 import writing_task2_bp
from blueprints.writing.task1 import writing_task1_bp
from blueprints.speaking.speaking import speaking_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Register Blueprints
    app.register_blueprint(writing_task2_bp, url_prefix='/api/writing/task2')
    app.register_blueprint(writing_task1_bp, url_prefix='/api/writing/task1')
    app.register_blueprint(speaking_bp, url_prefix='/api/speaking')


    @app.route('/')
    def index():
        return render_template('index.html')

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=Config.DEBUG)