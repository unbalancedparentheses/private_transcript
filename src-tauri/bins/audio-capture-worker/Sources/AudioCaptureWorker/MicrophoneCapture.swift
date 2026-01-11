import Foundation
import AVFoundation

/// Captures microphone audio using AVFoundation
class MicrophoneCapture {
    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var isRunning = false
    private let sampleRate: Double
    private let targetSampleRate: Double = 16000

    /// Callback when audio samples are available
    var onAudioSamples: (([Float]) -> Void)?

    /// Callback for errors
    var onError: ((Error) -> Void)?

    /// Current audio level (0.0 to 1.0)
    private(set) var currentLevel: Float = 0.0

    init(sampleRate: Int = 16000) {
        self.sampleRate = Double(sampleRate)
    }

    /// List available input devices
    static func listDevices() -> [AudioDevice] {
        var devices: [AudioDevice] = []

        var propertyAddress = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDevices,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )

        var dataSize: UInt32 = 0
        var status = AudioObjectGetPropertyDataSize(
            AudioObjectID(kAudioObjectSystemObject),
            &propertyAddress,
            0,
            nil,
            &dataSize
        )

        guard status == noErr else { return devices }

        let deviceCount = Int(dataSize) / MemoryLayout<AudioDeviceID>.size
        var deviceIDs = [AudioDeviceID](repeating: 0, count: deviceCount)

        status = AudioObjectGetPropertyData(
            AudioObjectID(kAudioObjectSystemObject),
            &propertyAddress,
            0,
            nil,
            &dataSize,
            &deviceIDs
        )

        guard status == noErr else { return devices }

        // Get default input device
        var defaultInputDevice: AudioDeviceID = 0
        var defaultSize = UInt32(MemoryLayout<AudioDeviceID>.size)
        var defaultAddress = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDefaultInputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        AudioObjectGetPropertyData(
            AudioObjectID(kAudioObjectSystemObject),
            &defaultAddress,
            0,
            nil,
            &defaultSize,
            &defaultInputDevice
        )

        for deviceID in deviceIDs {
            // Check if device has input channels
            var inputAddress = AudioObjectPropertyAddress(
                mSelector: kAudioDevicePropertyStreamConfiguration,
                mScope: kAudioDevicePropertyScopeInput,
                mElement: kAudioObjectPropertyElementMain
            )

            var inputSize: UInt32 = 0
            status = AudioObjectGetPropertyDataSize(deviceID, &inputAddress, 0, nil, &inputSize)

            if status == noErr && inputSize > 0 {
                let bufferList = UnsafeMutablePointer<AudioBufferList>.allocate(capacity: 1)
                defer { bufferList.deallocate() }

                status = AudioObjectGetPropertyData(deviceID, &inputAddress, 0, nil, &inputSize, bufferList)

                if status == noErr && bufferList.pointee.mNumberBuffers > 0 {
                    // This is an input device
                    if let name = getDeviceName(deviceID) {
                        devices.append(AudioDevice(
                            id: String(deviceID),
                            name: name,
                            isDefault: deviceID == defaultInputDevice
                        ))
                    }
                }
            }
        }

