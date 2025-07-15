# app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import requests
import google.generativeai as genai
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, JWTManager, jwt_required, get_jwt_identity
import time
from bson.objectid import ObjectId 
import concurrent.futures
from bs4 import BeautifulSoup
import re 



load_dotenv()

app = Flask(__name__)

CORS(app)

# --- Configuration from Environment Variables ---
NEWS_API_KEY = os.getenv("NEWS_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MONGO_URI = os.getenv("MONGO_URI")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY")

# Basic validation for essential keys
if not all([NEWS_API_KEY, GEMINI_API_KEY, MONGO_URI, JWT_SECRET_KEY, FLASK_SECRET_KEY]):
    raise ValueError("One or more essential environment variables are missing. Please check your .env file.")


app.config["SECRET_KEY"] = FLASK_SECRET_KEY


app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
jwt = JWTManager(app)


try:
    client = MongoClient(MONGO_URI)
    db = client.news_app_db 
    users_collection = db.users 
    print("MongoDB connected successfully!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
   
genai.configure(api_key=GEMINI_API_KEY)

def scrape_article_content(url):
    """
    Fetches an article from a given URL and attempts to extract its main text content.
    Returns the extracted text as a string.
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)

        soup = BeautifulSoup(response.text, 'lxml')

        # Attempt to find common article content containers
        # This is a heuristic and might need refinement for specific sites
        article_text = []
        
        # Prioritize common article body tags
        article_body = soup.find('article') or soup.find('main') or soup.find(class_=re.compile(r'article|content|body', re.I))
        
        if article_body:
            for paragraph in article_body.find_all('p'):
                text = paragraph.get_text(separator=' ', strip=True)
                if text:
                    article_text.append(text)
        else:
            # Fallback: get all paragraph tags if no clear article body is found
            for paragraph in soup.find_all('p'):
                text = paragraph.get_text(separator=' ', strip=True)
                if text:
                    article_text.append(text)

        # Join paragraphs and clean up extra whitespace
        full_text = "\n\n".join(article_text)
        full_text = re.sub(r'\s+', ' ', full_text).strip() # Replace multiple spaces/newlines with single space

        # Limit text length to avoid exceeding Gemini's context window (e.g., 10,000 characters)
        MAX_TEXT_LENGTH = 10000
        if len(full_text) > MAX_TEXT_LENGTH:
            full_text = full_text[:MAX_TEXT_LENGTH] + "...\n[Content truncated due to length]"

        return full_text if full_text else "Could not extract main article content."

    except requests.exceptions.RequestException as e:
        print(f"Error fetching article content from {url}: {e}")
        return f"Failed to fetch article content due to network error: {e}"
    except Exception as e:
        print(f"Error parsing article content from {url}: {e}")
        return f"Failed to parse article content: {e}"


@app.route('/')
def home():
    """Basic home route to confirm the server is running."""
    return "Welcome to the ByteNews Backend! Access /api/news for articles."

def summarize_text_with_gemini(text_to_summarize):
    """
    Uses Gemini API to generate a concise summary of the provided text.
    """
    if not text_to_summarize:
        return "No content available for summarization."

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')

        prompt = (
            f"Please provide a very concise, byte-sized summary (maximum 3-4 sentences) "
            f"of the following news article description. Focus on the main points:\n\n"
            f"{text_to_summarize}"
        )
        response = model.generate_content(prompt)
    
        summary = response.text
        return summary
    except Exception as e:
        print(f"Gemini summarization error: {e}")
        return "Summarization failed due to an API error."


@app.route('/api/news', methods=['GET'])
def get_news():
    """
    Fetches news from NewsAPI.org, summarizes descriptions with Gemini, and returns them.
    Supports 'q' (query), 'country', and 'category' parameters.
    """
    query = request.args.get('q', 'latest news')
    country = request.args.get('country', 'us').lower() # Default to US
    category = request.args.get('category')
    cached_data = get_cached_news(query, country, category)
    if cached_data:
        return jsonify(cached_data)

    # NewsAPI.org 'everything' endpoint for general search, 'top-headlines' for category/country
    if category:
        news_api_url = f"https://newsapi.org/v2/top-headlines?country={country}&category={category}&q={query}&apiKey={NEWS_API_KEY}&language=en&pageSize=9" # Increased to 9 for 3 sections * 3 news
    else:
        news_api_url = f"https://newsapi.org/v2/everything?q={query}&apiKey={NEWS_API_KEY}&language=en&pageSize=9" # Increased to 9

    try:
        news_response = requests.get(news_api_url)
        news_response.raise_for_status()
        news_data = news_response.json()
        articles = news_data.get('articles', [])

        summarized_articles = []
        for article in articles:
            article_description = article.get('description')
            article_content = article.get('content') # Get full content if available

            # Prioritize content for summarization, then description
            text_to_summarize = article_content if article_content else article_description
            summary = summarize_text_with_gemini(text_to_summarize)

            summarized_articles.append({
                'title': article.get('title', 'No Title'),
                'summary': summary,
                'url': article.get('url', '#'),
                'source': article.get('source', {}).get('name', 'Unknown Source'),
                'imageUrl': article.get('urlToImage', 'https://placehold.co/600x400/cccccc/000000?text=No+Image'),
                'description': article_description, # Keep original description
                'content': article_content # Keep original content
            })

            set_cached_news(query, country, category, summarized_articles)
        return jsonify(summarized_articles)
    except requests.exceptions.RequestException as e:
        print(f"NewsAPI request error: {e}")
        return jsonify({"error": f"Failed to fetch news from external API: {e}"}), 500
    except Exception as e:
        print(f"An unexpected error occurred in get_news: {e}")
        return jsonify({"error": f"An internal server error occurred: {e}"}), 500
    
    except requests.exceptions.RequestException as e:
        print(f"NewsAPI request error: {e}")
        return jsonify({"error": f"Failed to fetch news from external API: {e}"}), 500
    except Exception as e:
        print(f"An unexpected error occurred in get_news: {e}")
        return jsonify({"error": f"An internal server error occurred: {e}"}), 500



@app.route('/api/register', methods=['POST'])
def register_user():
    """
    Handles user registration. Takes username and password, hashes password,
    and stores user in MongoDB.
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400

    # Check if username already exists
    if users_collection.find_one({"username": username}):
        return jsonify({"message": "Username already exists"}), 409

    # Hash the password for security
    hashed_password = generate_password_hash(password)

    try:
        users_collection.insert_one({
            "username": username,
            "password": hashed_password,
            "preferences": [] # Initialize with empty preferences
        })
        return jsonify({"message": "User registered successfully"}), 201
    except Exception as e:
        print(f"Error during registration: {e}")
        return jsonify({"message": "Registration failed"}), 500

@app.route('/api/login', methods=['POST'])
def login_user():
    """
    Handles user login. Verifies credentials and issues a JWT access token.
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400

    user = users_collection.find_one({"username": username})

    if user and check_password_hash(user['password'], password):
        # Create an access token for the user. We use the MongoDB _id as identity.
        access_token = create_access_token(identity=str(user['_id']))
        return jsonify(access_token=access_token, username=username, message="Login successful"), 200
    else:
        return jsonify({"message": "Invalid username or password"}), 401

@app.route('/api/protected', methods=['GET'])
@jwt_required() # protects the route, requiring a valid JWT
def protected_route():
    """
    An example of a protected route that requires a valid JWT.
    Returns the identity of the current user.
    """
    current_user_id = get_jwt_identity() # Get the user's identity from the token
    user = users_collection.find_one({"_id": ObjectId(current_user_id)})
    if user:
        return jsonify(logged_in_as=user['username'], message="You have access to this protected route!"), 200
    return jsonify({"message": "User not found"}), 404


@app.route('/api/chat', methods=['POST'])
@jwt_required()
def chat_with_gemini():
    """
    Handles chatbot interactions. Takes a user question and relevant article content,
    and uses Gemini API to generate a conversational response.
    """
    current_user_id = get_jwt_identity()
    if not current_user_id:
        return jsonify({"message": "Unauthorized: Invalid token"}), 401
    
    data = request.get_json()
    user_question = data.get('question')
    
    full_article_content = data.get('full_article_content')
    article_description = data.get('article_description')
    article_summary = data.get('article_summary')
    article_url = data.get('articleUrl')


    context_text = full_article_content or article_description or article_summary

    if not user_question or not context_text:
        return jsonify({"message": "Missing question or article context for chatbot"}), 400
    elif not user_question:
        return jsonify({"message": "Question is required"}), 400
    elif not article_url:
        return jsonify({"message": "Article URL is required for context"}), 400

    

    if "Failed to fetch" in full_article_content or "Could not extract" in full_article_content:
        return jsonify({"message": f"Could not get article content: {full_article_content}"}), 500


    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = (
            f"You are a helpful news assistant. Based on the following article content, "
            f"answer the user's question concisely. If the question cannot be answered "
            f"from the provided content, politely state that the information is not available.\n\n"
            f"Article Content: \"{full_article_content}\"\n\n"
            f"User's Question: \"{user_question}\"\n\n"
            f"Your Answer:"
        )
        response = model.generate_content(prompt)
        chat_answer = response.text
        return jsonify({"answer": chat_answer}), 200
    except Exception as e:
        print(f"Gemini chatbot error: {e}")
        return jsonify({"message": "Failed to get a response from the chatbot."}), 500


news_cache = {}
CACHE_EXPIRY_SECONDS = 60 * 15 # Cache expires after 15 minutes

def get_cached_news(query, country, category):
    """Checks if news for given parameters is in cache and is not expired."""
    cache_key = (query, country, category)
    if cache_key in news_cache:
        timestamp, data = news_cache[cache_key]
        if (time.time() - timestamp) < CACHE_EXPIRY_SECONDS:
            print(f"Serving news for '{query}' (country: {country}, category: {category}) from cache.")
            return data
    return None


@app.route('/api/user/preferences', methods=['POST'])
@jwt_required()
def update_user_preferences():
    """
    Updates the logged-in user's news preferences (country, topics).
    """
    current_user_id = get_jwt_identity()
    data = request.get_json()
    country = data.get('country')
    topics = data.get('topics') 

    if not country or not isinstance(topics, list) or len(topics) != 3:
        return jsonify({"message": "Country and exactly 3 topics are required."}), 400

    try:
        result = users_collection.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": {"preferences": {"country": country, "topics": topics}}}
        )
        if result.modified_count > 0:
            return jsonify({"message": "Preferences updated successfully"}), 200
        else:

            return jsonify({"message": "Preferences not updated (no change or user not found)"}), 200
    except Exception as e:
        print(f"Error updating preferences: {e}")
        return jsonify({"message": "Failed to update preferences."}), 500

@app.route('/api/user/preferences', methods=['GET'])
@jwt_required()
def get_user_preferences():    #Retrieves the logged-in user's news preferences.
    current_user_id = get_jwt_identity()
    try:
        user = users_collection.find_one({"_id": ObjectId(current_user_id)}, {"_id": 0, "preferences": 1})
        if user and user.get('preferences'):
            return jsonify(user['preferences']), 200
        else:
            # Return default preferences if none are set
            return jsonify({"country": "us", "topics": ["technology", "business", "health"]}), 200
    except Exception as e:
        print(f"Error fetching preferences: {e}")
        return jsonify({"message": "Failed to fetch preferences."}), 500

def set_cached_news(query, country, category, data):    #Stores news data in cache with current timestamp
    cache_key = (query, country, category)
    news_cache[cache_key] = (time.time(), data)
    print(f"Caching news for '{query}' (country: {country}, category: {category}).")




if __name__ == '__main__':
    app.run(debug=True, port=5000)
