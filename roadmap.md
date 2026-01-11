# Private Transcript Roadmap

---

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
| Parakeet v2 / WhisperKit (fast) | ✅ | ❌ | 2 days | **NEW** |
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
| Meeting type auto-detection | 🔥 | Low | Pending | AI |
| Podcaster tools | 🔥 | Low | Pending | Niche |
| Voice journaling + mood | 🔥 | Medium | Pending | Niche |
| Translation support | 🔥 | Low | Pending | Transcription |
| Markdown export | 🔥 | Low | Pending | Export |
| Editable transcripts | 🔥 | Low | Pending | UI |
| Auto-detect meetings | 🔥 | Medium | Pending | Recording |
| Advanced exports (PDF, DOCX) | 🔥 | Medium | Pending | Export |
| Custom summary templates | 🔥 | Low | Pending | AI |
| Calendar integration (local) | 🔥 | Medium | Pending | Workflow |
| Copy summary to clipboard | 🔥 | Very Low | Pending | Export |
| Copy as Markdown | 🔥 | Very Low | Pending | Export |
| Word count / talk time stats | 🔥 | Low | Pending | UI |
| Filler word counter | 🔥 | Low | Pending | UI |
| Audio-transcript sync playback | 🔥🔥🔥 | Medium | **BROKEN** | UI |
| Playback speed control | 🔥🔥 | Low | Pending | UI |
| Auto-language detection | 🔥🔥 | Low | Pending | Transcription |
| Transcript correction learning | 🔥🔥 | Medium | Pending | AI |
| Quick notes during recording | 🔥🔥 | Low | Pending | Recording |
| Import from other services | 🔥🔥 | Medium | Pending | Workflow |
| Notification when done | 🔥🔥 | Very Low | Pending | UI |
| Storage cleanup wizard | 🔥 | Low | Pending | Data |
| Privacy/blur mode | 🔥 | Low | Pending | UI |
| Export audio clip from selection | 🔥🔥 | Medium | Pending | Export |
| Pause/resume recording | 🔥🔥 | Low | **MISSING** | Recording |
| Microphone test/level meter | 🔥🔥 | Low | **MISSING** | Recording |
| Search within transcript | 🔥🔥 | Very Low | **MISSING** | UI |
| Bookmarks/highlights | 🔥🔥 | Low | Pending | UI |
| Hotkey customization | 🔥 | Low | Pending | UI |
| Recent files quick access | 🔥 | Very Low | Pending | UI |
| Pin/star sessions | 🔥 | Very Low | Pending | Session |
| Onboarding wizard | 🔥 | Medium | Pending | UI |
| Recording quality selector | 🔥 | Low | Pending | Recording |
| Rename speakers | 🔥🔥🔥 | Low | Pending | Transcription |
| External mic support (USB/Bluetooth) | 🔥🔥 | Low | Pending | Recording |
| Automatic gain control | 🔥🔥 | Medium | Pending | Recording |
| Echo cancellation | 🔥🔥 | Medium | Pending | Recording |
| Handle very long recordings | 🔥🔥 | Medium | Pending | Recording |
| Merge/split speaker segments | 🔥🔥 | Medium | Pending | Transcription |
| Grammar/punctuation cleanup | 🔥🔥 | Low | Pending | AI |
| Notion export | 🔥🔥 | Low | Pending | Export |
| Email transcript | 🔥🔥 | Low | Pending | Export |
| Attach to calendar event | 🔥🔥 | Medium | Pending | Workflow |
| Battery optimization | 🔥🔥 | Medium | Pending | Technical |
| Home screen widget (mobile) | 🔥🔥 | Medium | Pending | Platform |
| Siri Shortcuts | 🔥🔥 | Low | Pending | Platform |
| Background recording (mobile) | 🔥🔥 | Medium | Pending | Platform |
| Low disk space warning | 🔥 | Very Low | Pending | UI |
| Timestamp format options | 🔥 | Low | Pending | UI |
| Paragraph/formatting controls | 🔥 | Low | Pending | UI |
| Tone analysis | 🔥 | Medium | Pending | AI |
| Meeting effectiveness score | 🔥 | Medium | Pending | AI |
| Offline mode indicator | 🔥 | Very Low | Pending | UI |
| Duplicate detection | 🔥 | Low | Pending | Session |
| Transcript diff/compare | 🔥 | Medium | Pending | UI |
| Apple Notes sync | 🔥 | Low | Pending | Export |
| Video player + subtitles | 🔥🔥🔥 | Medium | **NEW** | UI |
| YouTube transcription | 🔥🔥🔥 | Low | **NEW** | Recording |
| Batch transcription | 🔥🔥 | Low | **NEW** | Workflow |
| Watch folder auto-transcribe | 🔥🔥 | Low | **NEW** | Workflow |
| Menubar app mode | 🔥🔥 | Low | **NEW** | UI |
| Global spotlight mode | 🔥🔥 | Low | **NEW** | UI |
| Filler word removal | 🔥🔥 | Very Low | **NEW** | Transcription |
| Star/favorite segments | 🔥🔥 | Very Low | **NEW** | UI |
| Edit/delete segments | 🔥🔥 | Low | **NEW** | UI |
| Compact mode (hide timestamps) | 🔥 | Very Low | **NEW** | UI |
| Drag from Voice Memos | 🔥 | Very Low | **NEW** | Recording |
| Parakeet v2 / WhisperKit | 🔥🔥🔥 | Medium | **NEW** | Transcription |
| Cloud transcription (Groq) | 🔥🔥 | Low | **NEW** | Transcription |
| DeepL translation | 🔥🔥 | Low | **NEW** | Transcription |
| Custom GGML models | 🔥 | Low | **NEW** | Transcription |
| Translate subtitles | 🔥🔥 | Low | **NEW** | Export |
| Manual speaker assignment | 🔥🔥 | Low | **NEW** | Transcription |
| SRT/VTT subtitle export | 🔥🔥 | Low | **NEW** | Export |
| CSV export | 🔥 | Very Low | **NEW** | Export |
| HTML export | 🔥 | Very Low | **NEW** | Export |
| Transcription progress tracking | 🔥🔥🔥 | Very Low | **BROKEN** | UI |
| Real PDF/DOCX export | 🔥🔥 | Low | **BROKEN** | Export |
| Toast notifications (replace alerts) | 🔥🔥 | Very Low | Pending | UI |
| Ollama status indicator | 🔥🔥 | Very Low | Pending | UI |
| Database encryption (SQLCipher) | 🔥🔥 | Medium | Pending | Data |
| Streaming LLM output | 🔥🔥 | Medium | Pending | AI |
| Test coverage | 🔥🔥 | Medium | Pending | Technical |
| Split Zustand stores | 🔥 | Low | Pending | Technical |
| Database migrations | 🔥🔥 | Low | Pending | Technical |

