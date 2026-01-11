# Local AI Transcription: How It Works

## What is Local AI Transcription?

**Local AI transcription** means running speech-to-text AI directly on your computer, instead of sending audio to a cloud service.

```
Cloud:  Your voice → Internet → Their servers → AI processing → Result
Local:  Your voice → Your computer → AI processing → Result
```

**The difference:** Your audio never leaves your device.

---

## The Technology

### Whisper (OpenAI)

Whisper is OpenAI's automatic speech recognition (ASR) model. It's:
- Open source (free to use)
- Best-in-class accuracy
- Supports 100 languages
- Available in multiple sizes

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| tiny | 75MB | Fastest | Basic |
| base | 150MB | Fast | Good |
| small | 500MB | Medium | Better |
| medium | 1.5GB | Slow | Great |
| large-v3 | 3GB | Slowest | Best |

### WhisperKit (Apple)

For Mac users, WhisperKit optimizes Whisper for Apple Silicon:
- 10-30x faster than standard Whisper
- Uses Neural Engine
- Same accuracy
- M1/M2/M3/M4 chips

### Parakeet (NVIDIA)

For Windows/Linux with NVIDIA GPUs:
- Optimized for CUDA
- Extremely fast
- Great for long recordings
- Requires NVIDIA hardware

---

## Why Local is Better

### Privacy

| Concern | Cloud | Local |
|---------|-------|-------|
| Who hears your audio? | Their servers, employees | Only you |
| Where is it stored? | Their infrastructure | Your device |
| Can it be subpoenaed? | Yes | No (nothing to subpoena) |
| Breach exposure? | Their security | Your security |

### Cost

| Factor | Cloud | Local |
|--------|-------|-------|
| Pricing model | Per-minute or monthly | One-time |
| Long recordings | Expensive | Same cost |
| Unlimited use | Expensive | Included |
| 3-year cost | $600-1,000+ | $39 |

### Control

| Aspect | Cloud | Local |
|--------|-------|-------|
| Works offline | No | Yes |
| Dependent on service | Yes | No |
| Data retention | Their policy | Your choice |
| Export options | Limited | Unlimited |

---

## How It Works Technically

### 1. Audio Input

Your recording (microphone or file) is loaded into memory.

### 2. Preprocessing

Audio is converted to the format Whisper expects:
- 16kHz sample rate
- Mono channel
- Normalized volume

### 3. Model Loading

The Whisper model loads into RAM (and GPU if available):
- Weights loaded from disk
- Optimized for your hardware
- Stays in memory for fast subsequent transcriptions

### 4. Inference

The AI processes audio in chunks:
- 30-second segments
- Parallel processing on GPU
- Outputs text with timestamps

### 5. Post-Processing

Results are cleaned up:
- Speaker diarization (who said what)
- Punctuation and formatting
- Timestamp alignment

### 6. Storage

Transcripts saved to local database:
- SQLite for structured data
- AES-256 encryption
- Your device only

---

## Hardware Requirements

### Minimum

| Component | Requirement |
|-----------|-------------|
| CPU | Any modern 4-core |
| RAM | 8GB |
| Storage | 5GB free |

Transcription works, but slowly (~1x realtime).

### Recommended

| Component | Requirement |
|-----------|-------------|
| CPU | Apple Silicon or 8-core Intel/AMD |
| RAM | 16GB |
| Storage | 10GB free |
| GPU | Apple Neural Engine or NVIDIA 6GB+ |

Transcription at 5-30x realtime.

### Optimal

| Component | Requirement |
|-----------|-------------|
| CPU | M2/M3 Pro/Max or AMD 7000+ |
| RAM | 32GB |
| Storage | SSD |
| GPU | Apple Neural Engine or NVIDIA RTX 3080+ |

Transcription at 10-50x realtime.

---

## Comparison: Transcription Speed

### 1-Hour Recording

| Setup | Time to Transcribe |
|-------|-------------------|
| Cloud (Otter/Fireflies) | 5-10 min (upload) + processing |
| M1 MacBook Air | ~15 min |
| M2 Pro MacBook Pro | ~5 min |
| M3 Max Mac Studio | ~2 min |
| RTX 4090 Windows | ~3 min |
| Intel Core i7 (CPU only) | ~60 min |

Modern hardware is fast enough for practical use.

---

## AI Features (Beyond Transcription)

### Local LLM with Ollama

For AI-powered features, we use Ollama to run LLMs locally:

| Feature | How It Works |
|---------|--------------|
| Summaries | LLM reads transcript, generates summary |
| Action items | LLM extracts commitments and todos |
| Key decisions | LLM identifies important choices |
| Chat | Ask questions, LLM answers from transcript |

**All local. No cloud.**

### Local RAG (Retrieval-Augmented Generation)

For searching across all your transcripts:

1. **Embedding** — Each transcript chunk is converted to a vector
2. **Storage** — Vectors stored in local SQLite database
3. **Query** — Your question is converted to a vector
4. **Search** — Similar chunks are retrieved
5. **Answer** — LLM generates answer from relevant chunks

**Ask questions like:** "What did John say about the budget last quarter?"

**Get answers from:** All your transcripts, processed locally.

---

## Setting Up Local AI

### Step 1: Install Private Transcript

Download and install. Transcription works immediately.

### Step 2: Choose a Model

On first transcription, select:
- **Small** — Fast, good for quick transcription
- **Large-v3** — Slower, best accuracy

Model downloads once, then works offline.

### Step 3: Optional — Install Ollama

For AI features (summaries, chat, RAG):

```bash
# Mac
brew install ollama

# Then pull a model
ollama pull llama3.1:8b
```

Now AI features work locally.

---

## Privacy Guarantees

With local AI transcription:

| Promise | How We Deliver |
|---------|----------------|
| Audio stays local | No network calls, no uploads |
| No account needed | No email, no login |
| No telemetry | We don't track anything |
| You control deletion | Delete files = deleted |
| Works offline | No internet dependency |

**We can't access your data because we don't have servers.**

---

## Common Questions

### "Is local AI as accurate as cloud?"

Yes. We use Whisper, which is the same (or better) than cloud services. Many cloud services use Whisper too.

### "Is it slower than cloud?"

Depends on hardware. On Apple Silicon or good NVIDIA GPUs, local is often faster (no upload/download time). On older hardware, cloud may be faster.

### "What about languages other than English?"

Whisper supports 100 languages. Accuracy varies by language, but major languages work well.

### "Can I use my own fine-tuned model?"

Yes (Pro feature). You can load custom GGML models for specialized vocabulary.

### "Does this work without GPU?"

Yes, but slower. CPU-only transcription runs at about 0.5-1x realtime.

---

## Getting Started

1. **Download** Private Transcript
2. **Select** your Whisper model
3. **Transcribe** — everything stays on your device
4. **Optionally** install Ollama for AI features

Your voice, your computer, your control.

---

## Pricing

| Plan | Price | Local AI Features |
|------|-------|-------------------|
| Free | $0 | Local transcription, basic export |
| Pro | $39 | + Local RAG, summaries, chat |

All processing happens on your machine. Forever.
