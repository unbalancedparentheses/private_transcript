# Private Transcript: 3-Week Sprint Plan

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

# WEEK 0: Fix What's Broken (2-3 days)

⚠️ **DO NOT SKIP THIS.** Fix existing issues before adding new features.

## Day 0.1 (First Day)

### P1 - Backend Fixes
| Time | Task | Issue |
|------|------|-------|
| AM | Fix transcription progress events | Shows 0%, stubbed out |
| AM | Implement pause/resume in audio module | Only start/stop exists |
| PM | Add real PDF export (use printpdf crate) | Currently fake text file |
| PM | Add real DOCX export (use docx crate) | Currently fake text file |

### P2 - Frontend Fixes
| Time | Task | Issue |
|------|------|-------|
| AM | Add audio player to session view | Can't listen while reviewing |
| AM | Wire up transcription progress bar | Shows 0% |
| PM | Replace browser alerts with toast notifications | Bad UX |
| PM | Add microphone level meter component | No visual feedback |

### P3 - AI/Platform Fixes
| Time | Task | Issue |
|------|------|-------|
| AM | Add Ollama connection status indicator | Backend checks but UI doesn't show |
| AM | Display speaker labels in transcript UI | Data exists but not shown |
| PM | Build settings page for model selection | Only available in onboarding |
| PM | Test and fix all existing features | Verify nothing else is broken |

## Day 0.2 (Second Day)

### P1 - Backend
| Time | Task | Issue |
|------|------|-------|
| AM | Implement audio-transcript sync backend | Need get_segment_at_time |
| PM | Add seek-to-timestamp command | Click text → jump audio |

### P2 - Frontend
| Time | Task | Issue |
|------|------|-------|
| AM | Add search within transcript (Ctrl+F) | No way to find text |
| AM | Implement click-on-transcript → seek | Missing feature |
| PM | Polish all fixed features | Make sure UX is good |

### P3 - AI/Platform
| Time | Task | Issue |
|------|------|-------|
| AM | Test all AI features work correctly | Verify Ollama integration |
| PM | Test all exports work correctly | Verify PDF/DOCX/MD |

## Day 0.3 (Third Day - Buffer)

### All Team
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

# WEEK 1: Build Complete Product

## Day 1 (Monday) - Foundation

### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Set up Tauri + Rust project structure | `src-tauri/` with clean module structure |
| AM | Define data models: Session, Transcript, Segment, Speaker | `models.rs` with all structs |
| PM | Implement SQLite database layer | `database.rs` - create, read, update, delete sessions |
| PM | Build audio recording module (microphone) | `audio.rs` - start, stop, save WAV |

**Done when:** Can record audio and save session to database via CLI test

### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Set up React + Vite + TypeScript + Tailwind | Clean project structure |
| AM | Install shadcn/ui, configure theme | Base components ready |
| PM | Build app shell: sidebar, header, main content area | `AppShell.tsx` |
| PM | Build SessionList component | `SessionList.tsx` - displays sessions |
| PM | Build SessionDetail component (skeleton) | `SessionDetail.tsx` - placeholder |

**Done when:** App shell renders with sidebar navigation

### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Set up whisper.cpp, test transcription CLI | Working transcription command |
| AM | Set up Ollama, pull models (llama3, nomic-embed) | Ollama running locally |
| PM | Create transcription service wrapper | `transcription.rs` - call whisper, parse output |
| PM | Set up GitHub Actions CI/CD | Build on push, test on PR |
| PM | Create development build scripts | `npm run dev`, `npm run build` work |

**Done when:** Can transcribe audio file via CLI, Ollama responds to prompts

### End of Day 1 Checkpoint
- [ ] Audio records and saves to SQLite
- [ ] UI shell renders
- [ ] Whisper transcribes a test file
- [ ] Ollama generates summaries

---

## Day 2 (Tuesday) - Core Pipeline

### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Implement Tauri commands: `start_recording`, `stop_recording` | Commands callable from frontend |
| AM | Implement Tauri commands: `get_sessions`, `get_session`, `delete_session` | Full CRUD |
| PM | Add transcription job queue (background processing) | Jobs run without blocking UI |
| PM | Implement Tauri events: `transcription_progress`, `transcription_complete` | Frontend receives updates |

