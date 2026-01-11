import Foundation
import WhisperKit
import ArgumentParser

// MARK: - Main Command

@main
struct WhisperKitWorker: AsyncParsableCommand {
    static var configuration = CommandConfiguration(
        commandName: "whisperkit-worker",
        abstract: "WhisperKit transcription worker for Private Transcript",
        version: "1.0.0",
        subcommands: [Transcribe.self, Stream.self],
        defaultSubcommand: Transcribe.self
    )
}

// MARK: - Transcribe Subcommand (Batch Mode - Original Behavior)

struct Transcribe: AsyncParsableCommand {
    static var configuration = CommandConfiguration(
        abstract: "Transcribe an audio file (batch mode)"
    )

    @Argument(help: "Path to the audio file to transcribe")
    var audioPath: String

    @Option(name: .long, help: "Path to the model directory")
    var modelPath: String?

    @Option(name: .long, help: "Language code (e.g., 'en', 'es'). Auto-detect if not specified")
    var language: String?

    func run() async throws {
        // Verify audio file exists
        guard FileManager.default.fileExists(atPath: audioPath) else {
            fputs("ERROR: Audio file does not exist: \(audioPath)\n", stderr)
            throw ExitCode.failure
        }

        do {
            // Initialize WhisperKit
            fputs("Initializing WhisperKit...\n", stderr)

            let config = WhisperKitConfig(
                model: modelPath,
                computeOptions: ModelComputeOptions(
                    audioEncoderCompute: .cpuAndNeuralEngine,
                    textDecoderCompute: .cpuAndNeuralEngine
                ),
                verbose: false,
                logLevel: .none
            )

            let whisperKit = try await WhisperKit(config)

            fputs("Transcribing audio...\n", stderr)

            // Set up decoding options
            let decodingOptions = DecodingOptions(
                verbose: false,
                task: .transcribe,
                language: language,
                temperature: 0.0,
                usePrefillPrompt: false,
                usePrefillCache: false,
                detectLanguage: language == nil,
                skipSpecialTokens: true,
                withoutTimestamps: true
            )

            // Transcribe the audio
            let results = try await whisperKit.transcribe(
                audioPath: audioPath,
                decodeOptions: decodingOptions
            )

            // Output the transcript to stdout
            if results.isEmpty {
                fputs("ERROR: No transcription results\n", stderr)
                throw ExitCode.failure
            }

            // Log detected language
            if let detectedLanguage = results.first?.language {
                fputs("Detected language: \(detectedLanguage)\n", stderr)
            }

            let fullText = results.map { $0.text }.joined(separator: " ")
            print(fullText.trimmingCharacters(in: .whitespacesAndNewlines))

        } catch let error as ExitCode {
            throw error
        } catch {
            fputs("ERROR: \(error.localizedDescription)\n", stderr)
            throw ExitCode.failure
        }
    }
}

// MARK: - Stream Subcommand (Real-time Mode)

struct Stream: AsyncParsableCommand {
    static var configuration = CommandConfiguration(
        abstract: "Run in streaming mode, accepting audio via stdin and emitting incremental results"
    )

    @Option(name: .long, help: "Default model to use")
    var model: String?

    @Option(name: .long, help: "Default language code")
    var language: String?

    func run() async throws {
        fputs("[Stream] Starting streaming mode...\n", stderr)

        let transcriber = StreamingTranscriber()
        var shouldExit = false

        // Main command loop
        while !shouldExit {
            guard let command = IPC.readCommand() else {
                // EOF or empty line, continue
                try? await Task.sleep(nanoseconds: 10_000_000) // 10ms
                continue
            }

            do {
                switch command {
                case .initialize(let model, let language):
                    fputs("[Stream] Received init command\n", stderr)
                    try await transcriber.initialize(
                        model: model ?? self.model,
                        language: language ?? self.language
                    )

                case .start(let sessionId, let useVAD, let confirmationThreshold):
                    fputs("[Stream] Received start command for session: \(sessionId)\n", stderr)
                    try await transcriber.startSession(
                        sessionId: sessionId,
                        useVAD: useVAD,
                        confirmationThreshold: confirmationThreshold
                    )

                case .audio(let sessionId, let samplesBase64, let sampleCount):
                    // Decode and feed audio samples
                    if let samples = IPC.decodeSamples(base64: samplesBase64, expectedCount: sampleCount) {
                        await transcriber.feedAudio(samples: samples)
                    } else {
                        IPC.emit(.error(
                            sessionId: sessionId,
                            message: "Failed to decode audio samples",
                            code: ErrorCode.audioDecodeFailed.rawValue
                        ))
                    }

                case .stop(let sessionId):
                    fputs("[Stream] Received stop command for session: \(sessionId)\n", stderr)
                    _ = await transcriber.stopSession()

                case .shutdown:
                    fputs("[Stream] Received shutdown command\n", stderr)
                    _ = await transcriber.stopSession()
                    shouldExit = true
                }
            } catch {
                fputs("[Stream] Error processing command: \(error)\n", stderr)
                IPC.emit(.error(
                    sessionId: nil,
                    message: error.localizedDescription,
                    code: ErrorCode.internalError.rawValue
                ))
            }
        }

        fputs("[Stream] Exiting streaming mode\n", stderr)
    }
}
