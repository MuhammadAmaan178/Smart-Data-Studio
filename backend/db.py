import os
import requests
from dotenv import load_dotenv

load_dotenv(override=True)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

if not os.getenv('SUPABASE_URL'):
    print("[DEBUG] WARNING: SUPABASE_URL is missing from environment variables!")
if not os.getenv('SUPABASE_ANON_KEY'):
    print("[DEBUG] WARNING: SUPABASE_ANON_KEY is missing from environment variables!")

# Clean headers tailored perfectly for the new 'sb_' key format
HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def get_supabase_client():
    """Returns URL and Headers for database interactions dynamically with safety checks"""
    url = os.getenv('SUPABASE_URL') or SUPABASE_URL
    key = os.getenv('SUPABASE_ANON_KEY') or SUPABASE_ANON_KEY
    if not url:
        print("[DEBUG] WARNING: SUPABASE_URL env var could not be retrieved from environment during execution!")
    headers = {
        'apikey': key,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    return url, headers

import re

def execute_with_fallback(url, json_data, headers, retries=3):
    # Copy data to avoid mutating original dictionary outside db.py
    import copy
    current_data = copy.deepcopy(json_data)
    
    for attempt in range(retries):
        res = requests.post(url, json=current_data, headers=headers)
        try:
            res_json = res.json()
            # PostgreSQL code 42703 is undefined_column
            if isinstance(res_json, dict) and res_json.get('code') == '42703':
                message = res_json.get('message', '')
                match = re.search(r'column "(.*?)" of relation', message)
                if match:
                    col_to_remove = match.group(1)
                    print(f"Self-healing DB client: Removing undefined column '{col_to_remove}' and retrying...")
                    if isinstance(current_data, dict):
                        if col_to_remove in current_data:
                            del current_data[col_to_remove]
                    elif isinstance(current_data, list):
                        for item in current_data:
                            if isinstance(item, dict) and col_to_remove in item:
                                del item[col_to_remove]
                    continue
            return res_json
        except Exception:
            try:
                return res.json()
            except Exception:
                return {"error": res.text}
    return {"error": "Max retries exceeded during self-healing"}

def db_select(table, filters=None, columns='*'):
    url, headers = get_supabase_client()
    full_url = f"{url}/rest/v1/{table}?select={columns}"
    if filters:
        for key, value in filters.items():
            full_url += f"&{key}=eq.{value}"
    res = requests.get(full_url, headers=headers)
    try:
        return res.json()
    except Exception:
        return {"error": res.text}

def db_insert(table, data):
    url, headers = get_supabase_client()
    full_url = f"{url}/rest/v1/{table}"
    return execute_with_fallback(full_url, data, headers)

def db_upsert(table, data):
    url, headers = get_supabase_client()
    full_url = f"{url}/rest/v1/{table}"
    upsert_headers = {**headers, 'Prefer': 'resolution=merge-duplicates,return=representation'}
    return execute_with_fallback(full_url, data, upsert_headers)

def db_delete(table, filters):
    url, headers = get_supabase_client()
    full_url = f"{url}/rest/v1/{table}"
    if filters:
        params = '&'.join([f"{k}=eq.{v}" for k, v in filters.items()])
        full_url += f"?{params}"
    res = requests.delete(full_url, headers=headers)
    return res.status_code
