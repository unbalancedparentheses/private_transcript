import Foundation
import WhisperKit

@main
struct WhisperKitWorker {
    static func main() async {
        // Parse command line arguments
        let args = CommandLine.arguments

        guard args.count >= 2 else {
            fputs("Usage: whisperkit-worker <audio_path> [model_path]\n", stderr)
            fputs("  audio_path: Path to audio file to transcribe\n", stderr)
            fputs("  model_path: Optional path to model directory\n", stderr)
            exit(1)
        }

        let audioPath = args[1]
        let modelPath: String? = args.count >= 3 ? args[2] : nil

        // Verify audio file exists
        guard FileManager.default.fileExists(atPath: audioPath) else {
            fputs("ERROR: Audio file does not exist: \(audioPath)\n", stderr)
            exit(1)
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

            // Set up decoding options:
            // - task: .transcribe = keep original language (NOT translate to English)
            // - language: nil = auto-detect the language
            // - detectLanguage: true = detect the language first
            // - usePrefillPrompt: false = don't force any language in prefill
            let decodingOptions = DecodingOptions(
                verbose: false,
                task: .transcribe,           // Keep original language
                language: nil,               // Auto-detect language
                temperature: 0.0,
                usePrefillPrompt: false,     // Don't use prefill (can cause translation)
                usePrefillCache: false,      // Don't use prefill cache
                detectLanguage: true,        // Detect language first
                skipSpecialTokens: true,
                withoutTimestamps: true
            )

            // Transcribe the audio with options
            let results = try await whisperKit.transcribe(
                audioPath: audioPath,
                decodeOptions: decodingOptions
            )

            // Output the transcript to stdout
            if results.isEmpty {
                fputs("ERROR: No transcription results\n", stderr)
                exit(1)
            }

            // Log detected language
            if let detectedLanguage = results.first?.language {
                fputs("Detected language: \(detectedLanguage)\n", stderr)
            }

            let fullText = results.map { $0.text }.joined(separator: " ")
            print(fullText.trimmingCharacters(in: .whitespacesAndNewlines))

        } catch {
            fputs("ERROR: \(error.localizedDescription)\n", stderr)
            exit(1)
        }
    }
}
