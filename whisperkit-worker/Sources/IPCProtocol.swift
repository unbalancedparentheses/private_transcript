import Foundation

// MARK: - Commands (Rust -> Swift via stdin)

/// Commands received from the Rust backend via stdin as NDJSON
enum Command: Decodable {
    case initialize(model: String?, language: String?)
    case start(sessionId: String, useVAD: Bool, confirmationThreshold: Int)
    case audio(sessionId: String, samples: String, sampleCount: Int)
    case stop(sessionId: String)
    case shutdown

    private enum CodingKeys: String, CodingKey {
        case cmd
        case model
        case language
        case sessionId
        case useVAD
        case confirmationThreshold
        case samples
        case sampleCount
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let cmd = try container.decode(String.self, forKey: .cmd)

        switch cmd {
        case "init":
            let model = try container.decodeIfPresent(String.self, forKey: .model)
            let language = try container.decodeIfPresent(String.self, forKey: .language)
            self = .initialize(model: model, language: language)

        case "start":
            let sessionId = try container.decode(String.self, forKey: .sessionId)
            let useVAD = try container.decodeIfPresent(Bool.self, forKey: .useVAD) ?? true
            let confirmationThreshold = try container.decodeIfPresent(Int.self, forKey: .confirmationThreshold) ?? 2
            self = .start(sessionId: sessionId, useVAD: useVAD, confirmationThreshold: confirmationThreshold)

        case "audio":
            let sessionId = try container.decode(String.self, forKey: .sessionId)
            let samples = try container.decode(String.self, forKey: .samples)
            let sampleCount = try container.decode(Int.self, forKey: .sampleCount)
            self = .audio(sessionId: sessionId, samples: samples, sampleCount: sampleCount)

        case "stop":
            let sessionId = try container.decode(String.self, forKey: .sessionId)
            self = .stop(sessionId: sessionId)

        case "shutdown":
            self = .shutdown

        default:
            throw DecodingError.dataCorruptedError(
                forKey: .cmd,
                in: container,
                debugDescription: "Unknown command: \(cmd)"
            )
        }
    }
}

// MARK: - Events (Swift -> Rust via stdout)

/// Events sent to the Rust backend via stdout as NDJSON
enum Event: Encodable {
    case ready(model: String, modelPath: String?)
    case tentative(sessionId: String, text: String, timestamp: Double)
    case confirmed(sessionId: String, text: String, startTime: Double, endTime: Double)
    case complete(sessionId: String, fullText: String)
    case error(sessionId: String?, message: String, code: String)
    case status(state: String, sessionId: String?)

    private enum CodingKeys: String, CodingKey {
        case type
        case model
        case modelPath
        case sessionId
        case text
        case timestamp
        case startTime
        case endTime
        case fullText
        case message
        case code
        case state
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .ready(let model, let modelPath):
            try container.encode("ready", forKey: .type)
            try container.encode(model, forKey: .model)
            try container.encodeIfPresent(modelPath, forKey: .modelPath)

        case .tentative(let sessionId, let text, let timestamp):
            try container.encode("tentative", forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encode(text, forKey: .text)
            try container.encode(timestamp, forKey: .timestamp)

        case .confirmed(let sessionId, let text, let startTime, let endTime):
            try container.encode("confirmed", forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encode(text, forKey: .text)
            try container.encode(startTime, forKey: .startTime)
            try container.encode(endTime, forKey: .endTime)

        case .complete(let sessionId, let fullText):
            try container.encode("complete", forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encode(fullText, forKey: .fullText)

        case .error(let sessionId, let message, let code):
            try container.encode("error", forKey: .type)
            try container.encodeIfPresent(sessionId, forKey: .sessionId)
            try container.encode(message, forKey: .message)
            try container.encode(code, forKey: .code)

        case .status(let state, let sessionId):
            try container.encode("status", forKey: .type)
            try container.encode(state, forKey: .state)
            try container.encodeIfPresent(sessionId, forKey: .sessionId)
        }
    }
}

// MARK: - Error Codes

enum ErrorCode: String {
    case modelLoadFailed = "MODEL_LOAD_FAILED"
    case notInitialized = "NOT_INITIALIZED"
    case sessionNotFound = "SESSION_NOT_FOUND"
    case audioDecodeFailed = "AUDIO_DECODE_FAILED"
    case transcriptionFailed = "TRANSCRIPTION_FAILED"
    case invalidCommand = "INVALID_COMMAND"
    case internalError = "INTERNAL_ERROR"
}

// MARK: - IPC Helper Functions

/// Send an event to stdout as NDJSON
func emit(_ event: Event) {
    let encoder = JSONEncoder()
    encoder.keyEncodingStrategy = .convertToSnakeCase

    do {
        let data = try encoder.encode(event)
        if let json = String(data: data, encoding: .utf8) {
            print(json)
            fflush(stdout)
        }
    } catch {
        // Fallback error emission
        fputs("{\"type\":\"error\",\"message\":\"Failed to encode event: \(error.localizedDescription)\",\"code\":\"INTERNAL_ERROR\"}\n", stdout)
        fflush(stdout)
    }
}

/// Read a command from stdin as NDJSON
func readCommand() -> Command? {
    guard let line = readLine() else {
        return nil
    }

    guard !line.isEmpty else {
        return nil
    }

    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase

    do {
        let data = Data(line.utf8)
        return try decoder.decode(Command.self, from: data)
    } catch {
        emit(.error(sessionId: nil, message: "Failed to parse command: \(error.localizedDescription)", code: ErrorCode.invalidCommand.rawValue))
        return nil
    }
}

/// Decode base64-encoded float32 samples
func decodeSamples(base64: String, expectedCount: Int) -> [Float]? {
    guard let data = Data(base64Encoded: base64) else {
        return nil
    }

    // Each float32 is 4 bytes
    guard data.count == expectedCount * 4 else {
        return nil
    }

    var samples = [Float](repeating: 0, count: expectedCount)
    _ = samples.withUnsafeMutableBytes { buffer in
        data.copyBytes(to: buffer)
    }

    return samples
}