        return devices
    }

    private static func getDeviceName(_ deviceID: AudioDeviceID) -> String? {
        var propertyAddress = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyDeviceNameCFString,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )

        var name: CFString?
        var dataSize = UInt32(MemoryLayout<CFString?>.size)

        let status = AudioObjectGetPropertyData(
            deviceID,
            &propertyAddress,
            0,
            nil,
            &dataSize,
            &name
        )

        if status == noErr, let deviceName = name {
            return deviceName as String
        }
        return nil
    }

    /// Start capturing from the specified device (nil for default)
    func start(deviceId: String? = nil) throws {
        guard !isRunning else { return }

        audioEngine = AVAudioEngine()
        guard let engine = audioEngine else {
            throw MicrophoneError.engineCreationFailed
        }

        inputNode = engine.inputNode

        // Set specific input device if requested
        if let deviceIdStr = deviceId, let deviceId = AudioDeviceID(deviceIdStr) {
            try setInputDevice(deviceId)
        }

        let inputFormat = inputNode!.outputFormat(forBus: 0)

        // Install tap on input node
        let bufferSize: AVAudioFrameCount = 1024

        inputNode?.installTap(onBus: 0, bufferSize: bufferSize, format: inputFormat) { [weak self] buffer, _ in
            self?.processAudioBuffer(buffer, inputSampleRate: inputFormat.sampleRate)
        }

        try engine.start()
        isRunning = true
    }

    /// Stop capturing
    func stop() {
        guard isRunning else { return }

        inputNode?.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil
        inputNode = nil
        isRunning = false
    }

    private func setInputDevice(_ deviceId: AudioDeviceID) throws {
        guard let audioUnit = audioEngine?.inputNode.audioUnit else {
            throw MicrophoneError.noAudioUnit
        }

        var deviceIdVar = deviceId
        let status = AudioUnitSetProperty(
            audioUnit,
            kAudioOutputUnitProperty_CurrentDevice,
            kAudioUnitScope_Global,
            0,
            &deviceIdVar,
            UInt32(MemoryLayout<AudioDeviceID>.size)
        )

        if status != noErr {
            throw MicrophoneError.deviceSetFailed(status)
        }
    }

    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer, inputSampleRate: Double) {
        guard let floatData = buffer.floatChannelData else { return }

        let frameCount = Int(buffer.frameLength)
        let channelCount = Int(buffer.format.channelCount)

        // Mix channels to mono if needed
        var monoSamples = [Float](repeating: 0, count: frameCount)
        for frame in 0..<frameCount {
            var sum: Float = 0
            for channel in 0..<channelCount {
                sum += floatData[channel][frame]
            }
            monoSamples[frame] = sum / Float(channelCount)
        }

        // Resample if needed
        let samples: [Float]
        if inputSampleRate != targetSampleRate {
            samples = resample(monoSamples, from: inputSampleRate, to: targetSampleRate)
        } else {
            samples = monoSamples
        }

        // Calculate level
        currentLevel = calculateLevel(samples)

        // Call callback
        onAudioSamples?(samples)
    }

    private func resample(_ samples: [Float], from inputRate: Double, to outputRate: Double) -> [Float] {
        let ratio = outputRate / inputRate
        let outputCount = Int(Double(samples.count) * ratio)
        var output = [Float](repeating: 0, count: outputCount)

        for i in 0..<outputCount {
            let srcIndex = Double(i) / ratio
            let srcIndexInt = Int(srcIndex)
            let frac = Float(srcIndex - Double(srcIndexInt))

            if srcIndexInt + 1 < samples.count {
                output[i] = samples[srcIndexInt] * (1 - frac) + samples[srcIndexInt + 1] * frac
            } else if srcIndexInt < samples.count {
                output[i] = samples[srcIndexInt]
            }
        }

        return output
    }

    private func calculateLevel(_ samples: [Float]) -> Float {
        guard !samples.isEmpty else { return 0 }
        let sumSquares = samples.reduce(0) { $0 + $1 * $1 }
        let rms = sqrt(sumSquares / Float(samples.count))
        return min(1.0, rms * 3)
    }
}

struct AudioDevice: Codable {
    let id: String
    let name: String
    let isDefault: Bool
}

enum MicrophoneError: Error, LocalizedError {
    case engineCreationFailed
    case noAudioUnit
    case deviceSetFailed(OSStatus)
    case permissionDenied

    var errorDescription: String? {
        switch self {
        case .engineCreationFailed:
            return "Failed to create audio engine"
        case .noAudioUnit:
            return "No audio unit available"
        case .deviceSetFailed(let status):
            return "Failed to set input device (status: \(status))"
        case .permissionDenied:
            return "Microphone permission denied. Please grant permission in System Settings > Privacy & Security > Microphone"
        }
    }
}
