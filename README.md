# Private Transcript

<p align="center">
  <img src="docs/logo.png" alt="Private Transcript Logo" width="128" />
</p>

<p align="center">
  <strong>Privacy-first, offline transcription and note generation.</strong>
</p>

<p align="center">
  Your conversations. Your device. Your control.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#architecture">Architecture</a>
</p>

---

## Why Private Transcript?

Most transcription apps send your audio to the cloud. That's a problem for:

- **Therapists** - HIPAA requires protecting client conversations
- **Lawyers** - Attorney-client privilege demands confidentiality
- **Researchers** - IRB protocols require data protection
- **Anyone** - Who values their privacy

**Private Transcript runs 100% locally.** Your audio never leaves your device. No cloud. No subscriptions. No compromises.

---

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Local Transcription** | Powered by Whisper AI, running entirely on your device |
| **AI Note Generation** | Convert transcripts into structured notes (SOAP, DAP, summaries) |
| **Multi-Niche Support** | Templates for Therapy, Legal, Research, and General use |
| **Encrypted Storage** | SQLCipher-encrypted local database |
| **Cross-Platform** | macOS, Windows, and Linux |

### Privacy Guarantees

- Zero network calls by default
- No telemetry or analytics
- No account required
- All AI runs on-device
- Data stored locally in standard formats
- Works completely offline

### Workspace Types

| Type | For | Templates |
|------|-----|-----------|
| **Therapy** | Therapists, Counselors, Psychologists | SOAP, DAP, BIRP notes |
| **Legal** | Attorneys, Paralegals | Deposition summaries, Client meetings |
| **Research** | Academics, UX Researchers | Interview summaries, Thematic analysis |
| **General** | Everyone | Meeting notes, Quick summaries |

---

## Quick Start

### With Nix (Recommended)

```bash
# Clone and enter directory
cd private-transcript

# Enter dev environment (installs all dependencies)
nix develop

# Install JS dependencies and run
pnpm install
pnpm tauri dev
```

### With direnv

```bash
cd private-transcript
direnv allow
pnpm install
pnpm tauri dev
```

---

## Installation

### Prerequisites

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Frontend build |
| Rust | Latest stable | Backend |
| pnpm | 8+ | Package manager |
| Ollama | Latest | Local LLM (optional but recommended) |

### Step 1: Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### Step 2: Install Node.js & pnpm

```bash
# macOS
brew install node
npm install -g pnpm

# Or use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
npm install -g pnpm
```

### Step 3: Install Ollama (for Local LLM)

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Or download from https://ollama.com
```

### Step 4: Clone & Run

```bash
git clone https://github.com/yourusername/private-transcript.git
cd private-transcript
pnpm install

# Start Ollama in background
ollama serve &
ollama pull llama3.1:8b

