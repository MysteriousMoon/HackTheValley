# 📚 AI Learning Assistant - Dual Mode

An AI-powered learning assistant with two complementary modes to enhance your learning experience using the Feynman Learning Method.

## 🎯 Features

### Mode 1: AI Student (Original Mode)
- 🤖 AI acts as a curious student, asking questions about your explanations
- 🎯 Based on the Feynman Learning Method
- 🔍 Helps identify gaps in your knowledge
- 💡 Interactive Q&A to test your understanding
- 🌐 Simple web interface

### Mode 2: AI Teacher (NEW!)
- 👨‍🏫 AI acts as an experienced teacher explaining concepts
- 📖 Enter any topic you want to learn
- 💬 Ask questions anytime during the lesson
- 🎓 Get clear, detailed explanations with examples
- 📝 Continuous Q&A support throughout learning

## 🔄 Seamless Mode Switching

Easily switch between modes with a single click:
- **Student Mode**: You teach, AI questions (test your knowledge)
- **Teacher Mode**: AI teaches, you question (learn new concepts)

Both modes work together to provide a complete learning experience!

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

Then open your browser and visit:
- Student Mode: `http://localhost:10001` (default)
- Teacher Mode: `http://localhost:10001/teacher.html`

## 💡 How It Works

### Student Mode (AI Questions You)
1. Explain a concept or topic to the AI student
2. The AI acts as a curious learner and asks clarifying questions
3. Answer the questions to test your understanding
4. Discover your knowledge gaps and strengthen your learning

### Teacher Mode (You Question AI)
1. Enter a topic you want to learn about
2. AI teacher provides a comprehensive explanation
3. Ask questions anytime during or after the lesson
4. Get detailed answers with examples and additional context
5. Build your understanding through interactive dialogue

## 🎨 Key Features

- **Dual Learning Modes**: Switch between teaching and learning
- **Custom API Keys**: Use your own Google Gemini API key
- **Conversation History**: Maintains context throughout the session
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Feedback**: Instant AI responses
- **Smart Q&A**: Context-aware questions and answers

## 🛠 Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **AI**: Google Gemini API
- **CORS**: Flask-CORS

## 📱 Interface

### Student Mode Interface
- Text area for your explanations
- AI feedback section with questions
- Interactive Q&A for each AI question
- Auto-send and manual send options

### Teacher Mode Interface
- Topic input field for learning requests
- AI lesson display area
- Question input section available anytime
- Continuous Q&A throughout the lesson

## 🔧 API Endpoints

### Student Mode
- `POST /api/analyze` - Analyze user's explanation
- `POST /api/respond` - Process user's answer to AI question

### Teacher Mode
- `POST /api/teach` - Generate lesson for a topic
- `POST /api/answer` - Answer student's question

## 🌟 Use Cases

**Student Mode is great for:**
- Preparing for exams or presentations
- Testing your understanding of complex topics
- Identifying knowledge gaps
- Practicing teaching skills

**Teacher Mode is great for:**
- Learning new concepts quickly
- Getting explanations of difficult topics
- Exploring subjects you're curious about
- Getting clarification on specific points

## License

MIT
