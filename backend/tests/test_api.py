"""Smoke test: cần DB đang chạy (docker compose up -d) và đã nạp seed."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_crud_errors():
    assert client.post("/api/khoa", json={"ma_khoa": "MT", "ten": "x"}).status_code == 409
    body = {"ma_nganh": "ZZ", "ten": "x", "ma_khoa": "NOPE"}
    assert client.post("/api/nganh", json=body).status_code == 400
    assert client.delete("/api/khoa/MT").status_code == 409
    assert client.get("/api/khoa/NOPE").status_code == 404
    assert client.get("/api/lich/not-a-date/1/X").status_code == 404  # sai kiểu / sai số phần khoá


def test_list_and_get():
    assert client.get("/api/khoa/MT").status_code == 200
    assert client.get("/api/dang-ki?limit=1").status_code == 200
    assert client.get("/api/lich?limit=1").status_code == 200


def test_validation_and_reports():
    assert client.post("/api/hoc-phan", json={"ma_hp": "Z", "ten": "x", "so_tc": 9}).status_code == 422
    assert client.get("/api/reports/bang-diem/NOPE").status_code == 404
    assert client.get("/api/reports/thong-ke").json()["khoa"] >= 3


def test_queries():
    lst = client.get("/api/queries").json()
    assert lst and {"id", "title", "desc", "sql"} <= set(lst[0])
    r = client.get(f"/api/queries/{lst[0]['id']}/run")
    assert r.status_code == 200 and r.json()["columns"]
    assert client.get("/api/queries/NOPE/run").status_code == 404
