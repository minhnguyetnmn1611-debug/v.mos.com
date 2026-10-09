import os
import sys
import socket
import subprocess
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


def kill_process_on_port(port):
    """Find and kill any process listening on the target port (Windows & Cross-platform)."""
    try:
        if sys.platform == 'win32':
            output = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True, text=True)
            pids = set()
            for line in output.strip().splitlines():
                parts = line.split()
                if len(parts) >= 5 and ('LISTENING' in line or 'ESTABLISHED' in line):
                    pids.add(parts[-1])
            for pid in pids:
                if pid != '0' and str(os.getpid()) != pid:
                    subprocess.run(f'taskkill /PID {pid} /F', shell=True, capture_output=True)
    except Exception:
        pass


class ReliableHTTPServer(ThreadingHTTPServer):
    address_family = socket.AF_INET
    daemon_threads = True
    allow_reuse_address = False  # Set to False on Windows to prevent dual-process port hijacking


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
        self.send_header('Accept-Ranges', 'bytes')
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

    def log_message(self, format, *args):
        super().log_message(format, *args)


if __name__ == '__main__':
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    port = 8000
    server_address = ('0.0.0.0', port)

    # First clean up any leftover zombie processes on port 8000
    kill_process_on_port(port)

    try:
        httpd = ReliableHTTPServer(server_address, CustomHandler)
    except OSError:
        # Retry once after forceful cleanup
        kill_process_on_port(port)
        httpd = ReliableHTTPServer(server_address, CustomHandler)

    print(f"Server started at http://localhost:{port} and http://127.0.0.1:{port}")
    print(f"Serving files from: {web_dir}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        httpd.server_close()