---

## Priority Features

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | **System audio capture** | Pending | Record Zoom/Meet/Teams via system audio (critical for meetings) |
| 2 | **Real-time transcription** | Pending | Live transcription as meeting happens, not just post-recording |
| 3 | **AI summaries with Ollama** | Pending | Wire up Ollama for summaries, action items, key decisions |
| 4 | **Windows/Linux builds** | Pending | Cross-platform support (Tauri already supports this) |
| 5 | Settings UI with model selection | Pending | Let users pick whisper model (tiny/base/small/medium/large-v3-turbo) |
| 6 | Bundle whisper.cpp | Pending | Ship binary with app, remove brew dependency |
| 7 | Translation support | Pending | Translate non-English audio to English via whisper --translate |
| 8 | Markdown export | Pending | Export transcripts and summaries as Markdown files |
| 9 | Editable transcripts | Pending | Users can fix transcription errors inline |
| 10 | Multiple LLM options | Pending | Support Ollama, local models (llama.cpp, MLX), and OpenRouter |
| 11 | **Auto-detect meetings** | Pending | Automatically start recording when Zoom/Meet/Teams opens |
| 12 | **Advanced exports** | Pending | Export as PDF, DOCX, not just Markdown/TXT |
| 13 | **Custom AI model connector** | Pending | Connect OpenRouter or any OpenAI-compatible endpoint |
| 14 | **Larger/more accurate models** | Pending | Support large-v3-turbo, distil-whisper for better accuracy |
| 15 | **Speaker identification** | Pending | Identify and label different speakers in transcript |
| 16 | **Custom summary templates** | Pending | User-defined templates for different meeting types |
| 17 | **Chat with your meetings** | Pending | Ask questions about past transcripts via local LLM |
| 18 | **Calendar integration** | Pending | Sync with calendar, auto-name meetings, schedule recordings |

