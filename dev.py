"""Chạy toàn bộ môi trường dev: PostgreSQL (Docker) + backend (FastAPI) + frontend (Vite).

Cách dùng (ở thư mục gốc):
    python dev.py              # chạy cả 3
    python dev.py --stop-db    # khi Ctrl+C thì tắt luôn container DB

Nhấn Ctrl+C để dừng backend và frontend.
"""
import argparse
import os
import shutil
import signal
import socket
import subprocess
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
IS_WIN = os.name == "nt"

RESET = "\033[0m"
COLORS = {"db": "\033[35m", "api": "\033[36m", "web": "\033[32m", "dev": "\033[33m"}


def log(tag: str, msg: str) -> None:
    print(f"{COLORS[tag]}[{tag:>3}]{RESET} {msg}", flush=True)


def require(cmd: str) -> str:
    path = shutil.which(cmd)
    if not path:
        log("dev", f"Không tìm thấy lệnh '{cmd}'. Hãy cài đặt rồi chạy lại.")
        sys.exit(1)
    return path


def run_once(tag: str, args: list[str], cwd: Path) -> None:
    """Chạy một lệnh chuẩn bị, dừng script nếu lỗi."""
    log(tag, " ".join(Path(args[0]).stem if i == 0 else a for i, a in enumerate(args)))
    if subprocess.run(args, cwd=cwd).returncode != 0:
        log(tag, "Lệnh thất bại, dừng lại.")
        sys.exit(1)


def start_db(docker: str) -> None:
    if subprocess.run([docker, "info"], capture_output=True).returncode != 0:
        log("db", "Docker chưa chạy. Hãy mở Docker Desktop rồi thử lại.")
        sys.exit(1)
    run_once("db", [docker, "compose", "up", "-d", "--wait"], ROOT)
    log("db", "PostgreSQL sẵn sàng tại localhost:5433")


def check_ports(*ports: int) -> None:
    def in_use(port: int) -> bool:
        # Kiểm tra cả IPv4 (127.0.0.1) và IPv6 (::1) — Vite trên Windows thường chỉ nghe ở ::1
        for host in ("127.0.0.1", "::1"):
            try:
                with socket.create_connection((host, port), timeout=0.5):
                    return True
            except OSError:
                pass
        return False

    busy = [p for p in ports if in_use(p)]
    if busy:
        log("dev", f"Cổng {', '.join(map(str, busy))} đang bị chiếm (có thể bạn đã chạy "
                   "backend/frontend ở terminal khác). Hãy tắt chúng rồi chạy lại.")
        sys.exit(1)


def prepare(npm: str) -> None:
    env_file, example = BACKEND / ".env", BACKEND / ".env.example"
    if not env_file.exists() and example.exists():
        shutil.copy(example, env_file)
        log("api", "Đã tạo backend/.env từ .env.example")
    if not (FRONTEND / "node_modules").exists():
        run_once("web", [npm, "install"], FRONTEND)


def spawn(tag: str, args: list[str], cwd: Path) -> subprocess.Popen:
    env = {**os.environ, "PYTHONUNBUFFERED": "1", "FORCE_COLOR": "1"}
    proc = subprocess.Popen(
        args, cwd=cwd, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        encoding="utf-8", errors="replace",
        # Tách process group để có thể dừng cả cây tiến trình con (uvicorn --reload, vite)
        start_new_session=not IS_WIN,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if IS_WIN else 0,
    )

    def pump() -> None:
        for line in proc.stdout:
            log(tag, line.rstrip())
        log(tag, f"đã dừng (exit code {proc.wait()})")

    threading.Thread(target=pump, daemon=True).start()
    return proc


def kill_tree(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    if IS_WIN:
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)], capture_output=True)
    else:
        try:
            os.killpg(proc.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()


def main() -> None:
    parser = argparse.ArgumentParser(description="Chạy DB + backend + frontend")
    parser.add_argument("--stop-db", action="store_true", help="tắt container DB khi thoát")
    opts = parser.parse_args()

    if IS_WIN:
        os.system("")  # bật hiển thị màu ANSI trên console Windows

    docker, uv, npm = require("docker"), require("uv"), require("npm")
    check_ports(8000, 5173)
    start_db(docker)
    prepare(npm)

    procs = [
        spawn("api", [uv, "run", "uvicorn", "app.main:app", "--reload", "--port", "8000"], BACKEND),
        spawn("web", [npm, "run", "dev", "--", "--port", "5173", "--strictPort"], FRONTEND),
    ]
    log("dev", "Frontend: http://localhost:5173  |  API docs: http://localhost:8000/docs")
    log("dev", "Nhấn Ctrl+C để dừng.")

    try:
        # Thoát khi bất kỳ tiến trình nào chết (vd: trùng cổng) hoặc khi nhấn Ctrl+C
        while all(p.poll() is None for p in procs):
            threading.Event().wait(0.5)
        log("dev", "Một tiến trình đã dừng, đang tắt phần còn lại...")
    except KeyboardInterrupt:
        log("dev", "Đang dừng...")
    finally:
        for p in procs:
            kill_tree(p)
        if opts.stop_db:
            subprocess.run([docker, "compose", "stop"], cwd=ROOT)
            log("db", "Đã tắt container DB")
        else:
            log("db", "Container DB vẫn chạy (tắt bằng: docker compose stop)")


if __name__ == "__main__":
    main()
