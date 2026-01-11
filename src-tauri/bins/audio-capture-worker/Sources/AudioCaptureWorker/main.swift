import Foundation
import ArgumentParser

/// Output message types for JSON stdout
struct StatusMessage: Codable {
    let type: String
    let state: String
    let durationMs: Int
    let micLevel: Float
    let systemLevel: Float

    enum CodingKeys: String, CodingKey {
        case type
        case state
        case durationMs = "duration_ms"
        case micLevel = "mic_level"
        case systemLevel = "system_level"
    }
}

struct CompleteMessage: Codable {
    let type: String
    let outputPath: String
    let durationMs: Int

    enum CodingKeys: String, CodingKey {
        case type
        case outputPath = "output_path"
        case durationMs = "duration_ms"
    }
}

struct ErrorMessage: Codable {
    let type: String
    let message: String
}

struct DevicesMessage: Codable {
    let type: String
    let devices: [AudioDevice]
}

/// Main CLI for audio capture
struct AudioCaptureWorker: ParsableCommand {
    static var configuration = CommandConfiguration(
        commandName: "audio-capture-worker",
        abstract: "Captures system audio and microphone, outputs to WAV file",
        subcommands: [Record.self, ListDevices.self],
        defaultSubcommand: Record.self
    )
}

/// Record subcommand
struct Record: ParsableCommand {
    static var configuration = CommandConfiguration(
        abstract: "Start recording audio"
    )

    @Option(name: .long, help: "Output file path")
    var output: String

    @Option(name: .long, help: "Microphone device ID (optional, uses default if not specified)")
    var micDevice: String?

    @Flag(name: .long, help: "Capture system audio")
    var systemAudio: Bool = false

    @Option(name: .long, help: "Sample rate (default: 16000)")
    var sampleRate: Int = 16000

    @Option(name: .long, help: "Microphone volume (0.0-1.0)")
    var micVolume: Float = 1.0

    @Option(name: .long, help: "System audio volume (0.0-1.0)")
    var systemVolume: Float = 0.7

    mutating func run() throws {
        // Check macOS version for system audio
        if systemAudio {
            if #available(macOS 13.0, *) {
                // OK
            } else {
                outputError("System audio capture requires macOS 13.0 or later")
                throw ExitCode.failure
            }
        }

        let recorder = AudioRecorder(
            outputPath: output,
            micDeviceId: micDevice,
            captureSystemAudio: systemAudio,
            sampleRate: sampleRate,
            micVolume: micVolume,
            systemVolume: systemVolume
        )

        // Set up signal handlers for graceful shutdown
        signal(SIGTERM) { _ in
            AudioRecorder.shouldStop = true
        }
        signal(SIGINT) { _ in
            AudioRecorder.shouldStop = true
        }

        // Start recording
        do {
            try recorder.start()
        } catch {
            outputError(error.localizedDescription)
            throw ExitCode.failure
        }

        // Run until stopped
        RunLoop.main.run()
    }

    private func outputError(_ message: String) {
        let error = ErrorMessage(type: "error", message: message)
        if let data = try? JSONEncoder().encode(error),
           let json = String(data: data, encoding: .utf8) {
            print(json)
            fflush(stdout)
        }
    }
}

/// List devices subcommand
struct ListDevices: ParsableCommand {
    static var configuration = CommandConfiguration(
        commandName: "list-devices",
        abstract: "List available audio input devices"
    )

    mutating func run() throws {
        let devices = MicrophoneCapture.listDevices()
        let message = DevicesMessage(type: "devices", devices: devices)

        let encoder = JSONEncoder()
        if let data = try? encoder.encode(message),
           let json = String(data: data, encoding: .utf8) {
            print(json)
        }
    }
}

/// Main recorder class that coordinates all capture
class AudioRecorder {
    static var shouldStop = false

    private let outputPath: String
    private let micDeviceId: String?
    private let captureSystemAudio: Bool
    private let sampleRate: Int
    private let micVolume: Float
    private let systemVolume: Float

    private var mixer: AudioMixer?
    private var micCapture: MicrophoneCapture?
    private var systemCapture: Any? // Type-erased for version compatibility

