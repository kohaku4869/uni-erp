# Ánh xạ 16 bảng của database/schema.sql (bảng do schema.sql tạo, backend không tự tạo).
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

# NUMERIC -> float (asdecimal=False) để JSON trả về số chứ không phải chuỗi
Diem = Numeric(4, 2, asdecimal=False)


# ---------- Tổ chức ----------
class Khoa(Base):
    __tablename__ = "khoa"
    ma_khoa: Mapped[str] = mapped_column(String(20), primary_key=True)
    ten: Mapped[str] = mapped_column(String(255))


class Nganh(Base):
    __tablename__ = "nganh"
    ma_nganh: Mapped[str] = mapped_column(String(20), primary_key=True)
    ten: Mapped[str] = mapped_column(String(255))
    ma_khoa: Mapped[str] = mapped_column(ForeignKey("khoa.ma_khoa"))


class GiangVien(Base):
    __tablename__ = "giangvien"
    ma_gv: Mapped[str] = mapped_column(String(20), primary_key=True)
    ten: Mapped[str] = mapped_column(String(255))
    ma_khoa: Mapped[str] = mapped_column(ForeignKey("khoa.ma_khoa"))


class LopHanhChinh(Base):
    __tablename__ = "lophanhchinh"
    ma_lop: Mapped[str] = mapped_column(String(20), primary_key=True)
    ten_lop: Mapped[str] = mapped_column(String(255), unique=True)
    ma_nganh: Mapped[str] = mapped_column(ForeignKey("nganh.ma_nganh"))
    ma_cvht: Mapped[str] = mapped_column(ForeignKey("giangvien.ma_gv"))


class SinhVien(Base):
    __tablename__ = "sinhvien"
    ma_sv: Mapped[str] = mapped_column(String(20), primary_key=True)
    ten: Mapped[str] = mapped_column(String(255))
    ngaysinh: Mapped[date] = mapped_column(Date)
    ma_lophc: Mapped[str] = mapped_column(ForeignKey("lophanhchinh.ma_lop"))


# ---------- Đào tạo ----------
class HocKy(Base):
    __tablename__ = "hocky"
    ma_hk: Mapped[str] = mapped_column(String(20), primary_key=True)
    nam_hoc: Mapped[str | None] = mapped_column(String(20))
    ky: Mapped[int | None] = mapped_column(Integer)


class HocPhan(Base):
    __tablename__ = "hocphan"
    ma_hp: Mapped[str] = mapped_column(String(20), primary_key=True)
    ten: Mapped[str] = mapped_column(String(255))
    so_tc: Mapped[int] = mapped_column(Integer)
    nhom_hp: Mapped[str | None] = mapped_column(String(50))


class PhongHoc(Base):
    __tablename__ = "phonghoc"
    ma_phong: Mapped[str] = mapped_column(String(20), primary_key=True)
    suc_chua: Mapped[int | None] = mapped_column(Integer)


class LopHocPhan(Base):
    __tablename__ = "lophocphan"
    ma_lop: Mapped[str] = mapped_column(String(20), primary_key=True)
    ma_gv: Mapped[str] = mapped_column(ForeignKey("giangvien.ma_gv"))
    ma_hp: Mapped[str] = mapped_column(ForeignKey("hocphan.ma_hp"))
    ma_hk: Mapped[str] = mapped_column(ForeignKey("hocky.ma_hk"))
    ma_phong: Mapped[str] = mapped_column(ForeignKey("phonghoc.ma_phong"))


class Lich(Base):
    __tablename__ = "lich"
    ngay: Mapped[date] = mapped_column(Date, primary_key=True)
    tiet_bd: Mapped[int] = mapped_column(Integer, primary_key=True)
    so_tiet: Mapped[int] = mapped_column(Integer)
    lop_hp: Mapped[str] = mapped_column(ForeignKey("lophocphan.ma_lop"), primary_key=True)


class DangKi(Base):
    __tablename__ = "dangki"
    ma_sv: Mapped[str] = mapped_column(ForeignKey("sinhvien.ma_sv"), primary_key=True)
    ma_lop: Mapped[str] = mapped_column(ForeignKey("lophocphan.ma_lop"), primary_key=True)
    diem_cc: Mapped[float | None] = mapped_column(Diem)
    diem_gk: Mapped[float | None] = mapped_column(Diem)
    diem_ck: Mapped[float | None] = mapped_column(Diem)
    ngay_dk: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"))


class ChuongTrinhDaoTao(Base):
    __tablename__ = "chuongtrinhdaotao"
    ma_nganh: Mapped[str] = mapped_column(ForeignKey("nganh.ma_nganh"), primary_key=True)
    ma_hp: Mapped[str] = mapped_column(ForeignKey("hocphan.ma_hp"), primary_key=True)
    bat_buoc: Mapped[bool] = mapped_column(Boolean)


class TienQuyet(Base):
    __tablename__ = "tienquyet"
    mon_hoc: Mapped[str] = mapped_column(ForeignKey("hocphan.ma_hp"), primary_key=True)
    mh_tq: Mapped[str] = mapped_column(ForeignKey("hocphan.ma_hp"), primary_key=True)


# ---------- Công tác sinh viên ----------
class RenLuyen(Base):
    __tablename__ = "renluyen"
    ma_sv: Mapped[str] = mapped_column(ForeignKey("sinhvien.ma_sv"), primary_key=True)
    ma_hk: Mapped[str] = mapped_column(ForeignKey("hocky.ma_hk"), primary_key=True)
    diem_rl: Mapped[int] = mapped_column(Integer)


class HocPhi(Base):
    __tablename__ = "hocphi"
    ma_sv: Mapped[str] = mapped_column(ForeignKey("sinhvien.ma_sv"), primary_key=True)
    ma_hk: Mapped[str] = mapped_column(ForeignKey("hocky.ma_hk"), primary_key=True)
    so_tien: Mapped[float] = mapped_column(Numeric(15, 2, asdecimal=False))
    ngay_nop: Mapped[date] = mapped_column(Date)


class CanhBao(Base):
    __tablename__ = "canhbao"
    ma_sv: Mapped[str] = mapped_column(ForeignKey("sinhvien.ma_sv"), primary_key=True)
    ma_hk: Mapped[str] = mapped_column(ForeignKey("hocky.ma_hk"), primary_key=True)
    muc_cb: Mapped[int] = mapped_column(Integer)