# Run the app
pnpm tauri dev
```

---

## Usage

### First Launch

1. Choose your workspace type (Therapy, Legal, Research, or General)
2. The app will guide you through Ollama setup if needed
3. Create your first folder (Client, Case, Project, etc.)
4. Start recording!

### Recording a Session

1. Select a folder from the sidebar
2. Click **"+ New Session"**
3. Click **"Start Recording"**
4. Speak naturally - the app captures your microphone
5. Click **"Stop Recording"** when done
6. The transcript is generated automatically

### Generating Notes

1. Open a session with a transcript
2. Select a template (SOAP, DAP, Summary, etc.)
3. Click **"Generate Note"**
4. Edit the generated note if needed
5. Export to Markdown, PDF, or Word

### Exporting

- **Copy** - Copy to clipboard
- **Markdown** - Export as `.md` file
- **PDF** - Export as `.pdf` file
- **Word** - Export as `.docx` file

---

## Architecture

### Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **App Framework** | Tauri 2.0 | Lightweight, secure, cross-platform |
| **Frontend** | React + TypeScript | Fast development, type safety |
| **Styling** | Tailwind CSS | Rapid UI development |
| **State** | Zustand | Simple, performant state management |
| **Backend** | Rust | Performance, safety, memory efficiency |
| **Database** | SQLite + SQLCipher | Local, encrypted, proven |
| **Transcription** | Whisper (whisper-rs) | Best open-source speech recognition |
| **LLM** | Ollama / OpenRouter | Local-first with cloud option |

### Project Structure

```
private-transcript/
├── src/                          # React Frontend
│   ├── components/
│   │   ├── layout/               # Sidebar, MainContent
│   │   ├── onboarding/           # First-run experience
│   │   ├── recording/            # Audio recording UI
│   │   ├── session/              # Transcript + Notes view
│   │   └── ui/                   # Reusable components
│   ├── stores/                   # Zustand state
│   ├── types/                    # TypeScript definitions
│   └── lib/                      # Utilities
│
├── src-tauri/                    # Rust Backend
│   ├── src/
│   │   ├── commands/             # Tauri IPC handlers
│   │   ├── services/
│   │   │   ├── database.rs       # SQLite operations
│   │   │   ├── whisper.rs        # Transcription
│   │   │   ├── llm.rs            # Note generation
│   │   │   └── audio.rs          # Audio processing
│   │   ├── models/               # Data structures
│   │   ├── templates/            # SOAP, DAP, etc.
│   │   └── db/schema.sql         # Database schema
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── flake.nix                     # Nix development environment
├── shell.nix                     # Alternative nix-shell
└── package.json
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│                      (React + TypeScript)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │ Tauri IPC
┌─────────────────────────▼───────────────────────────────────┐
│                       Rust Backend                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Whisper   │  │   Ollama    │  │      SQLite         │  │
│  │ (transcribe)│  │ (generate)  │  │  (store locally)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                    ❌ No cloud. No network.
```

---

## Building for Production

```bash
pnpm tauri build
```

### Build Outputs

| Platform | Output | Location |
|----------|--------|----------|
| macOS | `.dmg`, `.app` | `src-tauri/target/release/bundle/dmg/` |
| Windows | `.msi`, `.exe` | `src-tauri/target/release/bundle/msi/` |
| Linux | `.deb`, `.AppImage` | `src-tauri/target/release/bundle/deb/` |

---

## Configuration

### Settings

Access settings from the sidebar. Available options:

| Setting | Options | Default |
|---------|---------|---------|
| Theme | Light, Dark, System | System |
| Whisper Model | tiny, base, small, medium, large-v3-turbo | large-v3-turbo |
| LLM Provider | Local (Ollama), Cloud (OpenRouter) | Local |
| LLM Model | llama3.1:8b, mistral, etc. | llama3.1:8b |
| Export Format | Markdown, PDF, Word | Markdown |

### Data Location

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/app.privatetranscript/` |
| Windows | `%APPDATA%\app.privatetranscript\` |
| Linux | `~/.local/share/app.privatetranscript/` |

---

## Privacy & Security

### What We Collect

**Nothing.** Zero telemetry. Zero analytics. Zero network calls.

### Data Storage

- All data stored locally on your device
- Database encrypted with SQLCipher (AES-256)
- Audio files stored in app data directory
- Standard formats - easy to backup or migrate

### Cloud Mode (Optional)

If you enable cloud LLM (OpenRouter):
- Only the transcript text is sent (not audio)
- Requires explicit opt-in
- Clear warning shown before enabling

---

## System Requirements

### Minimum

| Component | Requirement |
|-----------|-------------|
| OS | macOS 12+, Windows 10+, Ubuntu 22.04+ |
| CPU | 4 cores |
| RAM | 8 GB |
| Storage | 10 GB free |

### Recommended

| Component | Requirement |
|-----------|-------------|
| OS | macOS 14+, Windows 11 |
| CPU | Apple Silicon M1+ or 8-core Intel/AMD |
| RAM | 16 GB |
| Storage | 20 GB free |
| GPU | Apple Silicon or NVIDIA 6+ GB VRAM |

---

## Troubleshooting

### Ollama not connecting

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve

# Pull the model
ollama pull llama3.1:8b
```

### Microphone not working

- Check system permissions for microphone access
- Ensure no other app is using the microphone
- Try selecting a different input device in Settings

### Build fails on macOS

```bash
# Install Xcode command line tools
xcode-select --install
```

### Build fails on Linux

```bash
# Install required system dependencies
sudo apt install libwebkit2gtk-4.0-dev libgtk-3-dev libayatana-appindicator3-dev
```

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

### Development Commands

```bash
# Run in development
pnpm tauri dev

# Build for production
pnpm tauri build

# Run frontend only
pnpm dev

# Type check
pnpm tsc --noEmit

# Format code
cargo fmt --manifest-path src-tauri/Cargo.toml
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Whisper](https://github.com/openai/whisper) - OpenAI's speech recognition
- [Ollama](https://ollama.com) - Local LLM runtime
- [Tauri](https://tauri.app) - Desktop app framework
- [whisper-rs](https://github.com/tazz4843/whisper-rs) - Rust bindings for Whisper

---

<p align="center">
  <strong>Built with privacy in mind.</strong>
</p>

<p align="center">
  <sub>Your conversations never leave your device.</sub>
</p>
