# Private Transcript Roadmap

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
| Speaker identification | 🔥🔥 | High | Pending | Transcription |
| Chat with your meetings | 🔥🔥 | Medium | Pending | AI |
| Wake word bookmarking | 🔥🔥 | Low | Pending | Recording |
| Auto-generate email draft | 🔥🔥 | Low | Pending | AI |
| Windows/Linux builds | 🔥🔥 | Medium | Pending | Platform |
| Settings UI with model selection | 🔥🔥 | Low | Pending | UI |
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
| Audio-transcript sync playback | 🔥🔥🔥 | Medium | Pending | UI |
| Playback speed control | 🔥🔥 | Low | Pending | UI |
| Auto-language detection | 🔥🔥 | Low | Pending | Transcription |
| Transcript correction learning | 🔥🔥 | Medium | Pending | AI |
| Quick notes during recording | 🔥🔥 | Low | Pending | Recording |
| Import from other services | 🔥🔥 | Medium | Pending | Workflow |
| Notification when done | 🔥🔥 | Very Low | Pending | UI |
| Storage cleanup wizard | 🔥 | Low | Pending | Data |
| Privacy/blur mode | 🔥 | Low | Pending | UI |
| Export audio clip from selection | 🔥🔥 | Medium | Pending | Export |
| Pause/resume recording | 🔥🔥 | Low | Pending | Recording |
| Microphone test/level meter | 🔥🔥 | Low | Pending | Recording |
| Search within transcript | 🔥🔥 | Very Low | Pending | UI |
| Bookmarks/highlights | 🔥🔥 | Low | Pending | UI |
| Hotkey customization | 🔥 | Low | Pending | UI |
| Recent files quick access | 🔥 | Very Low | Pending | UI |
| Pin/star sessions | 🔥 | Very Low | Pending | Session |
| Onboarding wizard | 🔥 | Medium | Pending | UI |
| Recording quality selector | 🔥 | Low | Pending | Recording |

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
- [ ] Noise reduction / audio enhancement (RNNoise, DeepFilterNet)
- [ ] Live transcription (real-time as you speak)
- [ ] Global hotkey to start/stop recording
- [ ] Menu bar quick-record shortcut
- [ ] Audio playback preview before saving
- [ ] Drag and drop audio file import
- [ ] Waveform visualization during recording
- [ ] Voice journaling mode with mood tracking

## Transcription Quality

- [ ] **Auto-language detection** (detect language automatically, no manual selection)
- [ ] Real-time transcription progress feedback via Tauri events
- [ ] Speaker diarization (pyannote-audio or whisper-diarize)
- [ ] Timestamp support in transcripts
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

## Export & Sharing

- [ ] **Obsidian/Logseq sync** (auto-export transcripts and summaries to vault)
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
