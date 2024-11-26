import os
import re
import pandas as pd
from flask import Flask, request, jsonify, redirect, session, url_for
from flask_cors import CORS
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import google.oauth2.credentials
import requests
import json
import openai
# Flask App Setup
app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config['SESSION_TYPE'] = 'filesystem'
CORS(app)

# Configuration
CLIENT_SECRETS_FILE = 'client_secret_1052901227026-2j1mt2p5s6833ditis49mqksac7cim6s.apps.googleusercontent.com.json'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
SERPAPI_KEY = 'f7df076291a7951e3a1146207e678b1b33316618c3c7eb5eb22d7a8b8053b1ce'
SERPAPI_URL = 'https://serpapi.com/search'

openai.api_key = "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"
def call_llm_api(prompt, serp_data):
    # This is where you would send the prompt and the SERP results to the LLM
    # Assuming you are calling an external LLM API (e.g., OpenAI or custom model)

    llm_input = {
        'prompt': prompt,
        'serp_data': serp_data  # Send the SERP API results data along with the prompt
    }
    
    # Example of how the request might be structured
    try:
        llm_response = requests.post('LLM_API_URL', json=llm_input)  # Replace with actual LLM URL
        if llm_response.status_code == 200:
            return llm_response.json()  # Assuming the response contains the LLM's result
        else:
            return {'error': 'LLM request failed', 'details': llm_response.text}
    except Exception as e:
        return {'error': 'Error calling LLM API', 'details': str(e)}

@app.route('/search-and-parse', methods=['POST'])
def search_and_parse():
    data = request.get_json()  # Get the JSON data from the request
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400

    prompt = data.get('prompt')  # Get the prompt from the frontend
    serp_data = data.get('serp_data')  # Get the SERP data sent by the frontend

    if not prompt or not serp_data:
        return jsonify({'error': 'Missing required fields: prompt or serp_data'}), 400

    # Now call the LLM with both the prompt and the SERP results data
    llm_response = call_llm_api(prompt, serp_data)

    # Return the response from the LLM
    if 'error' in llm_response:
        return jsonify({'error': llm_response['error'], 'details': llm_response['details']}), 500
    return jsonify({'result': llm_response})


@app.route('/search', methods=['POST'])
def search():
    try:
        # Get the query from the request body
        data = request.get_json()
        query = data.get('query')

        if not query:
            return jsonify({"message": "Query is required."}), 400

        # Prepare the parameters for SerpAPI search
        params = {
            'q': query,
            'api_key': SERPAPI_KEY
        }

        # Make the request to SerpAPI
        response = requests.get(SERPAPI_URL, params=params)

        # Check if the response is successful
        if response.status_code != 200:
            return jsonify({"message": "Failed to fetch results from the search engine."}), 500

        # Get the search results from the response
        results = response.json().get('organic_results', [])
        with open("serpapi_response.json", "w") as f:
            json.dump(response.json(), f, indent=4)

        # Send back the results to the frontend
        return jsonify({"results": results})

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/view_file_contents', methods=['GET'])
def view_file_contents():
    # Retrieve filename from the request parameters
    filename = request.args.get('filename')
    if not filename:
        return jsonify({"message": "Filename is required."}), 400

    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    if not os.path.exists(filepath):
        return jsonify({"message": "File not found."}), 404

    try:
        # Load the file into a DataFrame
        data = pd.read_csv(filepath)
        
        # Convert the DataFrame to a dictionary format
        # Limit to first 100 rows to avoid sending excessive data
        data_dict = data.head(100).to_dict(orient='records')
        
        # Collect column headers
        columns = data.columns.tolist()

        # Return columns and data content
        return jsonify({"columns": columns, "data": data_dict}), 200

    except Exception as e:
        app.logger.error(f"Error in view_file_contents: {str(e)}")
        return jsonify({"error": f"Could not read file: {str(e)}"}), 500
# Google Sheets ID Extraction
def extract_sheet_id(url):
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", url)
    return match.group(1) if match else None

# Check if Google Sheet is public
def is_public_google_sheet(url):
    return "https://docs.google.com/spreadsheets" in url and "edit" in url

# Google Sheets Authorization Route
@app.route('/login')
def login():
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri=url_for('oauth2callback', _external=True)
    )
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    session['state'] = state
    return redirect(authorization_url)

# OAuth2 Callback Route
@app.route('/oauth2callback')
def oauth2callback():
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        state=session['state'],
        redirect_uri=url_for('oauth2callback', _external=True)
    )
    flow.fetch_token(authorization_response=request.url)
    credentials = flow.credentials
    session['credentials'] = credentials_to_dict(credentials)
    return redirect(url_for('home'))

# Fetch and Download Google Sheets Data
@app.route('/fetch_and_download', methods=['POST'])
def fetch_and_download():
    data = request.get_json()
    sheet_url = data.get('sheet_url')
    if not sheet_url:
        return jsonify({"message": "Google Sheets URL is required."}), 400

    sheet_id = extract_sheet_id(sheet_url)
    if not sheet_id:
        return jsonify({"message": "Invalid Google Sheets URL."}), 400

    filename = f"{sheet_id}.csv"
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    try:
        # Public Google Sheets - No OAuth needed
        if is_public_google_sheet(sheet_url):
            csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
            response = requests.get(csv_url)
            response.raise_for_status()
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            data = pd.read_csv(filepath)
            columns = data.columns.tolist()
            return jsonify({"columns": columns, "file_path": filepath}), 200

        # Private Google Sheets - Requires OAuth
        if 'credentials' not in session:
            return redirect(url_for('login'))
        
        credentials = google.oauth2.credentials.Credentials(**session['credentials'])
        service = build('sheets', 'v4', credentials=credentials)

        result = service.spreadsheets().values().get(spreadsheetId=sheet_id, range='Sheet1').execute()
        values = result.get('values', [])
        
        pd.DataFrame(values[1:], columns=values[0]).to_csv(filepath, index=False)
        columns = values[0]
        return jsonify({"columns": columns, "file_path": filepath}), 200

    except Exception as e:
        app.logger.error(f"Error in fetch_and_download: {str(e)}")
        return jsonify({"error": f"Could not retrieve data: {str(e)}"}), 500

# File Upload Route
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    filename = file.filename
    file_ext = filename.rsplit('.', 1)[-1].lower()
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        if file_ext == 'csv':
            data = pd.read_csv(filepath)
        elif file_ext == 'xlsx':
            data = pd.read_excel(filepath)
        else:
            return jsonify({"message": "Unsupported file type. Only CSV and XLSX are allowed."}), 400
        columns = data.columns.tolist()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"columns": columns, "filename": filename, "file_path": filepath}), 200

# Convert credentials to dictionary for session storage
def credentials_to_dict(credentials):
    return {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }

# Home Route
@app.route('/', methods=['GET'])
def home():
    if 'credentials' not in session:
        app.logger.debug("Credentials not found in session.")
        return redirect(url_for('login'))
    
    app.logger.debug("Credentials found in session.")
    return "Flask API is running and you are authenticated!"
if __name__ == '__main__':
    app.run(debug=True)
