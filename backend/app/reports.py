# 4 báo cáo, viết bằng SQL thuần (JOIN rõ ràng), trả về dict.
from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.database import DbSession

router = APIRouter(prefix="/reports", tags=["reports"])

# điểm tổng kết = 0.1*CC + 0.3*GK + 0.6*CK (NULL nếu thiếu thành phần nào)
DIEM_TK = "ROUND(0.1*dk.diem_cc + 0.3*dk.diem_gk + 0.6*dk.diem_ck, 2)::float8"


def rows(db, sql: str, **params) -> list[dict]:
    return [dict(r) for r in db.execute(text(sql), params).mappings()]


def get_sinh_vien(db, ma_sv: str) -> dict:
    sv = rows(db, """
        SELECT sv.ma_sv, sv.ten, sv.ngaysinh, sv.ma_lophc, lhc.ten_lop, ng.ten AS ten_nganh
        FROM sinhvien sv
        JOIN lophanhchinh lhc ON lhc.ma_lop = sv.ma_lophc
        JOIN nganh ng         ON ng.ma_nganh = lhc.ma_nganh
        WHERE sv.ma_sv = :ma_sv""", ma_sv=ma_sv)
    if not sv:
        raise HTTPException(404, "Không tìm thấy sinh viên")
    return sv[0]


@router.get("/thong-ke", summary="Số lượng bản ghi cho dashboard")
def thong_ke(db: DbSession):
    return rows(db, """
        SELECT (SELECT COUNT(*) FROM khoa)       AS khoa,
               (SELECT COUNT(*) FROM nganh)      AS nganh,
               (SELECT COUNT(*) FROM giangvien)  AS giang_vien,
               (SELECT COUNT(*) FROM sinhvien)   AS sinh_vien,
               (SELECT COUNT(*) FROM hocphan)    AS hoc_phan,
               (SELECT COUNT(*) FROM lophocphan) AS lop_hoc_phan,
               (SELECT COUNT(*) FROM dangki)     AS dang_ki""")[0]


@router.get("/bang-diem/{ma_sv}", summary="Bảng điểm và GPA của sinh viên")
def bang_diem(ma_sv: str, db: DbSession):
    sinh_vien = get_sinh_vien(db, ma_sv)
    ket_qua = rows(db, f"""
        SELECT lop.ma_hk, lop.ma_lop, hp.ma_hp, hp.ten AS ten_hp, hp.so_tc,
               dk.diem_cc::float8 AS diem_cc, dk.diem_gk::float8 AS diem_gk,
               dk.diem_ck::float8 AS diem_ck, {DIEM_TK} AS diem_tk
        FROM dangki dk
        JOIN lophocphan lop ON lop.ma_lop = dk.ma_lop
        JOIN hocphan hp     ON hp.ma_hp = lop.ma_hp
        JOIN hocky hk       ON hk.ma_hk = lop.ma_hk
        WHERE dk.ma_sv = :ma_sv
        ORDER BY hk.nam_hoc, hk.ky, hp.ma_hp""", ma_sv=ma_sv)
    # GPA = trung bình có trọng số tín chỉ, chỉ tính môn đã có điểm tổng kết
    co_diem = [r for r in ket_qua if r["diem_tk"] is not None]
    tong_tc = sum(r["so_tc"] for r in co_diem)
    gpa = round(sum(r["diem_tk"] * r["so_tc"] for r in co_diem) / tong_tc, 2) if tong_tc else None
    return {"sinh_vien": sinh_vien, "ket_qua": ket_qua, "tong_tc": tong_tc, "gpa_he10": gpa}


@router.get("/thoi-khoa-bieu/{ma_sv}", summary="Thời khoá biểu của sinh viên")
def thoi_khoa_bieu(ma_sv: str, db: DbSession, ma_hk: str | None = None):
    get_sinh_vien(db, ma_sv)  # 404 nếu không có sinh viên
    return rows(db, """
        SELECT l.ngay, l.tiet_bd, l.so_tiet, lop.ma_lop, hp.ma_hp, hp.ten AS ten_hp,
               lop.ma_phong, gv.ten AS ten_gv
        FROM dangki dk
        JOIN lophocphan lop ON lop.ma_lop = dk.ma_lop
        JOIN lich l         ON l.lop_hp = lop.ma_lop
        JOIN hocphan hp     ON hp.ma_hp = lop.ma_hp
        JOIN giangvien gv   ON gv.ma_gv = lop.ma_gv
        WHERE dk.ma_sv = :ma_sv
          AND (CAST(:ma_hk AS VARCHAR) IS NULL OR lop.ma_hk = CAST(:ma_hk AS VARCHAR))
        ORDER BY l.ngay, l.tiet_bd, lop.ma_lop""", ma_sv=ma_sv, ma_hk=ma_hk)


@router.get("/lop-hoc-phan/{ma_lop}/sinh-vien", summary="Danh sách sinh viên của lớp học phần")
def danh_sach_lop(ma_lop: str, db: DbSession):
    lop = rows(db, """
        SELECT lop.ma_lop, hp.ma_hp, hp.ten AS ten_hp, lop.ma_hk, gv.ten AS ten_gv,
               lop.ma_phong, ph.suc_chua,
               (SELECT COUNT(*) FROM dangki d WHERE d.ma_lop = lop.ma_lop) AS si_so
        FROM lophocphan lop
        JOIN hocphan hp   ON hp.ma_hp = lop.ma_hp
        JOIN giangvien gv ON gv.ma_gv = lop.ma_gv
        JOIN phonghoc ph  ON ph.ma_phong = lop.ma_phong
        WHERE lop.ma_lop = :ma_lop""", ma_lop=ma_lop)
    if not lop:
        raise HTTPException(404, "Không tìm thấy lớp học phần")
    sinh_vien = rows(db, f"""
        SELECT sv.ma_sv, sv.ten, sv.ma_lophc,
               dk.diem_cc::float8 AS diem_cc, dk.diem_gk::float8 AS diem_gk,
               dk.diem_ck::float8 AS diem_ck, {DIEM_TK} AS diem_tk
        FROM dangki dk
        JOIN sinhvien sv ON sv.ma_sv = dk.ma_sv
        WHERE dk.ma_lop = :ma_lop
        ORDER BY sv.ma_sv""", ma_lop=ma_lop)
    return {"lop_hoc_phan": lop[0], "sinh_vien": sinh_vien}
