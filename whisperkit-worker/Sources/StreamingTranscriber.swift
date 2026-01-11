import Foundation
import WhisperKit

/// Manages streaming transcription using WhisperKit's real-time transcription loop pattern
actor StreamingTranscriber {
    // MARK: - Configuration

    struct Config {
        var model: String?
        var language: String?
        var useVAD: Bool = true
        var confirmationThreshold: Int = 2
        var silenceThreshold: Float = 0.3
        var realtimeDelayMs: Int = 100
    }

    // MARK: - State

    private var whisperKit: WhisperKit?
    private var config: Config = Config()
    private var isInitialized = false
    private var isTranscribing = false
    private var currentSessionId: String?

    // Audio buffer for samples received via IPC
    private var audioBuffer: [Float] = []

    // Transcription state
    private var confirmedSegments: [TranscriptionSegment] = []
    private var lastTranscribedSampleCount: Int = 0
    private var confirmedText: String = ""
    private var lastTentativeText: String = ""

    // MARK: - Initialization

    func initialize(model: String?, language: String?) async throws {
        fputs("[StreamingTranscriber] Initializing with model: \(model ?? "default")\n", stderr)

        let whisperConfig = WhisperKitConfig(
            model: model,
            computeOptions: ModelComputeOptions(
                audioEncoderCompute: .cpuAndNeuralEngine,
                textDecoderCompute: .cpuAndNeuralEngine
            ),
            verbose: false,
            logLevel: .none
        )

        do {
            whisperKit = try await WhisperKit(whisperConfig)
            config.model = model
            config.language = language
            isInitialized = true

            let modelPath = whisperKit?.modelFolder?.path
            IPC.emit(.ready(model: model ?? "default", modelPath: modelPath))
            fputs("[StreamingTranscriber] Initialized successfully\n", stderr)
        } catch {
            fputs("[StreamingTranscriber] Failed to initialize: \(error)\n", stderr)
            throw StreamingError.initializationFailed(error.localizedDescription)
        }
    }

    // MARK: - Session Management

    func startSession(sessionId: String, useVAD: Bool, confirmationThreshold: Int) async throws {
        guard isInitialized, whisperKit != nil else {
            throw StreamingError.notInitialized
        }

        guard !isTranscribing else {
            throw StreamingError.sessionAlreadyActive
        }

        fputs("[StreamingTranscriber] Starting session: \(sessionId)\n", stderr)

        config.useVAD = useVAD
        config.confirmationThreshold = confirmationThreshold
        currentSessionId = sessionId
        isTranscribing = true

        // Reset state
        audioBuffer = []
        confirmedSegments = []
        lastTranscribedSampleCount = 0
        confirmedText = ""
        lastTentativeText = ""

        IPC.emit(.status(state: "transcribing", sessionId: sessionId))

        // Start the transcription loop
        Task {
            await transcriptionLoop()
        }
    }

    func stopSession() async -> String {
        guard let sessionId = currentSessionId else {
            return ""
        }

        fputs("[StreamingTranscriber] Stopping session: \(sessionId)\n", stderr)
        isTranscribing = false

        // Process any remaining audio
        if audioBuffer.count > lastTranscribedSampleCount {
            await transcribeCurrentBuffer(isFinal: true)
        }

        // Build full text
        let fullText = buildFullText()
        IPC.emit(.complete(sessionId: sessionId, fullText: fullText))
        IPC.emit(.status(state: "idle", sessionId: nil))

        currentSessionId = nil
        return fullText
    }

    // MARK: - Audio Input

    func feedAudio(samples: [Float]) {
        guard isTranscribing else { return }
        audioBuffer.append(contentsOf: samples)
    }

    // MARK: - Transcription Loop

    private func transcriptionLoop() async {
        fputs("[StreamingTranscriber] Transcription loop started\n", stderr)
        var loopCount = 0

        while isTranscribing {
            loopCount += 1
            // Check if we have enough new audio to process
            let currentSampleCount = audioBuffer.count
            let newSamples = currentSampleCount - lastTranscribedSampleCount

            if loopCount % 20 == 1 {
                fputs("[StreamingTranscriber] Loop #\(loopCount): buffer=\(currentSampleCount), new=\(newSamples)\n", stderr)
            }

            // Process when we have at least ~1s of new audio at 48kHz
            // This gives WhisperKit enough context for accurate transcription
            if newSamples >= 48000 {
                fputs("[StreamingTranscriber] Processing \(newSamples) new samples...\n", stderr)
                await transcribeCurrentBuffer(isFinal: false)
                fputs("[StreamingTranscriber] Back from transcribeCurrentBuffer\n", stderr)
            }

            // Wait before next iteration (500ms for less CPU usage)
            fputs("[StreamingTranscriber] Sleeping for 500ms...\n", stderr)
            try? await Task.sleep(nanoseconds: 500_000_000)
            fputs("[StreamingTranscriber] Woke up from sleep\n", stderr)
        }
        fputs("[StreamingTranscriber] Transcription loop ended\n", stderr)
    }

    private func transcribeCurrentBuffer(isFinal: Bool) async {
        guard let whisperKit = whisperKit,
              let sessionId = currentSessionId else {
            fputs("[StreamingTranscriber] transcribeCurrentBuffer: no whisperKit or sessionId\n", stderr)
            return
        }

        // For streaming, only process a window of recent audio (max 10 seconds at 48kHz)
        // This prevents the buffer from being too large for WhisperKit
        let maxSamples = 48000 * 10  // 10 seconds
        let samples: [Float]
        if isFinal {
            // For final transcription, use all remaining audio
            samples = Array(audioBuffer)
        } else {
            // For streaming, use only recent audio
            samples = Array(audioBuffer.suffix(maxSamples))
        }

        guard samples.count > 0 else {
            fputs("[StreamingTranscriber] transcribeCurrentBuffer: no samples\n", stderr)
            return
        }

        fputs("[StreamingTranscriber] transcribeCurrentBuffer: \(samples.count) samples (buffer: \(audioBuffer.count)), isFinal=\(isFinal)\n", stderr)

        // Optional VAD check
        if config.useVAD && !isFinal {
            // Check if there's voice activity in recent samples
            // Use more recent samples for better responsiveness (last ~0.1s at 48kHz)
            let recentSamples = Array(samples.suffix(4800))
            let energy = recentSamples.map { $0 * $0 }.reduce(0, +) / Float(recentSamples.count)
            // Threshold tuned for browser audio: 1e-5 catches speech but ignores most silence
            // Speech typically has energy > 0.001, silence is < 1e-6
            let threshold: Float = 1e-5
            fputs("[StreamingTranscriber] VAD check: energy=\(energy), threshold=\(threshold)\n", stderr)
            if energy < threshold {
                // No voice detected, skip this iteration but update lastTranscribedSampleCount
                // to prevent buffer from growing indefinitely during silence
                lastTranscribedSampleCount = samples.count
                fputs("[StreamingTranscriber] VAD: skipping - below threshold\n", stderr)
                return
            }
            fputs("[StreamingTranscriber] VAD: voice detected, continuing\n", stderr)
        }

        do {
            let shouldDetectLanguage = config.language == nil
            fputs("[StreamingTranscriber] Calling whisperKit.transcribe() - language: \(config.language ?? "auto-detect"), detectLanguage: \(shouldDetectLanguage)\n", stderr)

            let decodingOptions = DecodingOptions(
                verbose: false,
                task: .transcribe,
                language: config.language,  // nil means auto-detect
                temperature: 0.0,
                usePrefillPrompt: false,
                usePrefillCache: false,
                detectLanguage: shouldDetectLanguage,
                skipSpecialTokens: true,
                withoutTimestamps: false,
                wordTimestamps: true
            )

            let results = try await whisperKit.transcribe(
                audioArray: samples,
                decodeOptions: decodingOptions
            )

            fputs("[StreamingTranscriber] Got \(results.count) results\n", stderr)

            // Log detected language
            if let firstResult = results.first {
                fputs("[StreamingTranscriber] Detected language: \(firstResult.language)\n", stderr)
            }

            // Clear old samples from buffer to prevent memory growth
            // Keep only the last 5 seconds for context overlap
            let keepSamples = 48000 * 5  // 5 seconds at 48kHz
            if audioBuffer.count > keepSamples {
                let removeCount = audioBuffer.count - keepSamples
                audioBuffer.removeFirst(removeCount)
                lastTranscribedSampleCount = 0
                fputs("[StreamingTranscriber] Cleared \(removeCount) old samples from buffer\n", stderr)
            } else {
                lastTranscribedSampleCount = audioBuffer.count
            }

            processResults(results, sessionId: sessionId, isFinal: isFinal)
            fputs("[StreamingTranscriber] transcribeCurrentBuffer: completed successfully\n", stderr)

        } catch {
            fputs("[StreamingTranscriber] Transcription error: \(error)\n", stderr)
            IPC.emit(.error(
                sessionId: sessionId,
                message: "Transcription failed: \(error.localizedDescription)",
                code: ErrorCode.transcriptionFailed.rawValue
            ))
        }
    }

    private func processResults(_ results: [TranscriptionResult], sessionId: String, isFinal: Bool) {
        fputs("[StreamingTranscriber] processResults: entering\n", stderr)

        guard !results.isEmpty else {
            fputs("[StreamingTranscriber] processResults: no results\n", stderr)
            return
        }

        var allSegments: [TranscriptionSegment] = []
        for result in results {
            allSegments.append(contentsOf: result.segments)
        }

        fputs("[StreamingTranscriber] processResults: \(allSegments.count) segments\n", stderr)

        guard !allSegments.isEmpty else {
            fputs("[StreamingTranscriber] processResults: no segments, returning\n", stderr)
            return
        }

        fputs("[StreamingTranscriber] processResults: step 1 - calculating counts\n", stderr)

        // Determine which segments are confirmed vs tentative
        // Segments that have appeared consistently are confirmed
        let totalSegments = allSegments.count
        let confirmedCount = max(0, totalSegments - config.confirmationThreshold)

        fputs("[StreamingTranscriber] processResults: totalSegments=\(totalSegments), confirmedCount=\(confirmedCount), existingConfirmed=\(confirmedSegments.count)\n", stderr)

        // Process newly confirmed segments
        // Note: Only iterate if we have new segments to confirm (confirmedCount > existingCount)
        // Creating a range like 2..<0 would crash in Swift
        fputs("[StreamingTranscriber] processResults: step 2 - processing confirmed\n", stderr)
        let existingConfirmedCount = confirmedSegments.count
        if confirmedCount > existingConfirmedCount {
            for i in existingConfirmedCount..<confirmedCount {
                fputs("[StreamingTranscriber] processResults: confirming segment \(i)\n", stderr)
                let segment = allSegments[i]
                let text = segment.text.trimmingCharacters(in: .whitespacesAndNewlines)
                if !text.isEmpty {
                    confirmedText += (confirmedText.isEmpty ? "" : " ") + text
                    fputs("[StreamingTranscriber] processResults: emitting confirmed: \(text.prefix(50))\n", stderr)
                    IPC.emit(.confirmed(
                        sessionId: sessionId,
                        text: text,
                        startTime: Double(segment.start),
                        endTime: Double(segment.end)
                    ))
                }
            }
        }

        // Update confirmed segments list
        // Reset if we have fewer segments than before (transcription reset/changed)
        fputs("[StreamingTranscriber] processResults: step 3 - updating confirmed list\n", stderr)
        if confirmedCount > 0 {
            if confirmedCount != confirmedSegments.count {
                confirmedSegments = Array(allSegments.prefix(confirmedCount))
            }
        } else if totalSegments < confirmedSegments.count {
            // Transcription reset - clear confirmed segments
            fputs("[StreamingTranscriber] processResults: resetting confirmed segments (totalSegments < existingConfirmed)\n", stderr)
            confirmedSegments = []
            confirmedText = ""
        }

        // Build and emit tentative text
        fputs("[StreamingTranscriber] processResults: step 4 - building tentative\n", stderr)
        let tentativeSegments = Array(allSegments.suffix(from: confirmedCount))
        fputs("[StreamingTranscriber] processResults: tentativeSegments.count=\(tentativeSegments.count)\n", stderr)

        let tentativeText = tentativeSegments
            .map { $0.text.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")

        fputs("[StreamingTranscriber] processResults: tentativeText length=\(tentativeText.count)\n", stderr)

        // Only emit if tentative text changed
        if tentativeText != lastTentativeText {
            lastTentativeText = tentativeText
            if !tentativeText.isEmpty {
                let timestamp = Double(tentativeSegments.first?.start ?? 0.0)
                fputs("[StreamingTranscriber] processResults: emitting tentative: \(tentativeText.prefix(50))\n", stderr)
                IPC.emit(.tentative(sessionId: sessionId, text: tentativeText, timestamp: timestamp))
            }
        }

        // If final, confirm all remaining segments
        fputs("[StreamingTranscriber] processResults: step 5 - checking final\n", stderr)
        if isFinal && !tentativeSegments.isEmpty {
            for segment in tentativeSegments {
                let text = segment.text.trimmingCharacters(in: .whitespacesAndNewlines)
                if !text.isEmpty {
                    confirmedText += (confirmedText.isEmpty ? "" : " ") + text
                    IPC.emit(.confirmed(
                        sessionId: sessionId,
                        text: text,
                        startTime: Double(segment.start),
                        endTime: Double(segment.end)
                    ))
                }
            }
            confirmedSegments = allSegments
        }

        fputs("[StreamingTranscriber] processResults: done\n", stderr)
    }

    private func buildFullText() -> String {
        return confirmedText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: - Status

    func getStatus() -> (state: String, sessionId: String?) {
        if isTranscribing {
            return ("transcribing", currentSessionId)
        } else if isInitialized {
            return ("idle", nil)
        } else {
            return ("uninitialized", nil)
        }
    }
}

// MARK: - Errors

enum StreamingError: Error, LocalizedError {
    case initializationFailed(String)
    case notInitialized
    case sessionAlreadyActive
    case sessionNotFound

    var errorDescription: String? {
        switch self {
        case .initializationFailed(let reason):
            return "Failed to initialize: \(reason)"
        case .notInitialized:
            return "Transcriber not initialized"
        case .sessionAlreadyActive:
            return "A transcription session is already active"
        case .sessionNotFound:
            return "No active session found"
        }
    }
}
