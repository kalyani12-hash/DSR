import http.server
import socketserver
import json
import os
import mimetypes
from datetime import datetime

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Ensure common real estate web mime types
mimetypes.add_type("video/mp4", ".mp4")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

LEADS_FILE = os.path.join(DIRECTORY, "leads.json")

class CielRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        if self.path == "/api/lead":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                data = json.loads(body)
            except Exception:
                data = {"raw": body}
            
            data["received_at"] = datetime.now().isoformat()
            print(f"\n[LEAD RECEIVED] Name: {data.get('name', 'N/A')}, Phone: {data.get('phone', 'N/A')}, Source: {data.get('source', 'N/A')}")
            
            # Save to leads.json
            leads = []
            if os.path.exists(LEADS_FILE):
                try:
                    with open(LEADS_FILE, "r", encoding="utf-8") as f:
                        leads = json.load(f)
                except Exception:
                    leads = []
            leads.append(data)
            with open(LEADS_FILE, "w", encoding="utf-8") as f:
                json.dump(leads, f, indent=2)

            # Return success response
            response = json.dumps({"ok": True, "message": "Thank you! We have received your inquiry."}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(response)
        else:
            self.send_error(404, "Not Found")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), CielRequestHandler) as httpd:
        print(f"=====================================================")
        print(f" CIEL by DSR - Local Development Server")
        print(f" Running at: http://localhost:{PORT}")
        print(f" Serving directory: {DIRECTORY}")
        print(f" Leads will be saved to: {LEADS_FILE}")
        print(f" Press Ctrl+C to stop the server")
        print(f"=====================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

