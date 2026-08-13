import http.server
import json
import os
import socket
import threading
import webbrowser

PORT = 8000
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "queue_state.json")
STATE_LOCK = threading.Lock()

DEFAULT_STATE = {
    "queue": [
        {"token":"A18","service":"Certificates","status":"Completed","time":"10:05 AM"},
        {"token":"A19","service":"Fees Payment","status":"Completed","time":"10:10 AM"},
        {"token":"A20","service":"Certificates","status":"Serving","time":"10:15 AM"},
        {"token":"A21","service":"Certificates","status":"Waiting","time":"10:16 AM"},
        {"token":"A22","service":"Certificates","status":"Waiting","time":"10:17 AM"},
        {"token":"A23","service":"ID Card","status":"Waiting","time":"10:18 AM"},
        {"token":"A24","service":"Exam Forms","status":"Waiting","time":"10:19 AM"}
    ],
    "history": []
}

def load_state():
    if not os.path.exists(STATE_FILE):
        save_state(DEFAULT_STATE)
        return DEFAULT_STATE.copy()
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            state = json.load(f)
        if not isinstance(state.get("queue"), list):
            raise ValueError("Invalid queue state")
        state.setdefault("history", [])
        return state
    except Exception:
        save_state(DEFAULT_STATE)
        return DEFAULT_STATE.copy()

def save_state(state):
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)
    os.replace(tmp, STATE_FILE)

class QueueHandler(http.server.SimpleHTTPRequestHandler):
    def _send_json(self, status, data):
        raw = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/state":
            with STATE_LOCK:
                self._send_json(200, load_state())
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/state":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length)
                incoming = json.loads(body.decode("utf-8"))
                queue = incoming.get("queue")
                history = incoming.get("history", [])
                if not isinstance(queue, list) or not isinstance(history, list):
                    raise ValueError("queue/history must be arrays")
                state = {"queue": queue, "history": history}
                with STATE_LOCK:
                    save_state(state)
                self._send_json(200, state)
            except Exception as e:
                self._send_json(400, {"error": str(e)})
            return
        self.send_error(404)

    def log_message(self, fmt, *args):
        # Keep the console readable; API calls are intentionally quiet.
        if not self.path.startswith("/api/"):
            super().log_message(fmt, *args)

def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()

class ReusableTCPServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True

ip = local_ip()
server = ReusableTCPServer(("0.0.0.0", PORT), QueueHandler)

print()
print("==============================================")
print(" Smart College Queue - Shared Queue Server")
print("==============================================")
print(f"Admin / this computer: http://127.0.0.1:{PORT}/")
print(f"Student phones on same Wi-Fi: http://{ip}:{PORT}/")
print()
print("IMPORTANT:")
print("  - Keep this server running while the queue is in use.")
print("  - Admin and student phones must open the LAN URL above.")
print("  - Do NOT use the GitHub Pages URL for live shared queue testing.")
print("  - The shared queue is saved in queue_state.json.")
print()
print("Press Ctrl+C to stop the server.")
print("==============================================")
print()

webbrowser.open(f"http://127.0.0.1:{PORT}/")
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
finally:
    server.server_close()
