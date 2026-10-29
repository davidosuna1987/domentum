// Domentum for Mac: the same player as the website and the phone apps, in a native window with WebKit (Safari's
// engine). The player's files are inside the app (Contents/Resources/www) and are served under domentum://app/,
// so everything works offline. The title bar takes the theme's colour; zen mode can go full screen.
import AppKit
import CoreAudio
import UniformTypeIdentifiers
import WebKit

let scheme = "domentum"
let www = Bundle.main.resourceURL!.appendingPathComponent("www")

// ---- Serves the bundled player under domentum://app/<path> ----
final class Files: NSObject, WKURLSchemeHandler {
    static let types: [String: String] = [
        "html": "text/html", "js": "text/javascript", "mjs": "text/javascript", "css": "text/css", "json": "application/json",
        "svg": "image/svg+xml", "png": "image/png", "jpg": "image/jpeg", "webp": "image/webp", "woff2": "font/woff2",
        "m4a": "audio/mp4", "mp3": "audio/mpeg", "wav": "audio/wav", "ico": "image/x-icon", "txt": "text/plain",
    ]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return task.didFailWithError(URLError(.badURL)) }
        var path = url.path.isEmpty || url.path == "/" ? "/index.html" : url.path
        if path.hasSuffix("/") { path += "index.html" }
        let file = www.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard file.path.hasPrefix(www.standardizedFileURL.path), let data = try? Data(contentsOf: file) else {
            let r = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "text/plain"])!
            task.didReceive(r)
            task.didReceive(Data("not found".utf8))
            return task.didFinish()
        }
        let type = Files.types[file.pathExtension.lowercased()] ?? "application/octet-stream"
        let headers = ["Content-Type": type, "Content-Length": String(data.count), "Cache-Control": "no-cache"]
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

