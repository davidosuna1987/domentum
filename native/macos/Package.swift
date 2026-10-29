// swift-tools-version:5.9
// Domentum for Mac: the web player (../../app) in a native window. Build with `node build.mjs`.
import PackageDescription

let package = Package(
    name: "Domentum",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(name: "Domentum", path: "Sources/Domentum"),
    ]
)
