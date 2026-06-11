from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import datetime
import os
import uuid
from db import db_select, db_insert

auth_bp = Blueprint('auth', __name__)
JWT_SECRET = os.getenv('JWT_SECRET', 'fallback_secret')

def generate_token(user_id, email, username):
    payload = {
        'user_id': str(user_id),
        'email': email,
        'username': username,
        'full_name': username, # Keep for backward compatibility
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json(silent=True) or request.form or {}
    username = (data.get('username') or data.get('full_name', '')).strip()
    email = data.get('email', '')
    if isinstance(email, str):
        email = email.strip().lower()
    else:
        email = ''
    password = data.get('password', '')

    if not username or not email or not password:
        print(f"[DEPLOY DEBUG] Extracted Request Payload Keys: {list(data.keys())}", flush=True)
        return jsonify({'error': 'Missing parameters or corrupted network payload transmission'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    # Check if email already exists
    existing = db_select('users', filters={'email': email})
    if existing and len(existing) > 0:
        return jsonify({'error': 'An account with this email already exists'}), 409

    # Hash password with bcrypt
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    # Insert user
    new_user = db_insert('users', {
        'username': username,
        'email': email,
        'password_hash': password_hash
    })

    if not new_user or isinstance(new_user, list) and len(new_user) == 0:
        return jsonify({'error': 'Failed to create account'}), 500

    user = new_user[0] if isinstance(new_user, list) else new_user
    user_name = user.get('username') or user.get('full_name', '')

    # Generate JWT
    token = generate_token(user['id'], user['email'], user_name)

    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'username': user_name,
            'full_name': user_name
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or request.form or {}
    email = data.get('email', '')
    if isinstance(email, str):
        email = email.strip().lower()
    else:
        email = ''
    password = data.get('password', '')

    if not email or not password:
        print(f"[DEPLOY DEBUG] Extracted Request Payload Keys: {list(data.keys())}", flush=True)
        return jsonify({'error': 'Missing parameters or corrupted network payload transmission'}), 400

    # Find user by email
    users = db_select('users', filters={'email': email})
    if not users or len(users) == 0:
        return jsonify({'error': 'No account found with this email'}), 404

    user = users[0]

    # Verify password
    is_valid = bcrypt.checkpw(
        password.encode('utf-8'),
        user['password_hash'].encode('utf-8')
    )
    if not is_valid:
        return jsonify({'error': 'Incorrect password'}), 401

    user_name = user.get('username') or user.get('full_name', '')

    # Generate JWT
    token = generate_token(user['id'], user['email'], user_name)

    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'username': user_name,
            'full_name': user_name
        }
    }), 200

@auth_bp.route('/verify', methods=['GET'])
def verify():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'No token provided'}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    user_name = payload.get('username') or payload.get('full_name', '')
    
    return jsonify({'valid': True, 'user': {
        'id': payload['user_id'],
        'email': payload['email'],
        'username': user_name,
        'full_name': user_name
    }}), 200
