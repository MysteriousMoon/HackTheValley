# 📚 AI Student - Learning Assistant

An AI-powered learning assistant that helps you discover knowledge blind spots using the Feynman Learning Method. The AI acts as a curious student, asking questions about your explanations to test your understanding.

## Features

- 🤖 AI student that asks intelligent questions about your explanations
- 🎯 Based on the Feynman Learning Method
- 🔍 Helps identify gaps in your knowledge
- 💡 Interactive learning experience
- 🌐 Simple web interface

## Quick Start

### Prerequisites

- Python 3.7+
- Google Gemini API Key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd HackTheValley
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
echo "GOOGLE_API_KEY=your_api_key_here" > .env
```

### Run

```bash
python app.py
```

Then open your browser and visit `http://localhost:5000`

## How It Works

1. Explain a concept or topic to the AI student
2. The AI acts as a curious learner and asks clarifying questions
3. Answer the questions to test your understanding
4. Discover your knowledge gaps and strengthen your learning

## Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript
- **AI**: Google Gemini API
- **CORS**: Flask-CORS

## License

MIT
