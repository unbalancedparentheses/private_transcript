# Private Transcript Roadmap

## Priority Features

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Settings UI with model selection | Pending | Let users pick whisper model (tiny/base/small/medium/large-v3-turbo) |
| 2 | Bundle whisper.cpp | Pending | Ship binary with app, remove brew dependency |
| 3 | Translation support | Pending | Translate non-English audio to English via whisper --translate |
| 4 | Markdown support | Pending | Rich formatting in transcripts |
| 5 | Editable transcripts | Pending | Users can fix transcription errors inline |

## Recording

- [ ] **Always-on background mode** (run as menu bar app, always listening)
- [ ] **Auto-detect meeting start** (detect Zoom, Meet, Teams, Slack huddles)
- [ ] **Calendar-triggered recording** (auto-start when calendar event begins)
- [ ] **Voice activity detection** to auto-start recording when conversation detected
- [ ] System audio capture (record meetings, videos, not just microphone)
- [ ] Multiple audio input selection (choose which microphone)
- [ ] Noise reduction / audio enhancement
- [ ] Live transcription (real-time as you speak)
- [ ] Global hotkey to start/stop recording
- [ ] Menu bar quick-record shortcut
- [ ] Audio playback preview before saving
- [ ] Drag and drop audio file import

## Transcription Quality

- [ ] Real-time transcription progress feedback via Tauri events
- [ ] Speaker diarization (whisper --diarize for multi-speaker)
- [ ] Timestamp support in transcripts
- [ ] Batch transcription for multiple files
- [ ] Custom vocabulary (medical, legal, technical terms)
- [ ] Word-level confidence scores (highlight uncertain words)
- [ ] Multi-language support in same transcript
- [ ] Automatic punctuation and paragraph detection
- [ ] Hotword/keyword highlighting

## User Interface

- [ ] Dark/light theme toggle (CSS already supports it)
- [ ] Search and filter sessions by date/status/content
- [ ] Keyboard shortcuts for common actions
- [ ] Session detail view improvements
- [ ] Adjustable font size
- [ ] High contrast mode
- [ ] Screen reader support
- [ ] Keyboard-only navigation

## Session Management

- [ ] Folder editing and deletion
- [ ] Bulk actions (delete multiple, export multiple)
- [ ] Session tagging and categorization
- [ ] Version history for transcript edits
- [ ] Undo/redo for edits
- [ ] Quick actions menu

## Export & Sharing

- [ ] Export transcripts as PDF
- [ ] Export as plain text or Markdown
- [ ] Copy transcript to clipboard
- [ ] Print-friendly view

## AI Features (Ollama Integration)

- [ ] Generate session summaries
- [ ] Extract action items automatically
- [ ] Custom templates per workspace type (therapy, legal, research)
- [ ] Smart search with semantic understanding
- [ ] Sentiment analysis (local)
- [ ] Meeting minutes template generation

## Data & Security

- [ ] Encrypted storage option
- [ ] PIN/password protection for app
- [ ] Auto-lock after inactivity
- [ ] Backup/restore functionality
- [ ] Storage usage dashboard
- [ ] Data retention policies (auto-delete after X days)
- [ ] Secure delete (overwrite files)

## Workflow & Automation

- [ ] File watcher (auto-transcribe new files in a folder)
- [ ] CLI interface for scripting/automation
- [ ] Calendar integration for meeting context

## Platform

- [ ] iOS companion app
- [ ] Windows/Linux builds
- [ ] Menu bar mode (minimal UI)

## Technical

- [ ] Reduce app bundle size
- [ ] Improve startup time
- [ ] Auto-update mechanism
- [ ] Crash reporting (local only, privacy-first)

## Completed

- [x] Basic recording and transcription
- [x] Workspace and folder organization
- [x] whisper.cpp integration via CLI
- [x] Modern UI design
