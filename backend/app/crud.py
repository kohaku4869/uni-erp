from datetime import date

from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy import select

from app import models as m
from app import schemas as s
from app.database import DbSession


def make_crud_router(prefix: str, model, create_schema, update_schema) -> APIRouter:
    """Sinh 5 route (list/get/create/update/delete) cho một bảng."""
    router = APIRouter(prefix=f"/{prefix}", tags=[prefix])
    pk_cols = list(model.__table__.primary_key.columns)  # khoá chính (có thể là khoá ghép)
    pk_names = [c.name for c in pk_cols]

    def commit(db):
        try:
            db.commit()
        except Exception:
            db.rollback()  # lỗi (vd IntegrityError) -> huỷ giao dịch, handler trong main.py trả lỗi
            raise

    def find(db, pk: str):
        """'2025-09-08/1/LHP001' -> tìm bản ghi theo khoá chính; không thấy -> 404."""
        parts = pk.split("/")
        try:
            if len(parts) != len(pk_cols):
                raise ValueError
            key = [date.fromisoformat(p) if c.type.python_type is date
                   else c.type.python_type(p) for c, p in zip(pk_cols, parts)]
        except ValueError:
            raise HTTPException(404, f"Không tìm thấy {prefix}")
        obj = db.get(model, key[0] if len(key) == 1 else tuple(key))
        if obj is None:
            raise HTTPException(404, f"Không tìm thấy {prefix}")
        return obj

    @router.get("", response_model=list[create_schema], summary=f"Danh sách {prefix}")
    def list_items(db: DbSession, skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000)):
        return db.scalars(select(model).order_by(*pk_cols).offset(skip).limit(limit)).all()

    @router.get("/{pk:path}", response_model=create_schema, summary=f"Lấy một {prefix}")
    def get_item(pk: str, db: DbSession):
        return find(db, pk)

    @router.post("", response_model=create_schema, status_code=201, summary=f"Tạo {prefix}")
    def create_item(body: create_schema, db: DbSession):
        data = body.model_dump()
        if data.get("ngay_dk") is None:
            data.pop("ngay_dk", None)  # để DB tự điền DEFAULT CURRENT_TIMESTAMP
        obj = model(**data)
        db.add(obj)
        commit(db)
        db.refresh(obj)
        return obj

    @router.put("/{pk:path}", response_model=create_schema, summary=f"Cập nhật {prefix}")
    def update_item(pk: str, body: update_schema, db: DbSession):
        obj = find(db, pk)
        for key, value in body.model_dump(exclude_unset=True).items():
            if key not in pk_names:  # không cho đổi khoá chính
                setattr(obj, key, value)
        commit(db)
        db.refresh(obj)
        return obj

    @router.delete("/{pk:path}", status_code=204, response_class=Response, summary=f"Xoá {prefix}")
    def delete_item(pk: str, db: DbSession):
        db.delete(find(db, pk))
        commit(db)
        return Response(status_code=204)

    return router


# (url, model, Create, Update)
RESOURCES = [
    ("khoa", m.Khoa, s.KhoaCreate, s.KhoaUpdate),
    ("nganh", m.Nganh, s.NganhCreate, s.NganhUpdate),
    ("giang-vien", m.GiangVien, s.GiangVienCreate, s.GiangVienUpdate),
    ("lop-hanh-chinh", m.LopHanhChinh, s.LopHanhChinhCreate, s.LopHanhChinhUpdate),
    ("sinh-vien", m.SinhVien, s.SinhVienCreate, s.SinhVienUpdate),
    ("hoc-ky", m.HocKy, s.HocKyCreate, s.HocKyUpdate),
    ("hoc-phan", m.HocPhan, s.HocPhanCreate, s.HocPhanUpdate),
    ("phong-hoc", m.PhongHoc, s.PhongHocCreate, s.PhongHocUpdate),
    ("lop-hoc-phan", m.LopHocPhan, s.LopHocPhanCreate, s.LopHocPhanUpdate),
    ("lich", m.Lich, s.LichCreate, s.LichUpdate),
    ("dang-ki", m.DangKi, s.DangKiCreate, s.DangKiUpdate),
    ("chuong-trinh-dao-tao", m.ChuongTrinhDaoTao, s.ChuongTrinhDaoTaoCreate, s.ChuongTrinhDaoTaoUpdate),
    ("tien-quyet", m.TienQuyet, s.TienQuyetCreate, s.TienQuyetUpdate),
    ("ren-luyen", m.RenLuyen, s.RenLuyenCreate, s.RenLuyenUpdate),
    ("hoc-phi", m.HocPhi, s.HocPhiCreate, s.HocPhiUpdate),
    ("canh-bao", m.CanhBao, s.CanhBaoCreate, s.CanhBaoUpdate),
]

routers = [make_crud_router(*r) for r in RESOURCES]