    private var statusTimer: Timer?

    init(
        outputPath: String,
        micDeviceId: String?,
        captureSystemAudio: Bool,
        sampleRate: Int,
        micVolume: Float,
        systemVolume: Float
    ) {
        self.outputPath = outputPath
        self.micDeviceId = micDeviceId
        self.captureSystemAudio = captureSystemAudio
        self.sampleRate = sampleRate
        self.micVolume = micVolume
        self.systemVolume = systemVolume
    }

    func start() throws {
        // Create mixer
        mixer = AudioMixer(outputPath: outputPath, sampleRate: sampleRate)
        mixer?.micVolume = micVolume
        mixer?.systemVolume = systemVolume
        try mixer?.start()

        // Start microphone capture
        micCapture = MicrophoneCapture(sampleRate: sampleRate)

        if captureSystemAudio {
            micCapture?.onAudioSamples = { [weak self] samples in
                self?.mixer?.addMicSamples(samples)
            }
        } else {
            micCapture?.onAudioSamples = { [weak self] samples in
                try? self?.mixer?.addMicOnlySamples(samples)
            }
        }

        try micCapture?.start(deviceId: micDeviceId)

        // Start system audio capture if enabled
        if captureSystemAudio {
            if #available(macOS 13.0, *) {
                try startSystemCapture()
            }
        }

        // Start status output timer
        statusTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            self?.outputStatus()

            if AudioRecorder.shouldStop {
                self?.stop()
            }
        }

        outputStatus()
    }

    @available(macOS 13.0, *)
    private func startSystemCapture() throws {
        // Check permission
        if !SystemAudioCapture.hasPermission() {
            _ = SystemAudioCapture.requestPermission()
            // Permission dialog will be shown, but we continue anyway
            // The capture will fail if permission is denied
        }

        let capture = SystemAudioCapture(sampleRate: sampleRate)
        capture.onAudioSamples = { [weak self] samples in
            self?.mixer?.addSystemSamples(samples)
        }
        capture.onError = { error in
            let msg = ErrorMessage(type: "error", message: error.localizedDescription)
            if let data = try? JSONEncoder().encode(msg),
               let json = String(data: data, encoding: .utf8) {
                print(json)
                fflush(stdout)
            }
        }

        Task {
            do {
                try await capture.start()
            } catch {
                let msg = ErrorMessage(type: "error", message: error.localizedDescription)
                if let data = try? JSONEncoder().encode(msg),
                   let json = String(data: data, encoding: .utf8) {
                    print(json)
                    fflush(stdout)
                }
            }
        }

        systemCapture = capture
    }

    private func stop() {
        statusTimer?.invalidate()
        statusTimer = nil

        micCapture?.stop()

        if #available(macOS 13.0, *) {
            if let capture = systemCapture as? SystemAudioCapture {
                Task {
                    try? await capture.stop()
                }
            }
        }

        do {
            try mixer?.stop()
            outputComplete()
        } catch {
            let msg = ErrorMessage(type: "error", message: error.localizedDescription)
            if let data = try? JSONEncoder().encode(msg),
               let json = String(data: data, encoding: .utf8) {
                print(json)
                fflush(stdout)
            }
        }

        exit(0)
    }

    private func outputStatus() {
        let status = StatusMessage(
            type: "status",
            state: "recording",
            durationMs: mixer?.durationMs ?? 0,
            micLevel: mixer?.micLevel ?? 0,
            systemLevel: mixer?.systemLevel ?? 0
        )

        if let data = try? JSONEncoder().encode(status),
           let json = String(data: data, encoding: .utf8) {
            print(json)
            fflush(stdout)
        }
    }

    private func outputComplete() {
        let complete = CompleteMessage(
            type: "complete",
            outputPath: outputPath,
            durationMs: mixer?.durationMs ?? 0
        )

        if let data = try? JSONEncoder().encode(complete),
           let json = String(data: data, encoding: .utf8) {
            print(json)
            fflush(stdout)
        }
    }
}

// Entry point
AudioCaptureWorker.main()
