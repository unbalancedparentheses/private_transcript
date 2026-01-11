import Foundation
import ScreenCaptureKit
import AVFoundation
import CoreMedia

/// Captures system audio using ScreenCaptureKit (macOS 13.0+)
/// Audio capture via SCStreamConfiguration requires macOS 13.0+
@available(macOS 13.0, *)
class SystemAudioCapture: NSObject, SCStreamDelegate, SCStreamOutput {
    private var stream: SCStream?
    private var isRunning = false
    private let sampleRate: Int
    private let outputQueue = DispatchQueue(label: "com.privatetranscript.systemaudio", qos: .userInteractive)

    /// Callback when audio samples are available
    var onAudioSamples: (([Float]) -> Void)?

    /// Callback for errors
    var onError: ((Error) -> Void)?

    /// Current audio level (0.0 to 1.0)
    private(set) var currentLevel: Float = 0.0

    init(sampleRate: Int = 16000) {
        self.sampleRate = sampleRate
        super.init()
    }

    /// Check if screen recording permission is granted
    static func hasPermission() -> Bool {
        return CGPreflightScreenCaptureAccess()
    }

    /// Request screen recording permission
    static func requestPermission() -> Bool {
        return CGRequestScreenCaptureAccess()
    }

    /// Start capturing system audio
    func start() async throws {
        guard !isRunning else { return }

        // Get shareable content
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)

        guard let display = content.displays.first else {
            throw CaptureError.noDisplay
        }

        // Create filter for the display
        let filter = SCContentFilter(display: display, excludingWindows: [])

        // Configure stream for audio-only capture
        let config = SCStreamConfiguration()
        config.capturesAudio = true
        config.sampleRate = sampleRate
        config.channelCount = 1

        // Minimal video to reduce overhead (can't disable completely)
        config.width = 2
        config.height = 2
        config.minimumFrameInterval = CMTime(value: 1, timescale: 1) // 1 fps minimum
        config.showsCursor = false

        // Exclude audio from this app to avoid feedback
        if #available(macOS 13.0, *) {
            config.excludesCurrentProcessAudio = true
        }

        // Create stream
        stream = SCStream(filter: filter, configuration: config, delegate: self)

        // Add output handler for audio
        try stream?.addStreamOutput(self, type: .audio, sampleHandlerQueue: outputQueue)

        // Start capture
        try await stream?.startCapture()
        isRunning = true
    }

    /// Stop capturing
    func stop() async throws {
        guard isRunning else { return }

        try await stream?.stopCapture()
        stream = nil
        isRunning = false
    }

    // MARK: - SCStreamOutput

    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .audio else { return }

        // Extract audio samples from the sample buffer
        guard let samples = extractFloatSamples(from: sampleBuffer) else { return }

        // Calculate audio level
        currentLevel = calculateLevel(samples)

        // Call the callback
        onAudioSamples?(samples)
    }

    // MARK: - SCStreamDelegate

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        isRunning = false
        onError?(error)
    }

    // MARK: - Private

    private func extractFloatSamples(from sampleBuffer: CMSampleBuffer) -> [Float]? {
        guard let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else {
            return nil
        }

        var length = 0
        var dataPointer: UnsafeMutablePointer<Int8>?

        let status = CMBlockBufferGetDataPointer(
            blockBuffer,
            atOffset: 0,
            lengthAtOffsetOut: nil,
            totalLengthOut: &length,
            dataPointerOut: &dataPointer
        )

        guard status == kCMBlockBufferNoErr, let data = dataPointer else {
            return nil
        }

        // Get audio format description
        guard let formatDesc = CMSampleBufferGetFormatDescription(sampleBuffer),
              let asbd = CMAudioFormatDescriptionGetStreamBasicDescription(formatDesc) else {
            return nil
        }

        let format = asbd.pointee

        // Handle different audio formats
        if format.mFormatFlags & kAudioFormatFlagIsFloat != 0 {
            // Already float
            let floatPointer = UnsafeRawPointer(data).assumingMemoryBound(to: Float.self)
            let sampleCount = length / MemoryLayout<Float>.size
            return Array(UnsafeBufferPointer(start: floatPointer, count: sampleCount))
        } else if format.mBitsPerChannel == 16 {
            // 16-bit integer samples
            let int16Pointer = UnsafeRawPointer(data).assumingMemoryBound(to: Int16.self)
            let sampleCount = length / MemoryLayout<Int16>.size
            let int16Samples = Array(UnsafeBufferPointer(start: int16Pointer, count: sampleCount))
            return int16Samples.map { Float($0) / Float(Int16.max) }
        } else if format.mBitsPerChannel == 32 {
            // 32-bit integer samples
            let int32Pointer = UnsafeRawPointer(data).assumingMemoryBound(to: Int32.self)
            let sampleCount = length / MemoryLayout<Int32>.size
            let int32Samples = Array(UnsafeBufferPointer(start: int32Pointer, count: sampleCount))
            return int32Samples.map { Float($0) / Float(Int32.max) }
        }

        return nil
    }

    private func calculateLevel(_ samples: [Float]) -> Float {
        guard !samples.isEmpty else { return 0 }
        let sumSquares = samples.reduce(0) { $0 + $1 * $1 }
        let rms = sqrt(sumSquares / Float(samples.count))
        return min(1.0, rms * 3) // Scale up for visibility
    }
}

enum CaptureError: Error, LocalizedError {
    case noDisplay
    case permissionDenied
    case captureStartFailed(String)

    var errorDescription: String? {
        switch self {
        case .noDisplay:
            return "No display found for audio capture"
        case .permissionDenied:
            return "Screen recording permission denied. Please grant permission in System Settings > Privacy & Security > Screen Recording"
        case .captureStartFailed(let reason):
            return "Failed to start capture: \(reason)"
        }
    }
}
