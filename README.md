
# ByteNews 📰

ByteNews is an automated, personalized news summarization tool designed to help users stay informed without the information overload. By aggregating headlines and condensing them into digestible summaries, ByteNews ensures you get the most important updates in a fraction of the time.

## 🚀 Features

* **Personalized Feeds:** Tailored news content based on user preferences and specific categories.
* **AI-Powered Summarization:** Uses Gemini API to distill long articles into concise bullet points.
* **Multi-Source Aggregation:** Fetches data from various reputable news APIs and RSS feeds.
* **Clean Interface:** A minimalist approach to reading the news, focusing on content rather than ads or distractions.

## 🛠️ Tech Stack

* **Language:** Python
* **Libraries:** `requests`, `BeautifulSoup4` (for scraping).
* **API:** NewsAPI.
* **Environment:** Virtualenv for dependency management.

## 🏁 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

* Python 3.8 or higher
* An API key from your chosen news provider (e.g., [NewsAPI](https://newsapi.org/))

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/SunavaG/ByteNews.git
cd ByteNews

```


2. **Create and activate a virtual environment:**
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

```


3. **Install dependencies:**
```bash
pip install -r requirements.txt

```


4. **Configuration:**
Create a `.env` file in the root directory and add your API credentials:
```env
NEWS_API_KEY=your_api_key_here

```



## 💡 Usage

To launch the summarizer, run the following command:

```bash
python main.py

```

You can customize the categories or keywords within the configuration file to filter the news according to your interests.

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