## Recording

- [ ] **Pause/resume recording** (not just start/stop - pause mid-recording)
- [ ] **Microphone test/level meter** (visual feedback before and during recording)
- [ ] **Recording quality selector** (choose sample rate / bitrate)
- [ ] **Always-on background mode** (run as menu bar app, always listening)
- [ ] **Rewind mode** (continuously record last X hours, retroactively save important moments)
- [ ] **Auto-detect meeting start** (detect Zoom, Meet, Teams, Slack huddles)
- [ ] **Calendar-triggered recording** (auto-start when calendar event begins)
- [ ] **Voice activity detection** to auto-start recording when conversation detected
- [ ] **Wake word bookmarking** ("Hey Transcript, bookmark this" - hands-free during recording)
- [ ] **Quick notes during recording** (add text annotations with auto-timestamps)
- [ ] System audio capture (record meetings, videos, not just microphone)
- [ ] Multiple audio input selection (choose which microphone)
- [ ] **External mic support** (USB, Bluetooth microphones)
- [ ] **Automatic gain control** (normalize volume levels)
- [ ] **Echo cancellation** (for speaker playback scenarios)
- [ ] **Handle very long recordings** (3+ hours with chunking/progress)
- [ ] **Low disk space warning** (prevent failed recordings)
- [ ] Noise reduction / audio enhancement (RNNoise, DeepFilterNet)
- [ ] Live transcription (real-time as you speak)
- [ ] Global hotkey to start/stop recording
- [ ] Menu bar quick-record shortcut
- [ ] Audio playback preview before saving
- [ ] Drag and drop audio file import
- [ ] Waveform visualization during recording
- [ ] Voice journaling mode with mood tracking

## Transcription Quality

- [ ] **Rename speakers** (change "Speaker 1" to "John" - essential for diarization)
- [ ] **Merge/split speaker segments** (fix diarization errors)
- [ ] **Auto-language detection** (detect language automatically, no manual selection)
- [ ] Real-time transcription progress feedback via Tauri events
- [ ] Speaker diarization (pyannote-audio or whisper-diarize)
- [ ] Timestamp support in transcripts
- [ ] **Timestamp format options** (HH:MM:SS vs MM:SS vs seconds)
- [ ] **Paragraph/formatting controls** (control line breaks, spacing)
- [ ] Batch transcription for multiple files
- [ ] Custom vocabulary (medical, legal, technical terms)
- [ ] Word-level confidence scores (highlight uncertain words)
- [ ] Multi-language support in same transcript
- [ ] Automatic punctuation and paragraph detection
- [ ] Hotword/keyword highlighting
- [ ] Filler word detection and removal ("um", "uh", "like")
- [ ] Export as SRT/VTT subtitles

## Audio Editing (Descript-style)

- [ ] Edit audio by editing text (delete words → deletes audio)
- [ ] Filler word auto-removal from audio
- [ ] "Studio Sound" - enhance audio quality post-recording (DeepFilterNet)
- [ ] Overdub - AI voice to fix mispronunciations (Coqui TTS, Piper)
- [ ] Trim/crop audio with waveform UI
- [ ] Create shareable audio/video clips with timestamps

## User Interface

- [ ] **Audio-transcript sync playback** (click text → jump to audio position)
- [ ] **Playback speed control** (0.5x, 1x, 1.5x, 2x playback)
- [ ] **Search within transcript** (Ctrl+F style find in current session)
- [ ] **Bookmarks/highlights** (mark important moments during review)
- [ ] **Notification when transcription done** (system notification)
- [ ] **Privacy/blur mode** (hide transcript while reviewing in public)
- [ ] **Onboarding wizard** (guide new users through setup)
- [ ] **Recent files quick access** (quick list of recent sessions)
- [ ] **Hotkey customization** (let users set their own shortcuts)
- [ ] Dark/light theme toggle (CSS already supports it)
- [ ] Search and filter sessions by date/status/content
- [ ] Keyboard shortcuts for common actions
- [ ] Session detail view improvements
- [ ] Adjustable font size
- [ ] High contrast mode
- [ ] Screen reader support
- [ ] Keyboard-only navigation
- [ ] Highlight key moments with one tap
- [ ] Reaction emojis on timeline
- [ ] Slash commands for formatting
- [ ] **Offline mode indicator** (show when features need network)
- [ ] **Transcript diff/compare** (compare two versions side-by-side)

