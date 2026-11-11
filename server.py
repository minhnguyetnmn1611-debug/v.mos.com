import os
import sys
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class ReliableHTTPServer(ThreadingHTTPServer):
    address_family = socket.AF_INET
    daemon_threads = True
    # On Windows SO_REUSEADDR lets two processes bind the same port, so keep it off there.
    allow_reuse_address = sys.platform != 'win32'


class CustomHandler(SimpleHTTPRequestHandler):
    # --- HTTP Range support (needed so browsers can seek inside <video>) ---
    def send_head(self):
        self._range = None
        rng = self.headers.get('Range')
        path = self.translate_path(self.path)
        if not rng or not os.path.isfile(path) or not rng.startswith('bytes='):
            return super().send_head()
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None
        size = os.fstat(f.fileno()).st_size
        try:
            start_s, end_s = rng[6:].split(',')[0].strip().split('-')
            if start_s == '':                       # suffix range: last N bytes
                start, end = max(0, size - int(end_s)), size - 1
            else:
                start = int(start_s)
                end = int(end_s) if end_s else size - 1
            end = min(end, size - 1)
            if start > end or start >= size:
                raise ValueError
        except ValueError:
            f.close()
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.end_headers()
            return None
        self._range = (start, end)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        f.seek(start)
        return f

    def copyfile(self, source, outputfd):
        rng = getattr(self, '_range', None)
        if not rng:
            return super().copyfile(source, outputfd)
        remaining = rng[1] - rng[0] + 1
        while remaining > 0:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfd.write(chunk)
            remaining -= len(chunk)

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        # Allow CORS & Cache Control for dev
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def handle_one_request(self):
        # Gracefully handle dropped/cancelled HTTP requests
        try:
            super().handle_one_request()
        except (ConnectionResetError, BrokenPipeError):
            pass


if __name__ == '__main__':
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    start_port = 8000
    # Mặc định chỉ nghe trên máy này. Muốn thử trên điện thoại cùng Wi-Fi: đặt biến môi trường VMOS_HOST=0.0.0.0
    host = os.environ.get('VMOS_HOST', '127.0.0.1')
    httpd = None
    port = start_port

    # Never kill other programs: if the port is busy, just try the next one.
    for port in range(start_port, start_port + 11):
        try:
            httpd = ReliableHTTPServer((host, port), CustomHandler)
            break
        except OSError:
            print(f"Port {port} is busy, trying {port + 1}...")

    if httpd is None:
        sys.exit(f"No free port found in range {start_port}-{start_port + 10}.")

    print(f"Server started at http://localhost:{port} and http://127.0.0.1:{port}")
    print(f"Serving files from: {web_dir}")
    try:
        import webbrowser
        webbrowser.open(f"http://localhost:{port}")
    except Exception:
        pass
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        httpd.server_close()