**Done when:** Frontend can trigger recording, see sessions, receive transcription events

### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build RecordingView: start/stop button, timer | `RecordingView.tsx` |
| AM | Add waveform visualization (use wavesurfer.js or similar) | Visual feedback while recording |
| PM | Connect SessionList to Tauri backend | Real sessions from database |
| PM | Build TranscriptView: display segments with timestamps | `TranscriptView.tsx` |
| PM | Add loading states, empty states | Good UX for all states |

**Done when:** Can record from UI, see session appear in list, view transcript

### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Parse whisper output to segments with timestamps | Structured transcript data |
| AM | Store segments in database with word-level timing | Segments table populated |
| PM | Implement summary generation with Ollama | `generate_summary` function |
| PM | Implement action items extraction | `extract_action_items` function |
| PM | Implement key decisions extraction | `extract_decisions` function |

**Done when:** Transcription creates segments, AI extracts summary/actions/decisions

### End of Day 2 Checkpoint
- [ ] Full record → transcribe → view pipeline works
- [ ] AI generates summaries for transcripts
- [ ] UI shows real data from backend

---

## Day 3 (Wednesday) - Playback + AI Features

### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build audio playback engine | `playback.rs` - play, pause, seek, get position |
| AM | Implement audio-transcript sync | Given timestamp → return segment |
| PM | Add playback speed control (0.5x, 1x, 1.5x, 2x) | Speed adjustment works |
| PM | Implement `get_segment_at_time` command | Click-to-seek support |

**Done when:** Audio plays with speed control, can sync to transcript position

### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build AudioPlayer component | `AudioPlayer.tsx` - play/pause/seek/speed |
| AM | Add playback progress bar with time display | Shows current position |
| PM | Implement click-on-transcript → seek to time | Transcript is clickable |
| PM | Highlight current segment during playback | Visual sync feedback |
| PM | Add keyboard shortcuts: Space (play/pause), arrows (skip) | `useKeyboardShortcuts` hook |

**Done when:** Full playback experience with sync and keyboard control

### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Integrate whisperX for speaker diarization | Speakers identified in transcript |
| AM | Parse diarization output, store speaker IDs | `speaker_id` field on segments |
| PM | Create meeting type detection prompt | Detects: standup, 1:1, interview, etc. |
| PM | Create custom summary templates per meeting type | Different prompts per type |
| PM | Test all AI prompts, refine for quality | Prompts produce good output |

**Done when:** Transcripts have speaker labels, meeting type detected, good summaries

### End of Day 3 Checkpoint
- [ ] Audio plays with transcript sync
- [ ] Keyboard shortcuts work
- [ ] Speaker diarization working
- [ ] Meeting type detection working

---

## Day 4 (Thursday) - Search + RAG

### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Set up SQLite-vec for vector storage | Vector extension installed |
| AM | Create embeddings table and functions | Store/query embeddings |
| PM | Implement `index_transcript` - generate embeddings on save | Auto-index new transcripts |
| PM | Implement `semantic_search` - query across all transcripts | Search returns relevant segments |
| PM | Implement `search_in_session` - search within one transcript | Ctrl+F functionality |

**Done when:** Can search semantically across all transcripts

### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build SummaryPanel: summary, actions, decisions | `SummaryPanel.tsx` |
| AM | Add "Regenerate" button for AI content | Can re-run AI analysis |
| PM | Build SearchView: global search with results | `SearchView.tsx` |
| PM | Build inline search (Ctrl+F) for single transcript | `TranscriptSearch.tsx` |
| PM | Display speaker names, add rename UI | Edit "Speaker 1" → "John" |

**Done when:** Full AI panel, search works globally and locally

### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Set up nomic-embed via Ollama for embeddings | Embedding generation works |
| AM | Create RAG pipeline: query → chunks → context → answer | Full RAG flow |
| PM | Build "Chat with transcript" backend | Streaming responses |
| PM | Implement cross-meeting insights | "You discussed X with Y 3 times" |
| PM | Test RAG quality, tune chunk size and prompts | Good answers |

**Done when:** Can chat with transcripts, get cross-meeting insights

### End of Day 4 Checkpoint
- [ ] Semantic search works
- [ ] Chat with transcript works
- [ ] Speaker rename works
- [ ] Cross-meeting insights work

