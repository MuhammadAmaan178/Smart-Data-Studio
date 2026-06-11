import jwt
import os
from functools import wraps
from flask import request, jsonify

JWT_SECRET = os.getenv('JWT_SECRET', 'fallback_secret')

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(
                token, JWT_SECRET, algorithms=['HS256']
            )
            request.user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired, please log in again'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated
