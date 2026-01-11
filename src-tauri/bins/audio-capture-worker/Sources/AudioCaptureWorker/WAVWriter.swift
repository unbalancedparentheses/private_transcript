import Foundation

/// Writes PCM audio samples to a WAV file
class WAVWriter {
    private let fileHandle: FileHandle
    private let sampleRate: Int
    private let channels: Int
    private let bitsPerSample: Int = 16
    private var dataSize: UInt32 = 0
    private let headerSize: UInt32 = 44
    private let filePath: String

    init(path: String, sampleRate: Int = 16000, channels: Int = 1) throws {
        self.filePath = path
        self.sampleRate = sampleRate
        self.channels = channels

        // Create file and write placeholder header
        FileManager.default.createFile(atPath: path, contents: nil)
        self.fileHandle = try FileHandle(forWritingTo: URL(fileURLWithPath: path))

        // Write placeholder header (will be updated on finalize)
        try writeHeader()
    }

    /// Write f32 samples (-1.0 to 1.0) to the WAV file
    func writeSamples(_ samples: [Float]) throws {
        var data = Data(capacity: samples.count * 2)

        for sample in samples {
            // Clamp and convert to Int16
            let clamped = max(-1.0, min(1.0, sample))
            let int16Value = Int16(clamped * Float(Int16.max))

            // Little-endian
            var value = int16Value.littleEndian
            data.append(contentsOf: withUnsafeBytes(of: &value) { Array($0) })
        }

        try fileHandle.write(contentsOf: data)
        dataSize += UInt32(data.count)
    }

    /// Finalize the WAV file by updating the header with correct sizes
    func finalize() throws {
        // Seek to beginning and rewrite header with correct sizes
        try fileHandle.seek(toOffset: 0)
        try writeHeader()
        try fileHandle.close()
    }

    private func writeHeader() throws {
        var header = Data(capacity: Int(headerSize))

        // RIFF header
        header.append(contentsOf: "RIFF".utf8)
        header.append(contentsOf: uint32ToBytes(dataSize + headerSize - 8)) // File size - 8
        header.append(contentsOf: "WAVE".utf8)

        // fmt subchunk
        header.append(contentsOf: "fmt ".utf8)
        header.append(contentsOf: uint32ToBytes(16)) // Subchunk1 size (16 for PCM)
        header.append(contentsOf: uint16ToBytes(1))  // Audio format (1 = PCM)
        header.append(contentsOf: uint16ToBytes(UInt16(channels)))
        header.append(contentsOf: uint32ToBytes(UInt32(sampleRate)))

        let byteRate = UInt32(sampleRate * channels * bitsPerSample / 8)
        header.append(contentsOf: uint32ToBytes(byteRate))

        let blockAlign = UInt16(channels * bitsPerSample / 8)
        header.append(contentsOf: uint16ToBytes(blockAlign))
        header.append(contentsOf: uint16ToBytes(UInt16(bitsPerSample)))

        // data subchunk
        header.append(contentsOf: "data".utf8)
        header.append(contentsOf: uint32ToBytes(dataSize))

        try fileHandle.write(contentsOf: header)
    }

    private func uint32ToBytes(_ value: UInt32) -> [UInt8] {
        var v = value.littleEndian
        return withUnsafeBytes(of: &v) { Array($0) }
    }

    private func uint16ToBytes(_ value: UInt16) -> [UInt8] {
        var v = value.littleEndian
        return withUnsafeBytes(of: &v) { Array($0) }
    }
}