## Accessibility

- [ ] **Real-time caption overlay** (system-wide live captions for deaf/HoH users)
- [ ] High contrast mode for transcripts
- [ ] Text-to-speech for reading transcripts aloud

## Session Management

- [ ] **Pin/star sessions** (keep important sessions at top)
- [ ] Folder editing and deletion
- [ ] Bulk actions (delete multiple, export multiple)
- [ ] Session tagging and categorization
- [ ] Version history for transcript edits
- [ ] Undo/redo for edits
- [ ] Quick actions menu
- [ ] Auto-generate meeting title from content (local LLM)
- [ ] **Word count / talk time stats** (display duration, word count per session)
- [ ] **Filler word counter** (count "um", "uh", "like" - useful self-feedback)
- [ ] **Duplicate detection** (warn if importing same audio twice)

## Export & Sharing

- [ ] **Obsidian/Logseq sync** (auto-export transcripts and summaries to vault)
- [ ] **Notion export** (export to Notion pages)
- [ ] **Apple Notes sync** (native macOS integration)
- [ ] **Email transcript** (send to self or others)
- [ ] Export transcripts as PDF
- [ ] Export as plain text or Markdown
- [ ] Copy transcript to clipboard
- [ ] **Copy summary to clipboard** (one-click share)
- [ ] **Copy as Markdown** (formatted for pasting into notes apps)
- [ ] **Export audio clip from selection** (select text range → export that audio segment)
- [ ] Print-friendly view
- [ ] Quote extraction with timestamps
- [ ] Highlight reels of key moments

## AI Features (Ollama / Local Models / OpenRouter)

- [ ] **Local RAG / Semantic search** (chat with all your meetings using local embeddings)
- [ ] **Cross-meeting insights** (find patterns: "You discussed X with John 4 times this month")
- [ ] **Meeting type auto-detection** (standup, 1:1, interview → auto-apply templates)
- [ ] **Auto-generate follow-up email drafts** (LLM drafts post-meeting emails)
- [ ] **Transcript correction learning** (learn from user fixes to improve future transcriptions)
- [ ] **Grammar/punctuation cleanup** (polish raw transcripts with AI)
- [ ] **Tone analysis** (formal vs casual, sentiment detection)
- [ ] **Meeting effectiveness score** (gamify better meetings)
- [ ] Generate session summaries
- [ ] Extract action items automatically
- [ ] Custom templates per workspace type
- [ ] Smart search with semantic understanding
- [ ] Sentiment analysis (local models)
- [ ] Meeting minutes template generation
- [ ] Question detection (auto-flag questions asked)
- [ ] Topic/keyword extraction (KeyBERT)
- [ ] Commitment tracking ("I will...", "We agree to...")
- [ ] Talk-time analytics (who spoke how much)

## Data & Security

- [ ] **Storage cleanup wizard** (delete old audio but keep transcripts to save space)
- [ ] Encrypted storage option (AES-256)
- [ ] PIN/password protection for app
- [ ] Auto-lock after inactivity
- [ ] Backup/restore functionality
- [ ] Storage usage dashboard
- [ ] Data retention policies (auto-delete after X days)
- [ ] Secure delete with overwrite
- [ ] Audit log (who accessed what, when)

## Workflow & Automation

- [ ] **Import from other services** (import transcripts from Otter, Rev, Descript)
- [ ] **Attach transcript to calendar event** (link back to the meeting)
- [ ] File watcher (auto-transcribe new files in a folder)
- [ ] CLI interface for scripting/automation
- [ ] Calendar integration for meeting context
- [ ] Drag file onto menu bar icon to transcribe
- [ ] Cross-device sync (local network or Syncthing)

## Platform

- [ ] iOS companion app
- [ ] Android companion app
- [ ] Windows/Linux builds
- [ ] Menu bar mode (minimal UI)
- [ ] Mobile-to-desktop local sync (WiFi/Bluetooth)
- [ ] Apple Watch quick-record
- [ ] **Home screen widget** (quick-record without opening app)
- [ ] **Siri Shortcuts** ("Hey Siri, start transcribing")
- [ ] **Background recording** (keep recording when app minimized on mobile)

## Video Support

