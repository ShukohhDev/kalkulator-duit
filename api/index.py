import os
import sys

# Tambahkan server_python ke sys.path agar FastAPI mengenali database, models, dan routes
current_dir = os.path.dirname(__file__)
server_dir = os.path.abspath(os.path.join(current_dir, "..", "server_python"))
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

from main import app
