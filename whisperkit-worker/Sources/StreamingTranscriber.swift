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
        while isTranscribing {
            // Check if we have enough new audio to process
            let currentSampleCount = audioBuffer.count
            let newSamples = currentSampleCount - lastTranscribedSampleCount

            // Process when we have at least 0.5 seconds of new audio (8000 samples at 16kHz)
            if newSamples >= 8000 {
                await transcribeCurrentBuffer(isFinal: false)
            }

            // Wait before next iteration
            try? await Task.sleep(nanoseconds: UInt64(config.realtimeDelayMs) * 1_000_000)
        }
    }

    private func transcribeCurrentBuffer(isFinal: Bool) async {
        guard let whisperKit = whisperKit,
              let sessionId = currentSessionId else { return }

        let samples = Array(audioBuffer)

        guard samples.count > 0 else { return }

        // Optional VAD check
        if config.useVAD && !isFinal {
            // Check if there's voice activity in recent samples
            let recentSamples = Array(samples.suffix(4800)) // Last 0.3 seconds
            let energy = recentSamples.map { $0 * $0 }.reduce(0, +) / Float(recentSamples.count)
            if energy < config.silenceThreshold * config.silenceThreshold {
                // No voice detected, skip this iteration
                return
            }
        }

        do {
            let decodingOptions = DecodingOptions(
                verbose: false,
                task: .transcribe,
                language: config.language,
                temperature: 0.0,
                usePrefillPrompt: false,
                usePrefillCache: false,
                detectLanguage: config.language == nil,
                skipSpecialTokens: true,
                withoutTimestamps: false,
                wordTimestamps: true
            )

            let results = try await whisperKit.transcribe(
                audioArray: samples,
                decodeOptions: decodingOptions
            )

            lastTranscribedSampleCount = samples.count

            processResults(results, sessionId: sessionId, isFinal: isFinal)

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
        guard !results.isEmpty else { return }

        var allSegments: [TranscriptionSegment] = []
        for result in results {
            allSegments.append(contentsOf: result.segments)
        }

        guard !allSegments.isEmpty else { return }

        // Determine which segments are confirmed vs tentative
        // Segments that have appeared consistently are confirmed
        let totalSegments = allSegments.count
        let confirmedCount = max(0, totalSegments - config.confirmationThreshold)

        // Process newly confirmed segments
        for i in confirmedSegments.count..<confirmedCount {
            let segment = allSegments[i]
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

        // Update confirmed segments list
        if confirmedCount > confirmedSegments.count {
            confirmedSegments = Array(allSegments.prefix(confirmedCount))
        }

        // Build and emit tentative text
        let tentativeSegments = Array(allSegments.suffix(from: confirmedCount))
        let tentativeText = tentativeSegments
            .map { $0.text.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")

        // Only emit if tentative text changed
        if tentativeText != lastTentativeText {
            lastTentativeText = tentativeText
            if !tentativeText.isEmpty {
                let timestamp = Double(tentativeSegments.first?.start ?? 0.0)
                IPC.emit(.tentative(sessionId: sessionId, text: tentativeText, timestamp: timestamp))
            }
        }

        // If final, confirm all remaining segments
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