- [ ] Screen recording with audio
- [ ] Camera + screen picture-in-picture
- [ ] Video transcription (extract audio track)
- [ ] Slide/presentation change detection
- [ ] Video clip export with burned-in captions
- [ ] Meeting recording with participant video grid

## Team & Collaboration

- [ ] Shared workspaces (local network sync)
- [ ] User roles and permissions
- [ ] Comments and annotations on transcripts
- [ ] @mentions and notifications (local)
- [ ] Transcript version control (who changed what)
- [ ] Conflict resolution for simultaneous edits
- [ ] Team activity dashboard
- [ ] Admin controls for workspace settings

## Developer & Integrations

- [ ] REST API for local automation
- [ ] CLI tool for scripting (transcribe, export, query)
- [ ] Webhook support (trigger actions on events)
- [ ] Zoom plugin (native integration)
- [ ] Google Meet extension
- [ ] Microsoft Teams add-in
- [ ] Slack bot for notifications
- [ ] Zapier/n8n connector
- [ ] Apple Shortcuts support
- [ ] Raycast extension
- [ ] Alfred workflow
- [ ] Plugin/extension system for community add-ons
- [ ] Python SDK for custom integrations
- [ ] JavaScript SDK for web integrations

## Technical

### Code Quality (Fix These!)
- [ ] **Add test coverage** (currently zero tests)
- [ ] **Split Zustand store** (single store with mixed concerns → domain stores)
- [ ] **Add database migrations** (schema runs every startup → proper versioning)
- [ ] **Streaming LLM output** (currently waits for full response)
- [ ] **Database encryption** (SQLCipher mentioned but not implemented)

### Performance & Infrastructure
- [ ] **Battery optimization** (efficient for long recordings)
- [ ] Reduce app bundle size
- [ ] Improve startup time
- [ ] Auto-update mechanism
- [ ] Crash reporting (local only, privacy-first)

---

# Niche-Specific Features

## Podcasters / Content Creators

- [ ] **Show notes generation** (auto-generate episode summaries)
- [ ] **Chapter markers** (auto-detect topic changes, generate timestamps)
- [ ] Episode planning assistant
- [ ] Guest research integration (pull context before recording)
- [ ] Sponsorship read detection and timestamps
- [ ] Pull-quote extraction for social media
- [ ] Audiogram generator (waveform + captions for social clips)

## Psychologists / Therapists

### Session Documentation
- [ ] SOAP notes auto-generation (Subjective, Objective, Assessment, Plan)
- [ ] DAP notes template (Data, Assessment, Plan)
- [ ] BIRP notes template (Behavior, Intervention, Response, Plan)
- [ ] Progress note templates per therapy type (CBT, DBT, EMDR, psychodynamic)
- [ ] Treatment plan tracking across sessions
- [ ] Session summary with therapeutic interventions used

### Clinical Features
- [ ] Mood/sentiment tracking over time (visualize patient progress)
- [ ] Risk phrase detection (flag mentions of self-harm, crisis keywords)
- [ ] Intervention tracking (what techniques were used)
- [ ] Session duration logging for billing
- [ ] Goal progress tracking across sessions
- [ ] Symptom mention tracking
- [ ] Medication mention logging

### Compliance (HIPAA)
- [ ] HIPAA-compliant encrypted storage
- [ ] Automatic PHI detection and warnings
- [ ] Audit log (who accessed what, when)
- [ ] Secure delete with military-grade overwrite
- [ ] Session retention policies (7 years default)
- [ ] BAA-ready documentation
- [ ] No cloud, no network - truly air-gapped option

### Organization
- [ ] Patient/client folders with intake info
- [ ] Link sessions to treatment plans
- [ ] Recurring appointment awareness
- [ ] Insurance/billing code suggestions (CPT codes)
- [ ] Superbill generation

---

## Attorneys / Legal Professionals

### Deposition & Court
- [ ] Speaker roles (Attorney, Witness, Judge, Opposing Counsel)
- [ ] Objection timestamps and tracking
- [ ] Exhibit reference detection ("Exhibit A", "Document 3")
- [ ] Legal citation formatting
- [ ] Q&A format output (traditional deposition style)
- [ ] Page:Line numbering for court transcripts
- [ ] Certification page generation

