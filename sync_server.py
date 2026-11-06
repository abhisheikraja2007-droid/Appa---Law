from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(DIRECTORY, "office_sync_payload.json")

class OfficeSyncHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == "/sync":
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    content = f.read()
            else:
                content = json.dumps({"status": "empty", "payload": None})

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(content.encode("utf-8"))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == "/sync":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)

            try:
                parsed = json.loads(post_data.decode("utf-8"))
                with open(DATA_FILE, "w", encoding="utf-8") as f:
                    json.dump(parsed, f, indent=2)

                response_data = json.dumps({"status": "success", "message": "Synced successfully"})
                self.send_response(200)
            except Exception as e:
                response_data = json.dumps({"status": "error", "message": str(e)})
                self.send_response(400)

            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(response_data.encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

def run(host="0.0.0.0", port=PORT):
    server_address = (host, port)
    httpd = HTTPServer(server_address, OfficeSyncHandler)
    print(f"Diligent in Law Office Workstation running on http://{host}:{port} (LAN & Localhost)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == "__main__":
    p = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run(port=p)
