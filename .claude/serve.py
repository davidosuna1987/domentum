# Dev server: static files with caching disabled and correct audio/manifest types.
import http.server, sys

class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.m4a': 'audio/mp4', '.webmanifest': 'application/manifest+json', '.js': 'text/javascript'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
