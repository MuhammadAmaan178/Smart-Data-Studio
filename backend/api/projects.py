from flask import Blueprint, request, jsonify
from middleware import require_auth
from db import db_select, db_upsert, db_delete
import datetime

projects_bp = Blueprint('projects', __name__)

@projects_bp.route('/list', methods=['GET'])
@require_auth
def list_projects():
    user_id = request.user['user_id']
    projects = db_select(
        'projects',
        filters={'user_id': user_id},
        columns='id,project_name,updated_at,configuration'
    )
    # Sort by updated_at descending
    if projects and isinstance(projects, list):
        projects.sort(
            key=lambda x: x.get('updated_at', '') if x else '',
            reverse=True
        )
    return jsonify(projects or []), 200

@projects_bp.route('/save', methods=['POST'])
@require_auth
def save_project():
    user_id = request.user['user_id']
    data = request.get_json()
    
    project_name = data.get('project_name', 'Untitled Project')
    configuration = data.get('configuration', {})
    project_id = data.get('project_id')
    
    payload = {
        'user_id': user_id,
        'project_name': project_name,
        'configuration': configuration,
        'updated_at': datetime.datetime.utcnow().isoformat()
    }
    
    if project_id:
        payload['id'] = project_id
    
    result = db_upsert('projects', payload)
    
    if not result:
        return jsonify({'error': 'Failed to save project'}), 500
    
    saved = result[0] if isinstance(result, list) else result
    return jsonify({
        'id': saved['id'],
        'project_name': saved['project_name'],
        'updated_at': saved['updated_at']
    }), 200

@projects_bp.route('/delete/<project_id>', methods=['DELETE'])
@require_auth
def delete_project(project_id):
    user_id = request.user['user_id']
    
    # Verify project belongs to user before deleting
    existing = db_select('projects', filters={
        'id': project_id,
        'user_id': user_id
    })
    
    if not existing or len(existing) == 0:
        return jsonify({'error': 'Project not found'}), 404
    
    db_delete('projects', {
        'id': project_id,
        'user_id': user_id
    })
    
    return jsonify({'success': True}), 200