### Case Management
- [ ] Client/Matter folder structure
- [ ] Billable time tracking from recording duration
- [ ] Conflict-of-interest name detection
- [ ] Deadline/statute of limitations mentions flagged
- [ ] Key dates extraction

### Document Features
- [ ] Redaction tools (blur/black-out names, amounts, SSNs)
- [ ] Confidentiality banners on exports ("ATTORNEY-CLIENT PRIVILEGED")
- [ ] Chain of custody logging
- [ ] Court-ready transcript format
- [ ] Bates numbering for exports
- [ ] E-discovery compatible exports

### Legal Intelligence
- [ ] Key terms extraction (names, dates, amounts, agreements)
- [ ] Contradiction detection across transcripts
- [ ] Commitment tracking ("I will...", "We agree to...")
- [ ] Legal terminology dictionary
- [ ] Contract clause detection
- [ ] Witness statement comparison

---

## Medical / Healthcare

### Documentation
- [ ] Medical terminology dictionary (auto-learned)
- [ ] ICD-10 code suggestions from transcript
- [ ] CPT code suggestions for billing
- [ ] Patient encounter format (HPI, ROS, PE, Assessment, Plan)
- [ ] Prescription/medication mentions flagged
- [ ] Allergy mention detection
- [ ] Vital signs extraction

### Compliance
- [ ] HIPAA-compliant storage
- [ ] PHI auto-detection
- [ ] Audit trails
- [ ] Minimum necessary access controls

### Workflow
- [ ] EHR-ready export formats
- [ ] Dictation mode optimized for clinical notes
- [ ] Template library (intake, follow-up, procedure notes)

---

## Researchers / Academics

### Qualitative Research
- [ ] Coding/tagging system for qualitative analysis
- [ ] Participant anonymization (auto-replace names with P1, P2, P3)
- [ ] Export to NVivo format
- [ ] Export to Atlas.ti format
- [ ] Export to MAXQDA format
- [ ] Theme extraction and tracking
- [ ] Inter-rater reliability tools

### Compliance
- [ ] IRB compliance features
- [ ] Consent tracking per participant
- [ ] Data destruction scheduling
- [ ] De-identification verification

### Academic Workflow
- [ ] Citation generation (APA, MLA, Chicago)
- [ ] Interview guide integration
- [ ] Multi-language support for international research
- [ ] Timestamp-based quote extraction for papers
- [ ] Research memo generation

---

## Journalists / Media

### Source Management
- [ ] Source anonymization (voice disguise export)
- [ ] Off-the-record segment marking
- [ ] Source protection - no cloud, encrypted storage
- [ ] Confidential source tagging

### Content Creation
- [ ] Quote extraction with timestamps
- [ ] Fact-check flagging (claims that need verification)
- [ ] Attribution tracking
- [ ] Story angle suggestions (local LLM)
- [ ] Pull-quote generation
- [ ] Sound bite extraction

### Workflow
- [ ] Multi-interview linking (same story)
- [ ] Timeline generation from multiple sources
- [ ] Broadcast script formatting

---

## Sales / Business

### Call Intelligence
- [ ] Talk ratio analytics (who spoke more)
- [ ] Competitor mention alerts
- [ ] Pricing discussion detection
- [ ] Objection tracking and categorization
- [ ] Next steps extraction
- [ ] Decision maker identification

### CRM Integration
- [ ] CRM-ready export formats (CSV, JSON)
- [ ] Contact mention extraction
- [ ] Deal stage detection
- [ ] Follow-up action items

### Analytics
- [ ] Call scoring based on best practices
- [ ] Keyword tracking across calls
- [ ] Win/loss pattern analysis
- [ ] Rep coaching insights

---

## Educators / Academic

### Lecture Capture
- [ ] Lecture transcription with chapter markers
- [ ] Student question detection and timestamps
- [ ] Concept explanation bookmarking
- [ ] Slide change detection (with screen capture)

### Accessibility
- [ ] ADA/508 compliant transcripts
- [ ] Closed caption generation
- [ ] Multiple language support for ESL students
- [ ] Reading level analysis

### Content Creation
- [ ] Quiz/test question generation from content
- [ ] Study guide generation
- [ ] Key terms glossary extraction
- [ ] Lecture summary for students

---

## Completed

- [x] Basic recording and transcription
- [x] Workspace and folder organization
- [x] whisper.cpp integration via CLI
- [x] Modern UI design
