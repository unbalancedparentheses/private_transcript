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
  <a href="#pricing">Pricing</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#roadmap">Roadmap</a> •
  <a href="#architecture">Architecture</a>
</p>

---

## Table of Contents

- [Why Private Transcript?](#why-private-transcript)
- [Pricing](#pricing)
- [Competitor Landscape](#competitor-landscape)
- [Features](#features)
- [Quick Start](#quick-start)
- [Roadmap](#roadmap)
  - [Week 0: Fix What's Broken](#week-0-fix-whats-broken)
  - [MacWhisper Parity](#-macwhisper-parity-week-1-2)
  - [Full Feature Roadmap](#full-feature-roadmap)
- [Sprint Plan](#sprint-plan)
  - [Week 0: Fix What's Broken](#week-0-fix-whats-broken-2-3-days)
  - [Week 1: Build Complete Product](#week-1-build-complete-product)
  - [Week 2: MacWhisper Parity](#week-2-macwhisper-parity--differentiation)
  - [Week 3: Polish + Launch](#week-3-polish--launch)
- [Platform Strategy](#platform-strategy)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Privacy & Security](#privacy--security)
- [System Requirements](#system-requirements)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Why Private Transcript?

Most transcription apps send your audio to the cloud. That's a problem for:

- **Therapists** - HIPAA requires protecting client conversations
- **Lawyers** - Attorney-client privilege demands confidentiality
- **Researchers** - IRB protocols require data protection
- **Anyone** - Who values their privacy

**Private Transcript runs 100% locally.** Your audio never leaves your device. No cloud. No subscriptions. No compromises.

---

## Our Tagline

> **"The AI meeting brain that never leaves your computer."**

Or:

> **"Otter's intelligence. MacWhisper's privacy. One price forever."**

---

## Pricing

### Tiers

| Tier | Price | What You Get |
|------|-------|--------------|
| **Free** | $0 | Unlimited transcription, basic model (small), MD/TXT export |
| **Pro** | $39 one-time | All models, AI features, all exports, integrations |
| **Cloud Add-on** | +$5/mo | Groq transcription, OpenRouter AI (optional) |

### Why This Works

**Free is truly free:**
- Unlimited transcription — it runs on *your* computer
- No artificial monthly limits
- Better than Buzz (nicer UI, same price)
- Respects the "your device, your control" promise

**Pro is worth $39:**
- AI summaries, action items, key decisions
- Local RAG — chat with all your transcripts
- Cross-meeting insights ("You discussed X with John 4 times")
- Speaker diarization + rename speakers
- Large-v3-turbo model (best accuracy)
- All exports: PDF, DOCX, SRT, VTT, CSV, HTML
- Integrations: Obsidian, Notion, Zapier

**Cloud is optional:**
- For users who want speed over privacy
- Groq = fastest cloud transcription
- OpenRouter = access to Claude, GPT-4, etc.
- Doesn't compromise privacy-first positioning

### The Logic

```
Free = Transcription      (commodity — Whisper is open source)
Pro  = Intelligence       (AI features are the real value)
Cloud = Speed + Power     (optional, for those who want it)
```

### Competitive Position

| Product | Price | Model | Our Advantage |
|---------|-------|-------|---------------|
| **MacWhisper Pro** | $49 | One-time | We have AI features, cross-platform |
| **Otter.ai** | $200/yr | Subscription | We're local, one-time, private |
| **Buzz** | Free | Open source | We have AI, better UX |
| **Private Transcript** | $39 | One-time | Best of all worlds |

---

## Competitor Landscape

### Direct Competitors (Local Transcription)

| App | Platform | Price | Strengths | Weaknesses |
|-----|----------|-------|-----------|------------|
| **MacWhisper** | macOS | $29 one-time | Fast, polished, many features | macOS only, no AI insights |
| **Buzz** | All | Free (OSS) | Open source, cross-platform | Basic UI, no AI features |
| **Whisper Transcription** | macOS | $5-15 | Cheap, simple | Limited features |
| **Vibe** | macOS | Free | Clean UI | Minimal features |
| **Aiko** | macOS/iOS | $10 | Simple, fast | Very basic |

### Cloud Meeting Assistants (Main Competition)

| App | Price | Strengths | Weaknesses |
|-----|-------|-----------|------------|
| **Otter.ai** | $17/mo | Live transcription, integrations | Cloud only, privacy concerns |
| **Fireflies.ai** | $19/mo | Meeting bot, CRM integration | Cloud only, bot joins calls |
| **Fathom** | Free-$32/mo | Free tier, Zoom native | Limited platforms |
| **tl;dv** | $20/mo | Good summaries, clips | Cloud only |
| **Grain** | $19/mo | Video highlights | Cloud only |
| **Read.ai** | $20/mo | Meeting analytics | Cloud only |
| **MeetGeek** | $15/mo | Auto-recording | Cloud only |
| **Sembly.ai** | $10/mo | Cheap, decent AI | Cloud only |

### Audio/Video Editing with Transcription

| App | Price | Strengths | Weaknesses |
|-----|-------|-----------|------------|
| **Descript** | $15-30/mo | Edit audio by editing text | Subscription, cloud |
| **Riverside** | $15/mo | Podcast recording | Cloud focused |
| **ScreenApp** | $12/mo | Screen recording + transcript | Cloud |

### Enterprise/Specialized

| App | Market | Notes |
|-----|--------|-------|
| **Gong** | Sales | $100+/user/mo, sales calls |
| **Chorus** | Sales | Acquired by ZoomInfo |
| **Verbit** | Legal/Enterprise | Human + AI hybrid |
| **Rev** | Professional | Human transcription, $1.50/min |

---

## Competitive Analysis

### vs Cloud Services (Otter, Fireflies, etc.)

**Their strengths:**
- Live transcription during meetings
- Bot joins calls automatically
- Team collaboration
- CRM integrations
- Established brands

**Their weaknesses:**
- Privacy - audio goes to cloud
- Subscription pricing ($15-30/mo)
- Bot joining calls feels creepy
- Vendor lock-in
- Require internet

**Our advantage:**
- 100% local, private
- One-time purchase
- No bot in meetings
- Works offline
- Own your data forever

### vs MacWhisper (Direct Competitor)

**Their strengths:**
- 2+ years head start
- Very polished
- Fast (Parakeet v2)
- Good integrations

**Their weaknesses:**
- macOS only
- No AI insights
- No RAG/chat
- No meeting intelligence

**Our advantage:**
- Cross-platform (macOS, Windows, Linux)
- AI-native (RAG, summaries, insights)
- Meeting intelligence
- Chat with your transcripts

### vs Open Source (Buzz)

**Their strengths:**
- Free
- Open source
- Cross-platform

**Their weaknesses:**
- Basic UI
- No AI features
- No integrations
- Slow development

**Our advantage:**
- Much better UX
- Full AI suite
- Integrations (Obsidian, Notion, etc.)

---

## Market Position

```
                    LOCAL                          CLOUD
                      │                              │
         ┌────────────┼────────────┐   ┌────────────┼────────────┐
         │            │            │   │            │            │
    BASIC│   Buzz     │            │   │            │   Rev      │
         │   Vibe     │            │   │            │            │
         │            │            │   │            │            │
         ├────────────┼────────────┤   ├────────────┼────────────┤
         │            │            │   │            │            │
FEATURES │ MacWhisper │            │   │  Otter     │ Fireflies  │
         │            │ PRIVATE    │   │  Fathom    │ Gong       │
         │            │ TRANSCRIPT │   │            │            │
         │            │            │   │            │            │
         ├────────────┼────────────┤   ├────────────┼────────────┤
         │            │            │   │            │            │
      AI │            │     ★      │   │            │ Descript   │
  NATIVE │            │            │   │            │            │
         │            │            │   │            │            │
         └────────────┴────────────┘   └────────────┴────────────┘
```

**We're targeting the empty quadrant: Local + AI-Native**

---

## Feature Comparison

| Feature | Otter | Fireflies | MacWhisper | Buzz | Private Transcript |
|---------|-------|-----------|------------|------|-------------------|
| 100% Local | ❌ | ❌ | ✅ | ✅ | ✅ |
| AI Summaries | ✅ | ✅ | ❌ | ❌ | ✅ |
| Local RAG | ❌ | ❌ | ❌ | ❌ | ✅ |
| Chat with transcripts | ❌ | ❌ | ❌ | ❌ | ✅ |
| Cross-meeting insights | ❌ | ✅ | ❌ | ❌ | ✅ |
| Cross-platform | ✅ | ✅ | ❌ | ✅ | ✅ |
| One-time price | ❌ | ❌ | ✅ | Free | ✅ |
| Meeting auto-detect | ❌ | ✅ | ❌ | ❌ | ✅ |
| Video support | ✅ | ✅ | ✅ | ❌ | ✅ |
| System audio capture | ❌ | ❌ | ✅ | ❌ | ✅ |
| AI Privacy Redaction | ❌ | ❌ | ❌ | ❌ | ✅ |
| Conversation Analytics | ✅ (paid) | ✅ (paid) | ❌ | ❌ | ✅ |
| Quick Capture Mode | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Who to Watch

| Competitor | Why Watch |
|------------|-----------|
| **MacWhisper** | Direct competitor, sets feature expectations |
| **Otter.ai** | Market leader, see what features users want |
| **Fathom** | Free tier strategy, good AI summaries |
| **Descript** | UX innovation (edit audio by editing text) |
| **Buzz** | Open source community, potential integration |

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

# Roadmap

## ⚠️ PRIORITY: Fix Before New Features

**DO NOT start new features until these are fixed.** These are broken/missing core functionalities that affect user experience.

### Week 0: Fix What's Broken

| Priority | Issue | Effort | Owner |
|----------|-------|--------|-------|
| P0 | Transcription progress (shows 0%) | 2 hours | |
| P0 | Audio playback in session view | 4 hours | |
| P0 | Real PDF/DOCX export (currently fake) | 4 hours | |
| P1 | Microphone level meter | 3 hours | |
| P1 | Toast notifications (replace alerts) | 2 hours | |
| P1 | Settings page for models | 4 hours | |
| P1 | Search within transcript (Ctrl+F) | 3 hours | |
| P1 | Speaker labels in UI | 3 hours | |
| P1 | Ollama connection status | 2 hours | |
| P2 | Pause/resume recording | 4 hours | |
| P2 | Audio-transcript sync (click to seek) | 6 hours | |

**Total: ~37 hours = 1 week with 1 dev, or 2-3 days with 3 devs**

Only after these are fixed, proceed to new features below.

---

## 🎯 MacWhisper Parity (Week 1-2)

**Goal: Match MacWhisper's features, then beat them with AI.**

### Must Match (Core Features)

| Feature | MacWhisper | Us | Effort | Status |
|---------|------------|-----|--------|--------|
| Audio-transcript sync playback | ✅ | ❌ | 6 hrs | Fixing in Week 0 |
| System audio capture | ✅ Pro | ❌ | 2 days | Planned |
| Speaker diarization | ✅ Pro | 🟡 | 1 day | Partial - needs UI |
| Video player + subtitles | ✅ | ❌ | 2 days | **NEW** |
| YouTube transcription | ✅ Pro | ❌ | 1 day | **NEW** |
| Batch transcription | ✅ Pro | ❌ | 1 day | **NEW** |
| Watch folder auto-transcribe | ✅ Pro | ❌ | 1 day | **NEW** |
| Menubar app | ✅ Pro | ❌ | 1 day | **NEW** |
| Global spotlight mode | ✅ Pro | ❌ | 1 day | **NEW** |
| Filler word removal | ✅ | ❌ | 2 hrs | **NEW** |
| All export formats (srt, vtt, csv, docx, pdf, md, html) | ✅ | 🟡 | 1 day | Partial |
| Multiple Whisper models (tiny→large-v3) | ✅ | ✅ | - | Done |
| Star/favorite segments | ✅ | ❌ | 3 hrs | **NEW** |
| Edit/delete segments | ✅ | ❌ | 4 hrs | **NEW** |
| Playback speed (0.5x-3x) | ✅ | ❌ | 2 hrs | Planned |
| 100 language support | ✅ | ✅ | - | Done (Whisper) |
| Compact mode (hide timestamps) | ✅ | ❌ | 1 hr | **NEW** |
| Drag from Voice Memos | ✅ | ❌ | 2 hrs | **NEW** |

### Must Match (Pro Features)

| Feature | MacWhisper Pro | Us | Effort | Status |
|---------|----------------|-----|--------|--------|
| Fast transcription engine | ✅ | ❌ | 2 days | **NEW** - WhisperKit (Mac), [Parakeet TDT](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2) (NVIDIA) |
| Cloud transcription fallback | ✅ | ❌ | 1 day | **NEW** (Groq) |
| DeepL translation | ✅ | ❌ | 1 day | **NEW** |
| Multiple AI providers | ✅ | 🟡 | 1 day | Partial (add more) |
| Notion integration | ✅ | ❌ | 4 hrs | Planned |
| Obsidian integration | ✅ | ❌ | 4 hrs | Planned |
| Zapier/n8n/Make webhooks | ✅ | ❌ | 1 day | Planned |
| Custom GGML models | ✅ | ❌ | 4 hrs | **NEW** |
| Translate subtitles | ✅ | ❌ | 4 hrs | **NEW** |
| Manual speaker assignment | ✅ | ❌ | 4 hrs | **NEW** |

### We Beat Them Here (Differentiation)

| Feature | MacWhisper | Us | Status |
|---------|------------|-----|--------|
| **Local RAG / Chat with transcripts** | ❌ | ✅ | Planned |
| **Cross-meeting insights** | ❌ | ✅ | Planned |
| **AI summaries + action items** | ❌ (manual prompts) | ✅ | Planned |
| **Meeting auto-detection** | ❌ | ✅ | Planned |
| **Windows support** | ❌ | ✅ | Planned |
| **Linux support** | ❌ | ✅ | Planned |
| **Team/collaboration features** | ❌ | ✅ | Planned |
| **Niche templates (legal, medical)** | ❌ | ✅ | Planned |
| **AI Privacy Redaction** | ❌ | ✅ | Planned |
| **Conversation Analytics** | ❌ | ✅ | Planned |
| **Quick Capture Mode** | ❌ | ✅ | Planned |

**Total parity effort: ~2 weeks with 3 devs**

---

## Implementation Gaps (Details)

### Quick Wins (High Impact, Low Effort)
| Issue | Problem | Fix |
|-------|---------|-----|
| Transcription progress tracking | Shows 0%, stubbed out | Wire up actual progress events |
| Real PDF/DOCX export | Exports are text files with wrong extensions | Use proper PDF/DOCX libraries |
| Audio playback in session view | Can't listen while reviewing transcript | Add audio player to session view |
| Microphone level meter | No visual feedback during recording | Add real-time level visualization |
| Better error messages | Uses browser alerts instead of UI | Replace with toast notifications |

### Medium Effort, High Impact
| Issue | Problem | Fix |
|-------|---------|-----|
| Pause/resume recording | Only start/stop available | Implement pause state in audio module |
| Settings page for models | Can only select in onboarding | Add dedicated settings page |
| Search within transcript | No Ctrl+F equivalent | Add inline search component |
| Speaker identification UI | Segments stored but not shown | Display speaker labels in transcript |
| Ollama status indicator | Backend checks but UI doesn't show | Add connection status to UI |

### Strategic (High Effort)
| Issue | Problem | Fix |
|-------|---------|-----|
| System audio capture | Can't record Zoom/Teams/Meet | Implement ScreenCaptureKit (macOS) |
| Audio-transcript sync | Can't click to seek | Wire up timestamps to audio player |
| Database encryption | SQLCipher mentioned but not implemented | Enable SQLCipher encryption |
| Streaming LLM output | Waits for full response | Implement SSE/streaming |

### Code Quality
| Issue | Problem | Fix |
|-------|---------|-----|
| No tests | Zero test coverage | Add unit + integration tests |
| Store too large | Single Zustand store, mixed concerns | Split into domain-specific stores |
| No database migrations | Schema runs every startup | Add proper migration system |

---

## Feature Overview (Value / Effort)

| Feature | Value | Effort | Status | Category |
|---------|-------|--------|--------|----------|
| Local RAG / Semantic Search | 🔥🔥🔥 | Medium | Pending | AI |
| Obsidian/Logseq sync | 🔥🔥🔥 | Low | Pending | Export |
| Real-time caption overlay | 🔥🔥🔥 | High | Pending | Accessibility |
| System audio capture | 🔥🔥🔥 | High | Pending | Recording |
| Real-time transcription | 🔥🔥🔥 | High | Pending | Recording |
| AI summaries (Ollama/OpenRouter) | 🔥🔥🔥 | Medium | Pending | AI |
| Cross-meeting insights | 🔥🔥 | Medium | Pending | AI |
| Rewind mode | 🔥🔥 | Medium | Pending | Recording |
| Speaker identification | 🔥🔥 | High | **PARTIAL** | Transcription |
| Chat with your meetings | 🔥🔥 | Medium | Pending | AI |
| Wake word bookmarking | 🔥🔥 | Low | Pending | Recording |
| Auto-generate email draft | 🔥🔥 | Low | Pending | AI |
| Windows/Linux builds | 🔥🔥 | Medium | Pending | Platform |
| Settings UI with model selection | 🔥🔥 | Low | **PARTIAL** | UI |
| Bundle whisper.cpp | 🔥🔥 | Medium | Pending | Technical |
| OpenRouter integration | 🔥🔥 | Low | Pending | AI |
| Video player + subtitles | 🔥🔥🔥 | Medium | **NEW** | UI |
| YouTube transcription | 🔥🔥🔥 | Low | **NEW** | Recording |
| Batch transcription | 🔥🔥 | Low | **NEW** | Workflow |
| Watch folder auto-transcribe | 🔥🔥 | Low | **NEW** | Workflow |
| Menubar app mode | 🔥🔥 | Low | **NEW** | UI |
| Fast engine: WhisperKit (Mac) / Parakeet (NVIDIA) | 🔥🔥🔥 | Medium | **NEW** | Transcription |
| Audio-transcript sync playback | 🔥🔥🔥 | Medium | **BROKEN** | UI |
| Transcription progress tracking | 🔥🔥🔥 | Very Low | **BROKEN** | UI |
| Real PDF/DOCX export | 🔥🔥 | Low | **BROKEN** | Export |
| Pause/resume recording | 🔥🔥 | Low | **MISSING** | Recording |
| Microphone test/level meter | 🔥🔥 | Low | **MISSING** | Recording |
| Search within transcript | 🔥🔥 | Very Low | **MISSING** | UI |
| AI Privacy Redaction | 🔥🔥🔥 | Medium | **NEW** | Privacy |
| Conversation Analytics Dashboard | 🔥🔥🔥 | Medium | **NEW** | AI |
| Quick Capture Mode | 🔥🔥🔥 | Low | **NEW** | Recording |

---

## Full Feature Roadmap

### Recording

- [ ] **Pause/resume recording** (not just start/stop)
- [ ] **Microphone test/level meter** (visual feedback)
- [ ] **Recording quality selector** (choose sample rate / bitrate)
- [ ] **Always-on background mode** (run as menu bar app)
- [ ] **Quick Capture Mode** (one-tap voice journal, zero friction, auto-transcribe)
- [ ] **Rewind mode** (continuously record last X hours)
- [ ] **Auto-detect meeting start** (detect Zoom, Meet, Teams)
- [ ] **Calendar-triggered recording** (auto-start when event begins)
- [ ] **Voice activity detection** to auto-start
- [ ] **Wake word bookmarking** ("Hey Transcript, bookmark this")
- [ ] **Quick notes during recording** (text annotations with timestamps)
- [ ] System audio capture (record meetings, videos)
- [ ] Multiple audio input selection
- [ ] External mic support (USB, Bluetooth)
- [ ] Automatic gain control
- [ ] Echo cancellation
- [ ] Handle very long recordings (3+ hours)
- [ ] Low disk space warning
- [ ] Noise reduction (RNNoise, DeepFilterNet)
- [ ] Live transcription (real-time)
- [ ] Global hotkey to start/stop
- [ ] Menu bar quick-record

### Transcription Quality

- [ ] **Rename speakers** (change "Speaker 1" to "John")
- [ ] **Merge/split speaker segments** (fix diarization errors)
- [ ] **Auto-language detection**
- [ ] Real-time transcription progress via Tauri events
- [ ] Speaker diarization (pyannote-audio or whisper-diarize)
- [ ] Timestamp format options (HH:MM:SS vs MM:SS)
- [ ] Batch transcription for multiple files
- [ ] Custom vocabulary (medical, legal, technical)
- [ ] Word-level confidence scores
- [ ] Filler word detection and removal
- [ ] Export as SRT/VTT subtitles

### AI Features (Ollama / Local Models / OpenRouter)

- [ ] **Local RAG / Semantic search** (chat with all your meetings)
- [ ] **Cross-meeting insights** (find patterns across meetings)
- [ ] **Meeting type auto-detection** (standup, 1:1, interview)
- [ ] **Auto-generate follow-up email drafts**
- [ ] **Transcript correction learning**
- [ ] **Grammar/punctuation cleanup**
- [ ] **Tone analysis** (formal vs casual, sentiment)
- [ ] **Meeting effectiveness score**
- [ ] **AI Privacy Redaction** (detect and anonymize names, PHI, sensitive info)
- [ ] **Conversation Analytics Dashboard** (talk time %, interruptions, Q&A ratio, trends)
- [ ] Generate session summaries
- [ ] Extract action items automatically
- [ ] Custom templates per workspace type
- [ ] Smart search with semantic understanding
- [ ] Topic/keyword extraction (KeyBERT)
- [ ] Commitment tracking ("I will...", "We agree to...")
- [ ] Talk-time analytics

### Export & Sharing

- [ ] **Obsidian/Logseq sync** (auto-export to vault)
- [ ] **Notion export** (export to Notion pages)
- [ ] **Apple Notes sync**
- [ ] **Email transcript**
- [ ] Export transcripts as PDF
- [ ] Export as plain text or Markdown
- [ ] Copy to clipboard
- [ ] Export audio clip from selection
- [ ] SRT/VTT subtitle export
- [ ] CSV export
- [ ] HTML export

### User Interface

- [ ] **Audio-transcript sync playback** (click text → jump to audio)
- [ ] **Playback speed control** (0.5x, 1x, 1.5x, 2x)
- [ ] **Search within transcript** (Ctrl+F)
- [ ] **Bookmarks/highlights**
- [ ] **Notification when transcription done**
- [ ] **Privacy/blur mode**
- [ ] **Recent files quick access**
- [ ] **Hotkey customization**
- [ ] Dark/light theme toggle
- [ ] Adjustable font size
- [ ] Keyboard-only navigation
- [ ] Compact mode (hide timestamps)
- [ ] Video player with subtitles

### Platform

- [ ] iOS companion app
- [ ] Android companion app
- [ ] Windows/Linux builds
- [ ] Menu bar mode (minimal UI)
- [ ] Home screen widget
- [ ] Siri Shortcuts

### Developer & Integrations

- [ ] REST API for local automation
- [ ] CLI tool for scripting
- [ ] Webhook support (trigger actions on events)
- [ ] Zoom plugin
- [ ] Google Meet extension
- [ ] Microsoft Teams add-in
- [ ] Slack bot
- [ ] Zapier/n8n connector
- [ ] Apple Shortcuts support
- [ ] Raycast extension

### Technical

- [ ] Add test coverage
- [ ] Split Zustand store
- [ ] Add database migrations
- [ ] Streaming LLM output
- [ ] Database encryption (SQLCipher)
- [ ] Battery optimization
- [ ] Auto-update mechanism

### Niche-Specific Features

#### Therapists / Psychologists
- [ ] SOAP notes auto-generation
- [ ] DAP notes template
- [ ] BIRP notes template
- [ ] Mood/sentiment tracking
- [ ] Risk phrase detection
- [ ] HIPAA-compliant storage

#### Attorneys / Legal
- [ ] Speaker roles (Attorney, Witness, Judge)
- [ ] Objection timestamps
- [ ] Exhibit reference detection
- [ ] Q&A format output
- [ ] Redaction tools
- [ ] Court-ready transcript format

#### Researchers / Academics
- [ ] Coding/tagging for qualitative analysis
- [ ] Participant anonymization
- [ ] Export to NVivo/Atlas.ti format
- [ ] IRB compliance features
- [ ] Citation generation

#### Podcasters / Content Creators
- [ ] Show notes generation
- [ ] Chapter markers
- [ ] Pull-quote extraction
- [ ] Audiogram generator

### Completed

- [x] Basic recording and transcription
- [x] Workspace and folder organization
- [x] whisper.cpp integration via CLI
- [x] Modern UI design

---

# Sprint Plan

## Team

| Person | Role | Focus |
|--------|------|-------|
| **P1** | Backend Lead | Rust, Tauri, audio, storage, transcription engine |
| **P2** | Frontend Lead | React, TypeScript, UI/UX, components |
| **P3** | AI/Platform Lead | Ollama, RAG, diarization, builds, integrations |

## Tools

- All team members use **Claude Code** for development
- Git flow: feature branches → PR → merge to main
- Communication: Slack/Discord + 10-min daily standup

---

## WEEK 0: Fix What's Broken (2-3 days)

⚠️ **DO NOT SKIP THIS.** Fix existing issues before adding new features.

### Day 0.1 (First Day)

#### P1 - Backend Fixes
| Time | Task | Issue |
|------|------|-------|
| AM | Fix transcription progress events | Shows 0%, stubbed out |
| AM | Implement pause/resume in audio module | Only start/stop exists |
| PM | Add real PDF export (use printpdf crate) | Currently fake text file |
| PM | Add real DOCX export (use docx crate) | Currently fake text file |

#### P2 - Frontend Fixes
| Time | Task | Issue |
|------|------|-------|
| AM | Add audio player to session view | Can't listen while reviewing |
| AM | Wire up transcription progress bar | Shows 0% |
| PM | Replace browser alerts with toast notifications | Bad UX |
| PM | Add microphone level meter component | No visual feedback |

#### P3 - AI/Platform Fixes
| Time | Task | Issue |
|------|------|-------|
| AM | Add Ollama connection status indicator | Backend checks but UI doesn't show |
| AM | Display speaker labels in transcript UI | Data exists but not shown |
| PM | Build settings page for model selection | Only available in onboarding |
| PM | Test and fix all existing features | Verify nothing else is broken |

### Day 0.2 (Second Day)

#### P1 - Backend
| Time | Task | Issue |
|------|------|-------|
| AM | Implement audio-transcript sync backend | Need get_segment_at_time |
| PM | Add seek-to-timestamp command | Click text → jump audio |

#### P2 - Frontend
| Time | Task | Issue |
|------|------|-------|
| AM | Add search within transcript (Ctrl+F) | No way to find text |
| AM | Implement click-on-transcript → seek | Missing feature |
| PM | Polish all fixed features | Make sure UX is good |

#### P3 - AI/Platform
| Time | Task | Issue |
|------|------|-------|
| AM | Test all AI features work correctly | Verify Ollama integration |
| PM | Test all exports work correctly | Verify PDF/DOCX/MD |

### Day 0.3 (Third Day - Buffer)

#### All Team
| Time | Task |
|------|------|
| AM | Fix any remaining bugs from Day 0.1-0.2 |
| PM | Full app testing, verify all fixes work |
| PM | **Checkpoint: All P0/P1 issues resolved** |

### End of Week 0 Checklist
- [ ] Transcription progress shows real percentage
- [ ] Audio plays in session view
- [ ] PDF/DOCX exports are real documents
- [ ] Microphone level meter works
- [ ] Toast notifications instead of alerts
- [ ] Settings page exists with model selection
- [ ] Search within transcript works
- [ ] Speaker labels display in UI
- [ ] Ollama status shows in UI
- [ ] Pause/resume recording works
- [ ] Click transcript → audio seeks

**Only proceed to Week 1 when ALL boxes are checked.**

---

## WEEK 1: Build Complete Product

### Day 1 (Monday) - Foundation

#### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Set up Tauri + Rust project structure | `src-tauri/` with clean module structure |
| AM | Define data models: Session, Transcript, Segment, Speaker | `models.rs` with all structs |
| PM | Implement SQLite database layer | `database.rs` - create, read, update, delete sessions |
| PM | Build audio recording module (microphone) | `audio.rs` - start, stop, save WAV |

#### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Set up React + Vite + TypeScript + Tailwind | Clean project structure |
| AM | Install shadcn/ui, configure theme | Base components ready |
| PM | Build app shell: sidebar, header, main content area | `AppShell.tsx` |
| PM | Build SessionList component | `SessionList.tsx` - displays sessions |
| PM | Build SessionDetail component (skeleton) | `SessionDetail.tsx` - placeholder |

#### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Set up whisper.cpp, test transcription CLI | Working transcription command |
| AM | Set up Ollama, pull models (llama3, nomic-embed) | Ollama running locally |
| PM | Create transcription service wrapper | `transcription.rs` - call whisper, parse output |
| PM | Set up GitHub Actions CI/CD | Build on push, test on PR |
| PM | Create development build scripts | `npm run dev`, `npm run build` work |

### Day 2 (Tuesday) - Core Pipeline

#### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Implement Tauri commands: `start_recording`, `stop_recording` | Commands callable from frontend |
| AM | Implement Tauri commands: `get_sessions`, `get_session`, `delete_session` | Full CRUD |
| PM | Add transcription job queue (background processing) | Jobs run without blocking UI |
| PM | Implement Tauri events: `transcription_progress`, `transcription_complete` | Frontend receives updates |

#### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build RecordingView: start/stop button, timer | `RecordingView.tsx` |
| AM | Add waveform visualization (use wavesurfer.js or similar) | Visual feedback while recording |
| PM | Connect SessionList to Tauri backend | Real sessions from database |
| PM | Build TranscriptView: display segments with timestamps | `TranscriptView.tsx` |
| PM | Add loading states, empty states | Good UX for all states |

#### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Parse whisper output to segments with timestamps | Structured transcript data |
| AM | Store segments in database with word-level timing | Segments table populated |
| PM | Implement summary generation with Ollama | `generate_summary` function |
| PM | Implement action items extraction | `extract_action_items` function |
| PM | Implement key decisions extraction | `extract_decisions` function |

### Day 3 (Wednesday) - Playback + AI Features

#### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build audio playback engine | `playback.rs` - play, pause, seek, get position |
| AM | Implement audio-transcript sync | Given timestamp → return segment |
| PM | Add playback speed control (0.5x, 1x, 1.5x, 2x) | Speed adjustment works |
| PM | Implement `get_segment_at_time` command | Click-to-seek support |

#### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build AudioPlayer component | `AudioPlayer.tsx` - play/pause/seek/speed |
| AM | Add playback progress bar with time display | Shows current position |
| PM | Implement click-on-transcript → seek to time | Transcript is clickable |
| PM | Highlight current segment during playback | Visual sync feedback |
| PM | Add keyboard shortcuts: Space (play/pause), arrows (skip) | `useKeyboardShortcuts` hook |

#### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Integrate whisperX for speaker diarization | Speakers identified in transcript |
| AM | Parse diarization output, store speaker IDs | `speaker_id` field on segments |
| PM | Create meeting type detection prompt | Detects: standup, 1:1, interview, etc. |
| PM | Create custom summary templates per meeting type | Different prompts per type |
| PM | Test all AI prompts, refine for quality | Prompts produce good output |

### Day 4 (Thursday) - Search + RAG

#### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Set up SQLite-vec for vector storage | Vector extension installed |
| AM | Create embeddings table and functions | Store/query embeddings |
| PM | Implement `index_transcript` - generate embeddings on save | Auto-index new transcripts |
| PM | Implement `semantic_search` - query across all transcripts | Search returns relevant segments |
| PM | Implement `search_in_session` - search within one transcript | Ctrl+F functionality |

#### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build SummaryPanel: summary, actions, decisions | `SummaryPanel.tsx` |
| AM | Add "Regenerate" button for AI content | Can re-run AI analysis |
| PM | Build SearchView: global search with results | `SearchView.tsx` |
| PM | Build inline search (Ctrl+F) for single transcript | `TranscriptSearch.tsx` |
| PM | Display speaker names, add rename UI | Edit "Speaker 1" → "John" |

#### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Set up nomic-embed via Ollama for embeddings | Embedding generation works |
| AM | Create RAG pipeline: query → chunks → context → answer | Full RAG flow |
| PM | Build "Chat with transcript" backend | Streaming responses |
| PM | Implement cross-meeting insights | "You discussed X with Y 3 times" |
| PM | Test RAG quality, tune chunk size and prompts | Good answers |

### Day 5 (Friday) - Export + Settings

#### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Implement Markdown export | `export_markdown` function |
| AM | Implement PDF export (HTML → PDF) | `export_pdf` function |
| AM | Implement plain text export | `export_txt` function |
| PM | Implement copy to clipboard (all formats) | `copy_to_clipboard` command |
| PM | Add session tagging system | Tags stored, filterable |

#### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build ExportModal: format selection, options | `ExportModal.tsx` |
| AM | Add copy buttons (transcript, summary, markdown) | One-click copy |
| PM | Build SettingsView: model selection, paths, preferences | `SettingsView.tsx` |
| PM | Add tag management UI | Create, assign, filter by tags |
| PM | Build OnboardingWizard for first-run | `OnboardingWizard.tsx` |

#### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Implement Obsidian sync (file watcher + export) | Auto-exports to vault |
| AM | Implement Notion export (API integration) | Export to Notion pages |
| PM | Create macOS build (.dmg) | Installable Mac app |
| PM | Create Windows build (.msi/.exe) | Installable Windows app |
| PM | Create Linux build (.AppImage, .deb) | Installable Linux app |

### WEEK 1 COMPLETE
**Deliverable:** Core product with AI features on all platforms

---

## WEEK 2: MacWhisper Parity + Differentiation

**Goal: Match every MacWhisper feature, then beat them with AI.**

### Day 6 (Monday) - Video + YouTube + System Audio

#### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Implement macOS system audio capture (ScreenCaptureKit) | Record Zoom/Meet/Teams |
| PM | Add YouTube download + transcription (yt-dlp) | `transcribe_youtube(url)` |
| PM | Implement video file support (extract audio track) | Handle mp4, mov, webm |

#### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build VideoPlayer component with subtitles | `VideoPlayer.tsx` |
| AM | Sync subtitles to video playback | Highlight current text |
| PM | Add YouTube URL input + transcribe button | Paste URL → transcribe |
| PM | Add audio source selector (mic/system/both) | Dropdown in recording view |

#### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Integrate fast transcription: WhisperKit (Mac) / Parakeet TDT (NVIDIA) | 300x realtime on supported hardware |
| AM | Add Groq cloud transcription fallback | Fast cloud option |
| PM | Add DeepL translation integration | Translate transcripts |
| PM | Implement subtitle translation | Multiple language subtitles |

### Day 7 (Tuesday) - Batch + Watch Folder + Menubar

#### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Implement batch transcription queue | Process multiple files |
| AM | Add watch folder support (file watcher) | Auto-transcribe new files |
| PM | Implement real-time transcription (streaming) | Live transcript updates |
| PM | Add more export formats (SRT, VTT, CSV, HTML) | All MacWhisper formats |

#### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build BatchTranscribe view | Select files → queue → progress |
| AM | Build WatchFolder settings UI | Configure watched directories |
| PM | Build Menubar app mode | Compact menu bar interface |
| PM | Build Global spotlight mode | Cmd+Shift+T → quick transcribe |

#### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Add filler word removal (um, uh, like) | Toggle in settings |
| AM | Implement manual speaker assignment UI | Assign names to speakers |
| PM | Add star/favorite segments | Mark important moments |
| PM | Add edit/delete segments | Full transcript editing |

### Day 8 (Wednesday) - AI Differentiation

#### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Implement Local RAG with embeddings | Index all transcripts |
| AM | Add semantic search across transcripts | Find by meaning |
| PM | Implement cross-meeting insights | Pattern detection |
| PM | Add meeting auto-detection (Zoom/Meet processes) | Auto-start recording |

#### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build "Chat with Transcript" UI | `ChatPanel.tsx` |
| AM | Build Cross-Meeting Insights view | Show patterns |
| PM | Add compact mode (hide timestamps) | Toggle in view |
| PM | Add drag-from-Voice-Memos support | macOS integration |

#### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Add multiple AI providers (Claude, Groq, DeepSeek) | Provider selection |
| AM | Add custom GGML model support | Load user models |
| PM | Implement Zapier/n8n webhooks | Automation support |
| PM | Full platform testing | All features on all platforms |

### Day 9-10 (Thu-Fri) - Polish + Beta

#### All Team
| Day | Task |
|-----|------|
| Day 9 AM | Performance optimization |
| Day 9 PM | UI polish pass |
| Day 10 AM | Final testing, create beta builds |
| Day 10 PM | **Distribute beta** |

### End of Week 2 Checklist - MacWhisper Parity
- [ ] System audio capture works
- [ ] Video player with subtitles works
- [ ] YouTube transcription works
- [ ] Batch transcription works
- [ ] Watch folder works
- [ ] Menubar app mode works
- [ ] Global spotlight mode works
- [ ] Filler word removal works
- [ ] All export formats work (PDF, DOCX, SRT, VTT, CSV, HTML, MD)
- [ ] Fast transcription works: WhisperKit (Mac) / Parakeet (NVIDIA)
- [ ] Cloud transcription fallback (Groq) works
- [ ] DeepL translation works
- [ ] Star/favorite segments works
- [ ] Edit/delete segments works
- [ ] Manual speaker assignment works
- [ ] Compact mode works

### End of Week 2 Checklist - Differentiation
- [ ] Local RAG / Chat with transcripts works
- [ ] Cross-meeting insights works
- [ ] Meeting auto-detection works
- [ ] Multiple AI providers work
- [ ] Webhooks work
- [ ] Windows + Linux builds work

### WEEK 2 COMPLETE
**Deliverable:** MacWhisper parity + AI features they don't have

---

## WEEK 3: Polish + Launch

### Day 11-12 (Mon-Tue) - Beta Feedback

#### All Team
| Day | Task |
|-----|------|
| 11 AM | Collect and triage all feedback |
| 11 PM | Fix critical issues from beta |
| 12 AM | Fix high-priority feedback items |
| 12 PM | Implement quick-win suggestions |

### Day 13 (Wednesday) - Final Polish

#### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| All day | Final bug fixes, performance tuning | Rock-solid backend |

#### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Final UI polish based on feedback | Perfect UI |
| PM | Create demo video, screenshots | Marketing assets |

#### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Final platform testing | All builds work |
| PM | Write documentation, help content | Docs complete |

### Day 14 (Thursday) - Launch Prep

#### All Team
| Time | Task |
|------|------|
| AM | Final QA pass - test everything |
| AM | Create release builds (signed) |
| PM | Prepare launch announcement |
| PM | Set up landing page / download page |

### Day 15 (Friday) - LAUNCH

#### All Team
| Time | Task |
|------|------|
| AM | Final checks |
| AM | **Push V1.0 release** |
| PM | Announce on social, communities |
| PM | Monitor for critical issues |
| PM | Celebrate! |

### WEEK 3 COMPLETE
**Deliverable:** V1.0 live - Better than MacWhisper

---

## Success Metrics

### Week 0
- [ ] All broken features fixed
- [ ] Core UX issues resolved

### Week 1
- [ ] Record → Transcribe → View → AI Summary pipeline works
- [ ] All exports work (Markdown, PDF, Obsidian)
- [ ] Search and RAG work
- [ ] All 3 platform builds work

### Week 2 - MacWhisper Parity
- [ ] Every MacWhisper feature matched
- [ ] Video + YouTube works
- [ ] Batch + Watch folder works
- [ ] Menubar + Spotlight mode works
- [ ] All differentiation features work

### Week 3
- [ ] Beta feedback addressed
- [ ] No critical bugs
- [ ] V1.0 launched

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Whisper too slow | Use WhisperKit (Mac) / Parakeet (NVIDIA) or Groq cloud fallback |
| System audio capture fails | Document BlackHole as alternative |
| Platform builds broken | Focus on macOS first, others follow |
| AI quality poor | Iterate prompts, use better models |
| Team blocked | Daily standups catch blockers early |
| MacWhisper parity too ambitious | Prioritize highest-value features |

---

## Daily Schedule

```
9:00 AM   - 10-min standup (blockers only)
9:10 AM   - Deep work with Claude Code
12:00 PM  - Lunch
1:00 PM   - Deep work with Claude Code
4:30 PM   - Quick sync (if needed)
5:00 PM   - Push code, update this doc

Friday 4 PM - Week demo
```

---

## Platform Strategy

### Why Mac First

| Reason | Details |
|--------|---------|
| **Direct competitor** | MacWhisper is Mac-only, we're taking their market |
| **Best hardware for local AI** | Apple Silicon crushes local transcription |
| **Privacy-conscious users** | Therapists, lawyers, researchers skew Mac |
| **Willingness to pay** | Mac users pay for quality software |
| **Smaller, faster validation** | Ship faster, iterate with feedback |

### Platform Rollout Order

```
1. macOS        ████████████████████  Week 1-3 (launch)
2. Windows      ████████████████      Week 4-5
3. iOS          ████████████          Week 6-8
4. Android      ████████              Week 9+
5. Linux        ████                  Free with Tauri
```

### Platform Analysis

| Platform | Market Size | Effort | Revenue Potential | Notes |
|----------|-------------|--------|-------------------|-------|
| **macOS** | 15% desktop | Low (Tauri) | High ($$) | Beachhead market |
| **Windows** | 70% desktop | Low (Tauri) | Medium ($) | Bigger market, more competition |
| **iOS** | 50% mobile | Medium (Swift) | High ($$) | Companion app, on-the-go recording |
| **Android** | 50% mobile | Medium (Kotlin) | Low ($) | Fragmented, less willing to pay |
| **Linux** | 3% desktop | Free (Tauri) | Low | Developer niche, good PR |

### Transcription Engines by Platform

| Platform | Primary Engine | Fallback |
|----------|---------------|----------|
| **macOS** | WhisperKit (CoreML, 300x realtime) | whisper.cpp, Groq cloud |
| **Windows** | Parakeet TDT (NVIDIA) or whisper.cpp | Groq cloud |
| **Linux** | Parakeet TDT (NVIDIA) or whisper.cpp | Groq cloud |
| **iOS** | WhisperKit (CoreML) | Groq cloud |
| **Android** | whisper.cpp | Groq cloud |

### Post-Launch Priorities

**After macOS V1.0:**

1. **Windows (Week 4-5)** - Same Tauri codebase, 70% of desktop market
2. **iOS (Week 6-8)** - Companion app for on-the-go recording
3. **Linux** - Ships free with Windows (Tauri)
4. **Android** - Only if demand warrants

**Feature priorities after platform expansion:**
- More integrations (CRM, calendar, etc.)
- Niche features (legal, medical templates)
- Advanced AI features
- Team/collaboration features

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
| **Transcription** | WhisperKit (CoreML) | Fast local transcription with Metal acceleration |
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
