# LiveGuide 🎯

> Transform conversations into visual knowledge graphs with AI-powered coaching

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-Voice_AI-purple)](https://elevenlabs.io/)

LiveGuide is a voice-enabled AI coaching platform that captures verbal insights and renders them into an interactive knowledge graph. Through natural conversations with specialized AI agents, users can explore goals, track progress, and visualize their personal growth journey.

## ✨ Key Features

### 🎙️ **Voice-First Coaching**
- Natural conversations with AI agents via ElevenLabs
- Real-time transcription and insight extraction
- Emotion detection and tracking
- Context-aware responses

### 📊 **Interactive Knowledge Graphs**
- Visual representation of goals, skills, and insights
- Real-time graph updates during conversations
- Temporal navigation (time-travel through your progress)
- Physics-based layouts with Cytoscape.js

### 🤖 **Intelligent Agent Matching**
- Personalized AI coach recommendations
- Context-aware agent selection
- Specialized expertise areas
- Adaptive conversation styles

### 🔍 **Semantic Knowledge Search**
- AI-powered search across all conversations
- RAG (Retrieval Augmented Generation) for context
- Vector embeddings for similarity matching
- Cross-reference insights and goals

## 🚀 Quick Start

### Prerequisites

- Node.js 22.0+ and npm 10.9+
- Supabase account
- ElevenLabs API key
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/liveguide008.git
   cd liveguide008
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ELEVENLABS_API_KEY=your_elevenlabs_key
   OPENAI_API_KEY=your_openai_key
   ```

4. **Run database migrations**
   ```bash
   supabase db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js PWA   │────▶│  Supabase Edge  │────▶│   PostgreSQL    │
│                 │     │    Functions    │     │   + pgvector    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ElevenLabs    │     │     OpenAI      │     │   Cloudflare    │
│   Voice API     │     │   Embeddings    │     │    Turnstile    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 📁 Project Structure

```
liveguide008/
├── src/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # React components
│   │   ├── graph/             # Graph visualization
│   │   ├── onboarding/        # Onboarding flow
│   │   └── voice/             # Voice interface
│   ├── hooks/                 # Custom React hooks
│   ├── contexts/              # React contexts
│   ├── services/              # Business logic
│   └── lib/                   # Utilities
├── supabase/
│   ├── functions/             # Edge functions
│   └── migrations/            # Database schema
├── public/                    # Static assets
└── tests/                     # Test suites
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run dev:branch       # Use development database
npm run build           # Build for production
npm run lint            # Run ESLint

# Database
npm run use:dev         # Switch to dev database
npm run use:prod        # Switch to production database

# Testing
npm run test:e2e        # Run Playwright tests
npm run test:onboarding # Test onboarding flow

# Deployment
supabase functions deploy [name]  # Deploy edge function
vercel deploy                      # Deploy to Vercel
```

### Key Technologies

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Edge Functions, Realtime)
- **AI/ML**: OpenAI GPT-4, ElevenLabs Voice, pgvector
- **Visualization**: Cytoscape.js, Framer Motion
- **Testing**: Playwright, React Testing Library

## 🔐 Security

- Row Level Security (RLS) for data isolation
- JWT authentication with Supabase Auth
- Cloudflare Turnstile for bot protection
- Environment-based configuration
- Secure WebSocket connections

## 📊 Core Systems

### Knowledge Graph
- **Nodes**: Goals, Skills, Emotions, Sessions, Accomplishments
- **Edges**: Relationships with temporal tracking
- **Layouts**: Force-directed, hierarchical, circular
- **Interactions**: Drag, zoom, filter, time-travel

### Voice Conversation
1. User initiates conversation with AI agent
2. Real-time transcription and processing
3. Entity extraction (goals, emotions, insights)
4. Graph updates in real-time
5. Embedding generation for search
6. Context building for future conversations

### Agent Matching
```typescript
// Simplified scoring algorithm
Score = 0.3 * GoalAlignment + 
        0.3 * ExpertiseMatch + 
        0.2 * PersonalityFit + 
        0.2 * HistoricalSuccess
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

## 📦 Deployment

### Vercel Deployment

1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy with:
   ```bash
   vercel deploy --prod
   ```

### Supabase Functions

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy graph-operations-v2
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📚 Documentation

- [Comprehensive Documentation](DOCUMENTATION.md) - Full technical documentation
- [CLAUDE.md](CLAUDE.md) - AI assistant guidelines
- [API Documentation](docs/api.md) - API reference (coming soon)
- [Component Library](docs/components.md) - UI components (coming soon)

## 🐛 Known Issues

- WebSocket reconnection occasionally requires page refresh
- Graph layout may need manual adjustment for large datasets
- Voice recognition accuracy varies with background noise
- Some browsers require explicit microphone permission

## 🗺️ Roadmap

### Q1 2025
- [ ] Mobile native apps (iOS/Android)
- [ ] Offline mode with sync
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

### Q2 2025
- [ ] Team collaboration features
- [ ] Custom agent creation
- [ ] Public API
- [ ] Enhanced RAG with citations

### Q3 2025
- [ ] Video coaching sessions
- [ ] AR graph visualization
- [ ] AI-powered goal recommendations
- [ ] Enterprise features

## 📄 License

This project is proprietary software. All rights reserved.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [ElevenLabs](https://elevenlabs.io/) - Voice AI platform
- [OpenAI](https://openai.com/) - AI models and embeddings
- [Cytoscape.js](https://cytoscape.org/) - Graph visualization
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS

## 📞 Support

- **Documentation**: See [DOCUMENTATION.md](DOCUMENTATION.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/liveguide008/issues)
- **Email**: support@liveguide.app
- **Discord**: [Join our community](https://discord.gg/liveguide) (coming soon)

---

<p align="center">
  Built with ❤️ by the LiveGuide Team
</p>

<p align="center">
  <a href="https://liveguide.app">Website</a> •
  <a href="https://docs.liveguide.app">Documentation</a> •
  <a href="https://blog.liveguide.app">Blog</a>
</p>
