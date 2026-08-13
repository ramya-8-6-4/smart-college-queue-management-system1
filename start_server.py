import http.server
import socket
import webbrowser

PORT = 8000

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
server = ReusableTCPServer(("0.0.0.0", PORT), http.server.SimpleHTTPRequestHandler)

print()
print("==============================================")
print(" Smart College Queue - Local Network Server")
print("==============================================")
print(f"On this computer: http://127.0.0.1:{PORT}/")
print(f"On the same Wi-Fi/LAN: http://{ip}:{PORT}/")
print()
print("Open the LAN address above on your phone/computer.")
print("The QR code in the app will automatically use that LAN address.")
print("Students must be connected to the SAME Wi-Fi/LAN as this computer.")
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
