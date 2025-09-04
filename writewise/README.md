# WriteWise - AI Writing Coach

A privacy-first Chrome extension that provides real-time, goal-oriented writing suggestions across Gmail, Slack, Teams, LinkedIn, and Twitter using local AI processing.

## 🌟 Features

- **Privacy-First**: All AI processing happens locally in your browser
- **Goal-Oriented**: Personalized suggestions based on your communication goals (confidence, clarity, warmth, conciseness)
- **Universal Platform Support**: Works across Gmail, Slack, Teams, LinkedIn, and Twitter
- **Real-Time Suggestions**: Non-intrusive suggestions as you type
- **Progress Tracking**: Detailed analytics on your writing improvement
- **Freemium Model**: 50 free suggestions per day, unlimited with premium

## 🏗️ Architecture

### Frontend (Chrome Extension)
- **React 18** with TypeScript for UI components
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **Chrome Extension Manifest v3**

### Backend (Optional SaaS Features)
- **FastAPI** with Python 3.11+
- **SQLAlchemy 2.0** with PostgreSQL
- **JWT authentication** for user management
- **Redis** for rate limiting and caching

### AI Processing
- **Transformers.js** for local inference
- **Web Workers** for background processing
- **Quantized models** for optimal performance
- **Privacy-first** - no data leaves your device

## 🚀 Quick Start

### Extension Development

1. **Install dependencies**
   ```bash
   cd writewise
   npm install
   ```

2. **Build the extension**
   ```bash
   npm run build
   ```

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### Backend Development (Optional)

1. **Start services**
   ```bash
   docker-compose up -d
   ```

2. **The API will be available at `http://localhost:8000`**

## 📁 Project Structure

```
writewise/
├── src/
│   ├── background/          # Service worker
│   ├── content/            # Content scripts & detectors
│   ├── popup/              # Extension popup
│   ├── dashboard/          # Settings dashboard
│   ├── workers/            # AI processing workers
│   └── shared/             # Shared utilities
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Configuration
│   │   ├── models/        # Database models
│   │   └── schemas/       # Pydantic schemas
│   └── requirements.txt
├── public/                 # Static assets
├── dist/                   # Built extension
└── docker-compose.yml      # Development services
```

## 🛠️ Development

### Extension Commands

```bash
# Development build with watch
npm run dev

# Production build
npm run build

# Create extension package
npm run zip

# Run tests
npm run test

# Lint code
npm run lint
```

### Backend Commands

```bash
# Start development server
cd backend
uvicorn app.main:app --reload

# Run tests
pytest

# Database migrations
alembic upgrade head
```

## 📊 Platform Integration

### Supported Platforms

| Platform | Status | Detection Method |
|----------|--------|-----------------|
| Gmail | ✅ | DOM selector + MutationObserver |
| Slack | ✅ | Quill editor detection |
| Teams | ✅ | CKEditor integration |
| LinkedIn | ✅ | Universal + platform-specific |
| Twitter/X | ✅ | React SPA detection |

### Content Script Architecture

Each platform has a dedicated detector that extends the universal detector:

```typescript
class GmailDetector extends UniversalTextDetector {
  // Platform-specific detection logic
}
```

## 🤖 AI Engine

### Local Processing

- Uses **Transformers.js** for in-browser AI inference
- **Web Workers** prevent UI blocking
- **Quantized models** for optimal performance
- **Memory management** for resource efficiency

### Supported Models

- **DistilBERT** for sentiment analysis
- **FLAN-T5** for text generation
- **Custom quantized models** for specific tasks

### Privacy Features

- **No data transmission** - everything runs locally
- **No API calls** to external services
- **Encrypted local storage** for user preferences

## 📈 Analytics & Usage Tracking

### Local Analytics
- Suggestion acceptance rates
- Writing improvement metrics
- Platform usage breakdown
- Progress tracking over time

### Premium Features (Backend Required)
- Cloud sync across devices
- Advanced analytics
- Custom AI model training
- Team/organization features

## 🔧 Configuration

### Environment Variables

```bash
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/writewise
SECRET_KEY=your-secret-key
REDIS_URL=redis://localhost:6379
```

### Extension Settings

Users can configure:
- Writing goals (confidence, clarity, warmth, conciseness)
- Platform-specific preferences
- Suggestion frequency
- UI preferences

## 🧪 Testing

### Extension Testing
```bash
npm run test
```

### Backend Testing
```bash
cd backend
pytest
```

### Manual Testing
1. Load extension in Chrome
2. Visit supported platforms
3. Start typing in text areas
4. Verify suggestions appear
5. Test acceptance/dismissal flows

## 🚀 Deployment

### Extension Store

1. **Build production version**
   ```bash
   npm run build
   npm run zip
   ```

2. **Upload to Chrome Web Store**
   - Use the generated `writewise-extension.zip`
   - Follow Chrome Web Store guidelines

### Backend Deployment

1. **Production Docker**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Environment Setup**
   - Configure production database
   - Set secure JWT secrets
   - Configure Redis clustering
   - Set up SSL certificates

## 🎯 Roadmap

### Phase 1 (MVP) ✅
- Basic Chrome extension
- Local AI processing
- Gmail integration
- Simple suggestions

### Phase 2 (Current)
- Multi-platform support
- Advanced AI models
- User preferences
- Analytics dashboard

### Phase 3 (Planned)
- Mobile app
- Team features
- Advanced AI training
- API integrations

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Comprehensive guides and API docs
- **Community**: Discord server for developers

## 🔒 Privacy & Security

WriteWise is built with privacy as the core principle:

- **Local AI Processing**: No text data leaves your device
- **Minimal Data Collection**: Only essential usage analytics
- **Transparent**: Open-source codebase
- **User Control**: Complete control over your data
- **GDPR Compliant**: Privacy by design

---

**WriteWise** - Empowering better communication through AI, while keeping your privacy intact. ✨