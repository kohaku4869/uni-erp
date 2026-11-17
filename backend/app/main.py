from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app import crud, queries, reports
from app.database import settings

app = FastAPI(title="University ERP API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(IntegrityError)
def integrity_error(request: Request, exc: IntegrityError):
    """Đổi lỗi ràng buộc của PostgreSQL (theo mã SQLSTATE) thành HTTP status + thông báo tiếng Việt."""
    state = getattr(exc.orig, "sqlstate", None)
    diag = getattr(exc.orig, "diag", None)
    msg = (getattr(diag, "message_detail", None) or getattr(diag, "message_primary", None)
           or str(exc.orig)).strip()
    if state == "23505":    # unique / trùng khoá chính
        code, detail = 409, f"Dữ liệu đã tồn tại (trùng khoá/unique): {msg}"
    elif state == "23503":  # khoá ngoại
        if request.method == "DELETE":
            code, detail = 409, f"Không thể xoá vì bản ghi đang được tham chiếu: {msg}"
        else:
            code, detail = 400, f"Khoá ngoại trỏ tới bản ghi không tồn tại: {msg}"
    elif state == "23514":  # CHECK
        code, detail = 400, f"Vi phạm ràng buộc CHECK: {msg}"
    elif state == "23502":  # NOT NULL
        code, detail = 400, f"Thiếu giá trị bắt buộc (NOT NULL): {msg}"
    else:
        code, detail = 400, f"Lỗi toàn vẹn dữ liệu: {msg}"
    return JSONResponse(status_code=code, content={"detail": detail})


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


app.include_router(reports.router, prefix="/api")
app.include_router(queries.router, prefix="/api")
for router in crud.routers:
    app.include_router(router, prefix="/api")
