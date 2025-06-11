# 🎮 Loot & Craft

Action RPG with loot-based progression and crafting system. Built as a Progressive Web App with TypeScript, Vite, and MobX.

## 🚀 Features

- **Action RPG Gameplay**: Turn-based combat with strategy and skill
- **Loot System**: Complex item generation with affixes and rarities
- **Crafting System**: Transform items using orbs and materials
- **Progressive Web App**: Installable, offline-capable gaming experience
- **Responsive Design**: Desktop and mobile optimized with 3-panel layout
- **Grimdark Theme**: Dark, medieval aesthetic inspired by classic ARPGs

## 🛠️ Tech Stack

- **Frontend**: TypeScript, Vite, HTML5 Canvas
- **State Management**: MobX
- **PWA**: Service Workers, Web App Manifest
- **Database**: Supabase (configured)
- **Deployment**: Docker, Nginx

## 📁 Project Structure

```
├── src/
│   ├── components/      # UI components
│   ├── stores/          # MobX state stores
│   ├── services/        # API and game services
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── assets/
│   ├── images/          # Game sprites and UI assets
│   ├── audio/           # Sound effects and music
│   └── data/            # JSON game data files
└── dist/                # Built production files
```

## 🎯 Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
git clone https://github.com/mufasadb/loot-and-craft.git
cd loot-and-craft
npm install
```

### Development Server
```bash
npm run dev
```
Access at http://localhost:3000

### Build
```bash
npm run build
npm run preview
```

### Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run TypeScript linting
- `npm run typecheck` - Run TypeScript type checking

## 🐳 Docker Deployment

### Build Image
```bash
docker build -t loot-and-craft .
```

### Run Container
```bash
docker run -p 80:80 loot-and-craft
```

### Docker Hub
```bash
docker tag loot-and-craft callmebeachy/loot-and-craft:latest
docker push callmebeachy/loot-and-craft:latest
```

## 📱 Unraid Deployment

### Container Configuration
- **Repository**: `callmebeachy/loot-and-craft:latest`
- **WebUI**: `http://[IP]:[PORT:80]`
- **Network Type**: Bridge
- **Port Mapping**: 80:80

### Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### Volume Mappings
```
/config    -> /app/config    (AppData)
```

## 🎲 Game Design

Based on comprehensive Game Development Document (GDD) featuring:

### Core Systems
- **Entity System**: Player, enemies with unified stat computation
- **Item System**: Weapons, armor, crafting materials with affix system
- **Combat System**: Turn-based with range mechanics and status effects
- **Crafting System**: Orb-based item transformation
- **Town Hub**: Activities including dungeons, trading, crafting

### Technical Implementation
- **State Machine**: 13-state combat flow
- **Effect System**: Unified status effects and abilities
- **Asset Pipeline**: Tagged and categorized game assets
- **Responsive UI**: 3-panel layout with mobile collapse

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ENV=development
```

### Supabase Setup
1. Create Supabase project
2. Add environment variables
3. Configure database schema (TBD)

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a personal project. Development follows TDD principles with comprehensive testing requirements.

---

Built with ❤️ using TypeScript and Vite