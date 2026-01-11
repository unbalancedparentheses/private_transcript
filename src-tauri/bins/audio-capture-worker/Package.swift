// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "AudioCaptureWorker",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "audio-capture-worker", targets: ["AudioCaptureWorker"])
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-argument-parser.git", from: "1.3.0")
    ],
    targets: [
        .executableTarget(
            name: "AudioCaptureWorker",
            dependencies: [
                .product(name: "ArgumentParser", package: "swift-argument-parser")
            ],
            path: "Sources/AudioCaptureWorker"
        )
    ]
)
