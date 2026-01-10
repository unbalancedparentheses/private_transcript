# Private Transcript Roadmap

## Priority Features

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Settings UI with model selection | Pending | Let users pick whisper model (tiny/base/small/medium/large-v3-turbo) |
| 2 | Bundle whisper.cpp | Pending | Ship binary with app, remove brew dependency |
| 3 | Translation support | Pending | Translate non-English audio to English via whisper --translate |
| 4 | Markdown support | Pending | Rich formatting in transcripts |
| 5 | Editable transcripts | Pending | Users can fix transcription errors inline |

## Additional Improvements

### Transcription
- [ ] Real-time transcription progress feedback via Tauri events
- [ ] Speaker diarization (whisper --diarize for multi-speaker)
- [ ] Timestamp support in transcripts
- [ ] Batch transcription for multiple files

### User Interface
- [ ] Audio playback preview before saving
- [ ] Dark/light theme toggle (CSS already supports it)
- [ ] Search and filter sessions by date/status/content
- [ ] Keyboard shortcuts for common actions
- [ ] Drag and drop audio file import

### Session Management
- [ ] Session detail view improvements
- [ ] Folder editing and deletion
- [ ] Bulk actions (delete multiple, export multiple)
- [ ] Session tagging and categorization

### Export & Sharing
- [ ] Export transcripts as PDF
- [ ] Export as plain text or Markdown
- [ ] Copy transcript to clipboard
- [ ] Print-friendly view

### AI Features (Ollama Integration)
- [ ] Generate session summaries
- [ ] Extract action items automatically
- [ ] Custom templates per workspace type (therapy, legal, research)
- [ ] Smart search with semantic understanding

### Technical
- [ ] Reduce app bundle size
- [ ] Improve startup time
- [ ] Auto-update mechanism
- [ ] Crash reporting (local only, privacy-first)

## Completed
- [x] Basic recording and transcription
- [x] Workspace and folder organization
- [x] whisper.cpp integration via CLI
- [x] Modern UI design
