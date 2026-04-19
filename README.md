# 🌙 Dream Daily

An AI-powered dream journal that transforms your dreams into visual stories.

[中文使用说明](使用说明.md) | [Live Demo](http://118.145.251.226:3000)

---

## ✨ Features

- 🎨 **AI Dream Visualization** - Turns your dream descriptions into illustrated stories
- 🌓 **Dark/Light Theme** - Eye-friendly themes with automatic persistence
- 🔮 **Cyber Psychologist** - Deep dream analysis with AI
- ⏭️ **Dream Continuation** - Let AI extend your dream stories
- 🌌 **Parallel Branches** - Explore "what if" scenarios in your dreams
- 📚 **Dream History** - Browse past dreams with calendar view
- 📊 **Visitor Statistics** - Track website usage (admin only)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Kristen0104/dream-daily.git
cd dream-daily

# Install dependencies
npm install

# Create .env file with your API keys
# See .env.example for reference

# Build frontend
npm run build

# Start backend server
cd backend
npm install
npm start
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **AI**: VolcEngine (Doubao) API
- **Deployment**: PM2 on cloud server

---

## 📁 Project Structure

```
dream-daily/
├── src/              # React frontend
│   ├── pages/        # Page components
│   ├── hooks/        # Custom hooks
│   ├── services/     # AI services
│   └── styles/       # CSS styles
├── backend/          # Express backend
│   ├── src/
│   │   ├── server.js # API server
│   │   └── db.js     # Database logic
│   └── data/         # SQLite database files
├── dist/             # Built frontend
└── 使用说明.md       # Chinese user manual
```

---

## 🔧 Configuration

Create a `.env` file in the backend directory:

```env
VOLC_API_KEY=your_volcengine_api_key_here
PORT=3001
```

---

## 📝 License

MIT

---

## 👥 Author

Created with ❤️ by Kristen