---

## Day 5 (Friday) - Export + Settings

### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Implement Markdown export | `export_markdown` function |
| AM | Implement PDF export (HTML → PDF) | `export_pdf` function |
| AM | Implement plain text export | `export_txt` function |
| PM | Implement copy to clipboard (all formats) | `copy_to_clipboard` command |
| PM | Add session tagging system | Tags stored, filterable |

**Done when:** All export formats work

### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build ExportModal: format selection, options | `ExportModal.tsx` |
| AM | Add copy buttons (transcript, summary, markdown) | One-click copy |
| PM | Build SettingsView: model selection, paths, preferences | `SettingsView.tsx` |
| PM | Add tag management UI | Create, assign, filter by tags |
| PM | Build OnboardingWizard for first-run | `OnboardingWizard.tsx` |

**Done when:** Full settings, export modal, onboarding complete

### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Implement Obsidian sync (file watcher + export) | Auto-exports to vault |
| AM | Implement Notion export (API integration) | Export to Notion pages |
| PM | Create macOS build (.dmg) | Installable Mac app |
| PM | Create Windows build (.msi/.exe) | Installable Windows app |
| PM | Create Linux build (.AppImage, .deb) | Installable Linux app |

**Done when:** All integrations work, all platform builds ready

### End of Day 5 Checkpoint
- [ ] All exports work
- [ ] Obsidian sync works
- [ ] All 3 platform builds work
- [ ] Settings fully functional

### WEEK 1 COMPLETE
**Deliverable:** Core product with AI features on all platforms

---

# WEEK 2: MacWhisper Parity + Differentiation

**Goal: Match every MacWhisper feature, then beat them with AI.**

## Day 6 (Monday) - Video + YouTube + System Audio

### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Implement macOS system audio capture (ScreenCaptureKit) | Record Zoom/Meet/Teams |
| PM | Add YouTube download + transcription (yt-dlp) | `transcribe_youtube(url)` |
| PM | Implement video file support (extract audio track) | Handle mp4, mov, webm |

**Done when:** Can record system audio, transcribe YouTube URLs

### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build VideoPlayer component with subtitles | `VideoPlayer.tsx` |
| AM | Sync subtitles to video playback | Highlight current text |
| PM | Add YouTube URL input + transcribe button | Paste URL → transcribe |
| PM | Add audio source selector (mic/system/both) | Dropdown in recording view |

**Done when:** Video player works, YouTube transcription works

### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Integrate Parakeet v2 / WhisperKit for speed | 300x realtime on M-series |
| AM | Add Groq cloud transcription fallback | Fast cloud option |
| PM | Add DeepL translation integration | Translate transcripts |
| PM | Implement subtitle translation | Multiple language subtitles |

**Done when:** Fast local transcription, cloud fallback, translation works

---

## Day 7 (Tuesday) - Batch + Watch Folder + Menubar

### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Implement batch transcription queue | Process multiple files |
| AM | Add watch folder support (file watcher) | Auto-transcribe new files |
| PM | Implement real-time transcription (streaming) | Live transcript updates |
| PM | Add more export formats (SRT, VTT, CSV, HTML) | All MacWhisper formats |

**Done when:** Batch works, watch folder works, all exports work

### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build BatchTranscribe view | Select files → queue → progress |
| AM | Build WatchFolder settings UI | Configure watched directories |
| PM | Build Menubar app mode | Compact menu bar interface |
| PM | Build Global spotlight mode | Cmd+Shift+T → quick transcribe |

**Done when:** Batch UI, watch folder, menubar mode all work

### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Add filler word removal (um, uh, like) | Toggle in settings |
| AM | Implement manual speaker assignment UI | Assign names to speakers |
| PM | Add star/favorite segments | Mark important moments |
| PM | Add edit/delete segments | Full transcript editing |

**Done when:** Filler removal, speaker editing, segment editing work

---

## Day 8 (Wednesday) - AI Differentiation

### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Implement Local RAG with embeddings | Index all transcripts |
| AM | Add semantic search across transcripts | Find by meaning |
| PM | Implement cross-meeting insights | Pattern detection |
| PM | Add meeting auto-detection (Zoom/Meet processes) | Auto-start recording |

**Done when:** RAG works, insights work, auto-detection works

### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Build "Chat with Transcript" UI | `ChatPanel.tsx` |
| AM | Build Cross-Meeting Insights view | Show patterns |
| PM | Add compact mode (hide timestamps) | Toggle in view |
| PM | Add drag-from-Voice-Memos support | macOS integration |

**Done when:** Chat UI, insights UI, compact mode work

### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Add multiple AI providers (Claude, Groq, DeepSeek) | Provider selection |
| AM | Add custom GGML model support | Load user models |
| PM | Implement Zapier/n8n webhooks | Automation support |
| PM | Full platform testing | All features on all platforms |

**Done when:** All AI providers work, webhooks work, platforms stable

---

## Day 9 (Thursday) - Polish + Testing

### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Performance optimization | Fast on all operations |
| PM | Handle edge cases (long recordings, errors) | Robust system |

### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | UI polish pass | Consistent, professional |
| PM | Add all remaining keyboard shortcuts | Full keyboard navigation |

### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Test all MacWhisper parity features | Verify feature complete |
| PM | Test all differentiation features | Verify AI features work |

---

## Day 10 (Friday) - Beta Release

### All Team
| Time | Task |
|------|------|
| AM | Final testing pass |
| AM | Create beta release builds |
| PM | Write release notes |
| PM | **Distribute beta** |

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
- [ ] Parakeet/WhisperKit fast transcription works
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

# WEEK 3: Polish + Launch

## Day 11-12 (Mon-Tue) - Beta Feedback

### All Team
| Day | Task |
|-----|------|
| 11 AM | Collect and triage all feedback |
| 11 PM | Fix critical issues from beta |
| 12 AM | Fix high-priority feedback items |
| 12 PM | Implement quick-win suggestions |

**Done when:** Beta users happy, critical issues resolved

---

## Day 13 (Wednesday) - Final Polish

### P1 - Backend
| Time | Task | Deliverable |
|------|------|-------------|
| All day | Final bug fixes, performance tuning | Rock-solid backend |

### P2 - Frontend
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Final UI polish based on feedback | Perfect UI |
| PM | Create demo video, screenshots | Marketing assets |

### P3 - AI/Platform
| Time | Task | Deliverable |
|------|------|-------------|
| AM | Final platform testing | All builds work |
| PM | Write documentation, help content | Docs complete |

---

## Day 14 (Thursday) - Launch Prep

### All Team
| Time | Task |
|------|------|
| AM | Final QA pass - test everything |
| AM | Create release builds (signed) |
| PM | Prepare launch announcement |
| PM | Set up landing page / download page |

---

## Day 15 (Friday) - LAUNCH

### All Team
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

# Success Metrics

## Week 0
- [ ] All broken features fixed
- [ ] Core UX issues resolved

## Week 1
- [ ] Record → Transcribe → View → AI Summary pipeline works
- [ ] All exports work (Markdown, PDF, Obsidian)
- [ ] Search and RAG work
- [ ] All 3 platform builds work

## Week 2 - MacWhisper Parity
- [ ] Every MacWhisper feature matched
- [ ] Video + YouTube works
- [ ] Batch + Watch folder works
- [ ] Menubar + Spotlight mode works
- [ ] All differentiation features work

## Week 3
- [ ] Beta feedback addressed
- [ ] No critical bugs
- [ ] V1.0 launched

---

# Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Whisper too slow | Use Parakeet/WhisperKit or Groq fallback |
| System audio capture fails | Document BlackHole as alternative |
| Platform builds broken | Focus on macOS first, others follow |
| AI quality poor | Iterate prompts, use better models |
| Team blocked | Daily standups catch blockers early |
| MacWhisper parity too ambitious | Prioritize highest-value features |

---

# Post-Launch (Week 4+)

After V1.0, prioritize based on user feedback:
- iOS/Android native apps
- More integrations
- Niche features (legal, medical, etc.)
- Advanced AI features
- Team/collaboration features

---

# Daily Schedule

```
9:00 AM   - 10-min standup (blockers only)
9:10 AM   - Deep work with Claude Code
12:00 PM  - Lunch
1:00 PM   - Deep work with Claude Code
4:30 PM   - Quick sync (if needed)
5:00 PM   - Push code, update this doc

Friday 4 PM - Week demo
```