final class Player: NSObject, NSApplicationDelegate, NSWindowDelegate, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var web: WKWebView!
    let files = Files()
    var output: OutputWatch?
    let args = ProcessInfo.processInfo.arguments

    func arg(_ name: String) -> String? {
        guard let i = args.firstIndex(of: name), i + 1 < args.count else { return nil }
        return args[i + 1]
    }

    func applicationDidFinishLaunching(_ note: Notification) {
        buildMenu()
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(files, forURLScheme: scheme)
        config.mediaTypesRequiringUserActionForPlayback = []
        config.preferences.isElementFullscreenEnabled = true
        let user = config.userContentController
        // tells the player it runs inside the Mac app; reports the theme colour so the title bar can follow it
        user.addUserScript(WKUserScript(source: """
            window.domentumShell = 'mac';
            window.__errs = [];
            addEventListener('error', e => window.__errs.push(String(e.message)));
            addEventListener('DOMContentLoaded', () => {
              const send = () => webkit.messageHandlers.chrome.postMessage({
                color: document.querySelector('meta[name=theme-color]')?.content || '',
                dark: document.documentElement.dataset.scheme === 'dark',
              });
              send();
              new MutationObserver(send).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['content', 'data-scheme'] });
            });
            """, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        // tests (--snapshot): a throwaway data store, so the real app's saved state is never touched
        if arg("--snapshot") != nil { config.websiteDataStore = .nonPersistent() }
        if let seed = arg("--seed") {
            // tests only: start from a given saved state (e.g. the volume at 0)
            user.addUserScript(WKUserScript(source: "localStorage.setItem('domentum:v1', \(seed.debugDescription));", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        user.add(self, name: "chrome")

        web = WKWebView(frame: .zero, configuration: config)
        web.uiDelegate = self
        web.navigationDelegate = self
        web.setValue(false, forKey: "drawsBackground")
        #if DEBUG
        web.isInspectable = true
        #endif

        let size = arg("--size").flatMap { s -> NSSize? in
            let p = s.split(separator: "x").compactMap { Double($0) }
            return p.count == 2 ? NSSize(width: p[0], height: p[1]) : nil
        } ?? NSSize(width: 1240, height: 820)
        window = NSWindow(contentRect: NSRect(origin: .zero, size: size),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Domentum"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.backgroundColor = NSColor(red: 0.957, green: 0.941, blue: 0.902, alpha: 1)
        window.minSize = NSSize(width: 380, height: 560)
        window.contentView = web
        window.delegate = self
        window.collectionBehavior = [.fullScreenPrimary]
        if arg("--snapshot") == nil { window.setFrameAutosaveName("Domentum") }
        if !window.setFrameUsingName("Domentum") { window.center() }
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // the player pauses at once if the sound would jump to the speakers
        output = OutputWatch { [weak self] in self?.outputLost() }

        let query = arg("--query") ?? ""
        web.load(URLRequest(url: URL(string: "\(scheme)://app/index.html\(query)")!))
    }

    // the title bar follows the theme: its colour and light/dark
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let m = message.body as? [String: Any] else { return }
        if let hex = m["color"] as? String, let color = NSColor(hex: hex) { window.backgroundColor = color }
        window.appearance = NSAppearance(named: (m["dark"] as? Bool) == true ? .darkAqua : .aqua)
    }

    // tests: `--snapshot out.png` saves what the window shows (and out.json with page errors), then quits
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard let out = arg("--snapshot") else { return }
        let wait = Double(arg("--wait") ?? "2.5") ?? 2.5
        DispatchQueue.main.asyncAfter(deadline: .now() + wait) {
            if self.arg("--test-output-lost") != nil {
                webView.evaluateJavaScript("document.querySelector('#playBtn').click(); window.__before = document.querySelector('#playBtn').getAttribute('aria-label'); true") { _, _ in
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                        self.outputLost()
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                            webView.evaluateJavaScript("JSON.stringify({ before: window.__before, after: document.querySelector('#playBtn').getAttribute('aria-label'), toast: document.querySelector('#toast').textContent })") { r, _ in
                                try? (r as? String ?? "{}").write(toFile: out.replacingOccurrences(of: ".png", with: ".json"), atomically: true, encoding: .utf8)
                                NSApp.terminate(nil)
                            }
                        }
                    }
                }
                return
            }
            webView.evaluateJavaScript("JSON.stringify({ errs: window.__errs, theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme, title: document.querySelector('.now-title')?.textContent, shell: window.domentumShell, rows: [...document.querySelectorAll('.row b')].map(b => b.textContent) })") { result, _ in
                try? (result as? String ?? "{}").write(toFile: out.replacingOccurrences(of: ".png", with: ".json"), atomically: true, encoding: .utf8)
                webView.takeSnapshot(with: nil) { image, _ in
                    if let image, let tiff = image.tiffRepresentation, let png = NSBitmapImageRep(data: tiff)?.representation(using: .png, properties: [:]) {
                        try? png.write(to: URL(fileURLWithPath: out))
                    }
                    NSApp.terminate(nil)
                }
            }
        }
    }

    // links to the outside world (credits, GitHub…) open in the browser
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = action.request.url, url.scheme != scheme, url.scheme != "about", url.scheme != "blob", url.scheme != "data" {
            NSWorkspace.shared.open(url)
            return decisionHandler(.cancel)
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, createWebViewWith c: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url { NSWorkspace.shared.open(url) }
        return nil
    }

    // the player's "import audio" and its confirm/alert dialogs
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = false
        panel.allowedContentTypes = [.audio]
        panel.beginSheetModal(for: window) { completionHandler($0 == .OK ? panel.urls : nil) }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = NSAlert()
        a.messageText = message
        a.addButton(withTitle: "Aceptar")
        a.addButton(withTitle: "Cancelar")
        a.beginSheetModal(for: window) { completionHandler($0 == .alertFirstButtonReturn) }
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = NSAlert()
        a.messageText = message
        a.beginSheetModal(for: window) { _ in completionHandler() }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }

    func buildMenu() {
        let main = NSMenu()
        let appItem = NSMenuItem(); main.addItem(appItem)
        let app = NSMenu()
        app.addItem(withTitle: "Acerca de Domentum", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        app.addItem(.separator())
        app.addItem(withTitle: "Ocultar Domentum", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        app.addItem(.separator())
        app.addItem(withTitle: "Salir de Domentum", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = app

        let editItem = NSMenuItem(); main.addItem(editItem)
        let edit = NSMenu(title: "Edición")
        edit.addItem(withTitle: "Deshacer", action: Selector(("undo:")), keyEquivalent: "z")
        edit.addItem(withTitle: "Rehacer", action: Selector(("redo:")), keyEquivalent: "Z")
        edit.addItem(.separator())
        edit.addItem(withTitle: "Cortar", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: "Copiar", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "Pegar", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: "Seleccionar todo", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = edit

        let viewItem = NSMenuItem(); main.addItem(viewItem)
        let view = NSMenu(title: "Visualización")
        view.addItem(withTitle: "Recargar", action: #selector(reload), keyEquivalent: "r").target = self
        let full = view.addItem(withTitle: "Pantalla completa", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        full.keyEquivalentModifierMask = [.command, .control]
        viewItem.submenu = view

        let winItem = NSMenuItem(); main.addItem(winItem)
        let win = NSMenu(title: "Ventana")
        win.addItem(withTitle: "Minimizar", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        win.addItem(withTitle: "Cerrar", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        winItem.submenu = win
        NSApp.windowsMenu = win
        NSApp.mainMenu = main
    }

    @objc func reload() { web.reload() }

    func outputLost() {
        web.evaluateJavaScript("dispatchEvent(new Event('domentum:output-lost'))")
    }
}

// ---- Headphones unplugged or Bluetooth gone: the output falls back to the Mac's own speakers ----
// macOS changes the default output device (Bluetooth, USB) or the built-in device's data source (the headphone
// jack), and calls `lost` when the sound would now come out of the speakers.
final class OutputWatch {
    private let lost: () -> Void
    private var device = AudioObjectID(0)
    private var onSpeakers = false
    private let system = AudioObjectID(kAudioObjectSystemObject)
    private var defaultAddr = AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyDefaultOutputDevice,
                                                         mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
    private var sourceAddr = AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyDataSource,
                                                        mScope: kAudioDevicePropertyScopeOutput, mElement: kAudioObjectPropertyElementMain)
    private lazy var onSource: AudioObjectPropertyListenerBlock = { [weak self] _, _ in self?.check() }

    init(lost: @escaping () -> Void) {
        self.lost = lost
        device = defaultDevice()
        onSpeakers = speakers(device)
        watchSource(of: device)
        AudioObjectAddPropertyListenerBlock(system, &defaultAddr, .main) { [weak self] _, _ in
            guard let self else { return }
            let now = self.defaultDevice()
            if now != self.device {
                self.unwatchSource(of: self.device)
                self.device = now
                self.watchSource(of: now)
            }
            self.check()
        }
    }

    private func check() {
        let now = speakers(device)
        if now && !onSpeakers { lost() }
        onSpeakers = now
    }

    private func defaultDevice() -> AudioObjectID {
        var id = AudioObjectID(0)
        var size = UInt32(MemoryLayout<AudioObjectID>.size)
        AudioObjectGetPropertyData(system, &defaultAddr, 0, nil, &size, &id)
        return id
    }

    // the built-in output with its speaker data source (not the headphone jack, not AirPods, not a monitor)
    private func speakers(_ id: AudioObjectID) -> Bool {
        var transport = UInt32(0)
        var size = UInt32(MemoryLayout<UInt32>.size)
        var addr = AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyTransportType,
                                              mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
        guard AudioObjectGetPropertyData(id, &addr, 0, nil, &size, &transport) == noErr, transport == kAudioDeviceTransportTypeBuiltIn else { return false }
        var source = UInt32(0)
        guard AudioObjectHasProperty(id, &sourceAddr), AudioObjectGetPropertyData(id, &sourceAddr, 0, nil, &size, &source) == noErr else { return true }
        return source == 0x6973_706B // 'ispk', internal speakers ('hdpn' is the headphone jack)
    }

    private func watchSource(of id: AudioObjectID) {
        if AudioObjectHasProperty(id, &sourceAddr) { AudioObjectAddPropertyListenerBlock(id, &sourceAddr, .main, onSource) }
    }

    private func unwatchSource(of id: AudioObjectID) {
        if AudioObjectHasProperty(id, &sourceAddr) { AudioObjectRemovePropertyListenerBlock(id, &sourceAddr, .main, onSource) }
    }
}

extension NSColor {
    convenience init?(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespaces)
        guard s.hasPrefix("#") else { return nil }
        s.removeFirst()
        if s.count == 3 { s = s.map { "\($0)\($0)" }.joined() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
        self.init(red: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255, blue: CGFloat(v & 0xFF) / 255, alpha: 1)
    }
}

let app = NSApplication.shared
let player = Player()
app.delegate = player
app.setActivationPolicy(.regular)
app.run()
