# Trang "Truy vấn SQL": đọc các câu truy vấn mẫu từ database/queries.sql và chạy (chỉ đọc).
import re
import time
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

import psycopg
from fastapi import APIRouter, HTTPException

from app.database import engine

router = APIRouter(prefix="/queries", tags=["queries"])

QUERY_FILE = Path(__file__).resolve().parents[2] / "database" / "queries.sql"
TAG = re.compile(r"^--\s*@(id|title|desc):\s*(.*)$")


def load_queries() -> list[dict]:
    """Đọc file mỗi lần gọi. Khối bắt đầu ở dòng '-- @id:', phần trước khối đầu là header (bỏ qua)."""
    queries: list[dict] = []
    cur: dict | None = None
    sql_lines: list[str] = []

    def finish():
        if cur is not None:
            cur["sql"] = "\n".join(sql_lines).strip().rstrip(";").rstrip()
            queries.append(cur)

    for line in QUERY_FILE.read_text(encoding="utf-8").splitlines():
        m = TAG.match(line.strip())
        if m and m.group(1) == "id":
            finish()
            cur, sql_lines = {"id": m.group(2).strip(), "title": "", "desc": "", "sql": ""}, []
        elif cur is None:
            continue
        elif m and not sql_lines:  # các dòng @title / @desc nằm trước SQL
            if m.group(1) == "title":
                cur["title"] = m.group(2).strip()
            else:
                cur["desc"] = f"{cur['desc']} {m.group(2).strip()}".strip()
        else:
            sql_lines.append(line)
    finish()
    return queries


def json_safe(v):
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


@router.get("", summary="Danh sách truy vấn mẫu")
def list_queries():
    return load_queries()


@router.get("/{query_id}/run", summary="Chạy một truy vấn (chỉ đọc)")
def run_query(query_id: str):
    q = next((x for x in load_queries() if x["id"] == query_id), None)
    if q is None:
        raise HTTPException(404, "Không tìm thấy truy vấn")
    with engine.connect() as conn:
        try:
            # dùng cursor thô của psycopg, không truyền tham số: ':name' và '%' trong SQL được giữ nguyên
            cur = conn.connection.cursor()
            cur.execute("SET TRANSACTION READ ONLY")
            cur.execute("SET LOCAL statement_timeout = '5s'")
            start = time.perf_counter()
            cur.execute(q["sql"])
            data = [[json_safe(v) for v in r] for r in cur.fetchall()]
            elapsed = (time.perf_counter() - start) * 1000
            columns = [c.name for c in cur.description]
        except psycopg.Error as e:
            msg = e.diag.message_primary or str(e)
            raise HTTPException(400, msg.strip())
        finally:
            conn.rollback()
    return {"columns": columns, "rows": data, "row_count": len(data), "elapsed_ms": round(elapsed, 2)}
