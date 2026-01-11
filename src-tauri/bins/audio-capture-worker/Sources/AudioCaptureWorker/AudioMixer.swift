import Foundation

/// Mixes multiple audio streams and writes to file
class AudioMixer {
    private var wavWriter: WAVWriter?
    private let outputPath: String
    private let sampleRate: Int
    private let lock = NSLock()

    // Buffers for time-aligned mixing
    private var micBuffer: [Float] = []
    private var systemBuffer: [Float] = []

    // Volume levels
    var micVolume: Float = 1.0
    var systemVolume: Float = 0.7

    // Status tracking
    private(set) var samplesWritten: Int = 0
    private(set) var micLevel: Float = 0.0
    private(set) var systemLevel: Float = 0.0

    /// Duration in milliseconds
    var durationMs: Int {
        return Int((Double(samplesWritten) / Double(sampleRate)) * 1000)
    }

    init(outputPath: String, sampleRate: Int = 16000) {
        self.outputPath = outputPath
        self.sampleRate = sampleRate
    }

    /// Start the mixer (creates output file)
    func start() throws {
        wavWriter = try WAVWriter(path: outputPath, sampleRate: sampleRate, channels: 1)
    }

    /// Add microphone samples
    func addMicSamples(_ samples: [Float]) {
        lock.lock()
        defer { lock.unlock() }

        micBuffer.append(contentsOf: samples)
        micLevel = calculateLevel(samples)
        tryMix()
    }

    /// Add system audio samples
    func addSystemSamples(_ samples: [Float]) {
        lock.lock()
        defer { lock.unlock() }

        systemBuffer.append(contentsOf: samples)
        systemLevel = calculateLevel(samples)
        tryMix()
    }

    /// Add mic-only samples (when system audio is disabled)
    func addMicOnlySamples(_ samples: [Float]) throws {
        lock.lock()
        defer { lock.unlock() }

        micLevel = calculateLevel(samples)

        // Apply volume and write directly
        let scaled = samples.map { $0 * micVolume }
        try wavWriter?.writeSamples(scaled)
        samplesWritten += samples.count
    }

    /// Mix when we have samples from both sources
    private func tryMix() {
        // Mix in chunks when we have enough from both
        let minSamples = min(micBuffer.count, systemBuffer.count)
        guard minSamples > 0 else { return }

        // Extract samples to mix
        let micSamples = Array(micBuffer.prefix(minSamples))
        let systemSamples = Array(systemBuffer.prefix(minSamples))

        micBuffer.removeFirst(minSamples)
        systemBuffer.removeFirst(minSamples)

        // Mix samples
        var mixed = [Float](repeating: 0, count: minSamples)
        for i in 0..<minSamples {
            let mic = micSamples[i] * micVolume
            let sys = systemSamples[i] * systemVolume

            // Additive mixing with soft clipping (tanh)
            mixed[i] = tanh(mic + sys)
        }

        // Write to file
        do {
            try wavWriter?.writeSamples(mixed)
            samplesWritten += minSamples
        } catch {
            fputs("Error writing samples: \(error)\n", stderr)
        }
    }

    /// Stop the mixer and finalize the output file
    func stop() throws {
        lock.lock()
        defer { lock.unlock() }

        // Flush remaining buffers
        if !micBuffer.isEmpty || !systemBuffer.isEmpty {
            let maxLen = max(micBuffer.count, systemBuffer.count)
            var mixed = [Float](repeating: 0, count: maxLen)

            for i in 0..<maxLen {
                let mic = i < micBuffer.count ? micBuffer[i] * micVolume : 0
                let sys = i < systemBuffer.count ? systemBuffer[i] * systemVolume : 0
                mixed[i] = tanh(mic + sys)
            }

            try wavWriter?.writeSamples(mixed)
            samplesWritten += maxLen
        }

        try wavWriter?.finalize()
        wavWriter = nil
    }

    private func calculateLevel(_ samples: [Float]) -> Float {
        guard !samples.isEmpty else { return 0 }
        let sumSquares = samples.reduce(0) { $0 + $1 * $1 }
        let rms = sqrt(sumSquares / Float(samples.count))
        return min(1.0, rms * 3)
    }

    private func tanh(_ x: Float) -> Float {
        return Darwin.tanh(x)
    }
}
