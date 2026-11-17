# XxxCreate: đủ mọi cột (dùng cho POST và cũng là response).
# XxxUpdate: chỉ cột không phải khoá chính, tất cả tuỳ chọn (dùng cho PUT).
from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

# Điểm 0..10 (cho phép null)
Diem = Field(default=None, ge=0, le=10)


# ---------- Tổ chức ----------
class KhoaCreate(BaseModel):
    ma_khoa: str
    ten: str

class KhoaUpdate(BaseModel):
    ten: str | None = None


class NganhCreate(BaseModel):
    ma_nganh: str
    ten: str
    ma_khoa: str

class NganhUpdate(BaseModel):
    ten: str | None = None
    ma_khoa: str | None = None


class GiangVienCreate(BaseModel):
    ma_gv: str
    ten: str
    ma_khoa: str

class GiangVienUpdate(BaseModel):
    ten: str | None = None
    ma_khoa: str | None = None


class LopHanhChinhCreate(BaseModel):
    ma_lop: str
    ten_lop: str
    ma_nganh: str
    ma_cvht: str

class LopHanhChinhUpdate(BaseModel):
    ten_lop: str | None = None
    ma_nganh: str | None = None
    ma_cvht: str | None = None


class SinhVienCreate(BaseModel):
    ma_sv: str
    ten: str
    ngaysinh: date
    ma_lophc: str

class SinhVienUpdate(BaseModel):
    ten: str | None = None
    ngaysinh: date | None = None
    ma_lophc: str | None = None


# ---------- Đào tạo ----------
class HocKyCreate(BaseModel):
    ma_hk: str
    nam_hoc: str | None = None
    ky: int | None = None

class HocKyUpdate(BaseModel):
    nam_hoc: str | None = None
    ky: int | None = None


class HocPhanCreate(BaseModel):
    ma_hp: str
    ten: str
    so_tc: int = Field(ge=1, le=6)
    nhom_hp: str | None = None

class HocPhanUpdate(BaseModel):
    ten: str | None = None
    so_tc: int | None = Field(default=None, ge=1, le=6)
    nhom_hp: str | None = None


class PhongHocCreate(BaseModel):
    ma_phong: str
    suc_chua: int | None = Field(default=None, gt=0)

class PhongHocUpdate(BaseModel):
    suc_chua: int | None = Field(default=None, gt=0)


class LopHocPhanCreate(BaseModel):
    ma_lop: str
    ma_gv: str
    ma_hp: str
    ma_hk: str
    ma_phong: str

class LopHocPhanUpdate(BaseModel):
    ma_gv: str | None = None
    ma_hp: str | None = None
    ma_hk: str | None = None
    ma_phong: str | None = None


class LichCreate(BaseModel):
    ngay: date
    tiet_bd: int
    so_tiet: int
    lop_hp: str

class LichUpdate(BaseModel):
    so_tiet: int | None = None


class DangKiCreate(BaseModel):
    ma_sv: str
    ma_lop: str
    diem_cc: float | None = Diem
    diem_gk: float | None = Diem
    diem_ck: float | None = Diem
    ngay_dk: datetime | None = None

class DangKiUpdate(BaseModel):
    diem_cc: float | None = Diem
    diem_gk: float | None = Diem
    diem_ck: float | None = Diem
    ngay_dk: datetime | None = None


class ChuongTrinhDaoTaoCreate(BaseModel):
    ma_nganh: str
    ma_hp: str
    bat_buoc: bool

class ChuongTrinhDaoTaoUpdate(BaseModel):
    bat_buoc: bool | None = None


class TienQuyetCreate(BaseModel):
    mon_hoc: str
    mh_tq: str

    @model_validator(mode="after")
    def khac_nhau(self):
        if self.mon_hoc == self.mh_tq:
            raise ValueError("mon_hoc và mh_tq phải khác nhau")
        return self

class TienQuyetUpdate(BaseModel):
    pass  # bảng chỉ có khoá chính, không có cột nào để sửa


# ---------- Công tác sinh viên ----------
class RenLuyenCreate(BaseModel):
    ma_sv: str
    ma_hk: str
    diem_rl: int = Field(ge=0, le=100)

class RenLuyenUpdate(BaseModel):
    diem_rl: int | None = Field(default=None, ge=0, le=100)


class HocPhiCreate(BaseModel):
    ma_sv: str
    ma_hk: str
    so_tien: float
    ngay_nop: date

class HocPhiUpdate(BaseModel):
    so_tien: float | None = None
    ngay_nop: date | None = None


class CanhBaoCreate(BaseModel):
    ma_sv: str
    ma_hk: str
    muc_cb: int

class CanhBaoUpdate(BaseModel):
    muc_cb: int | None = None
