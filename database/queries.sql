-- =====================================================================
-- Hệ thống truy vấn dữ liệu (9 truy vấn theo đề + xét tốt nghiệp + cảnh báo học vụ).
-- File này được backend đọc và hiển thị ở trang "Truy vấn SQL" trên web.
-- Định dạng: mỗi truy vấn bắt đầu bằng dòng "-- @id:", tiếp theo "-- @title:", "-- @desc:".
--
-- Quy ước dùng chung:
--   * v_ketqua (schema.sql): điểm tổng kết diem_tk và điểm thang 4 diem_he4 của từng lượt đăng kí.
--   * "Học kỳ này" = học kỳ mới nhất theo (nam_hoc, ky).
-- =====================================================================

-- @id: q1
-- @title: 1. Cơ bản — Sinh viên lớp "CNTT K65" có điểm rèn luyện TB > 80
-- @desc: Lọc theo tên lớp hành chính, tính trung bình điểm rèn luyện qua các học kỳ.
SELECT sv.ma_sv, sv.ten, ROUND(AVG(rl.diem_rl), 2) AS diem_rl_tb
FROM sinhvien sv
JOIN lophanhchinh lhc ON lhc.ma_lop = sv.ma_lophc
JOIN renluyen rl      ON rl.ma_sv = sv.ma_sv
WHERE lhc.ten_lop = 'CNTT K65'
GROUP BY sv.ma_sv, sv.ten
HAVING AVG(rl.diem_rl) > 80
ORDER BY diem_rl_tb DESC;

-- @id: q2
-- @title: 2. Inner Join — Thời khoá biểu của SV001 trong học kỳ này
-- @desc: Nối 6 bảng; "Thứ" suy ra từ ngày học (ISODOW: 1 = Thứ 2 ... 7 = Chủ nhật).
WITH hk_nay AS (
    SELECT ma_hk FROM hocky ORDER BY nam_hoc DESC, ky DESC LIMIT 1
),
buoi_hoc AS (            -- mỗi lớp học nhiều tuần -> DISTINCT để còn 1 dòng / buổi trong tuần
    SELECT DISTINCT
           EXTRACT(ISODOW FROM l.ngay)::int AS thu_so,
           l.tiet_bd, l.so_tiet,
           hp.ten AS hoc_phan, lop.ma_phong, gv.ten AS giang_vien
    FROM dangki dk
    JOIN lophocphan lop ON lop.ma_lop = dk.ma_lop
    JOIN hk_nay         ON hk_nay.ma_hk = lop.ma_hk
    JOIN lich l         ON l.lop_hp = lop.ma_lop
    JOIN hocphan hp     ON hp.ma_hp = lop.ma_hp
    JOIN giangvien gv   ON gv.ma_gv = lop.ma_gv
    WHERE dk.ma_sv = 'SV001'
)
SELECT CASE thu_so WHEN 7 THEN 'Chủ nhật' ELSE 'Thứ ' || (thu_so + 1) END AS thu,
       tiet_bd || '-' || (tiet_bd + so_tiet - 1) AS tiet,
       ma_phong AS phong_hoc, giang_vien, hoc_phan
FROM buoi_hoc
ORDER BY thu_so, tiet_bd;

-- @id: q3
-- @title: 3. Group By — GPA học kỳ (thang 4) của sinh viên khoa Máy tính
-- @desc: GPA = Σ(điểm thang 4 × số TC) / Σ(số TC), chỉ tính các môn đã có điểm tổng kết.
SELECT sv.ma_sv, sv.ten, kq.ma_hk,
       SUM(kq.so_tc) AS so_tc,
       ROUND(SUM(kq.diem_he4 * kq.so_tc) / SUM(kq.so_tc), 2) AS gpa_he4
FROM v_ketqua kq
JOIN sinhvien sv      ON sv.ma_sv = kq.ma_sv
JOIN lophanhchinh lhc ON lhc.ma_lop = sv.ma_lophc
JOIN nganh ng         ON ng.ma_nganh = lhc.ma_nganh
JOIN khoa k           ON k.ma_khoa = ng.ma_khoa
WHERE k.ten = 'Máy tính'
  AND kq.diem_tk IS NOT NULL
GROUP BY sv.ma_sv, sv.ten, kq.ma_hk
ORDER BY sv.ma_sv, kq.ma_hk;

-- @id: q4
-- @title: 4. Having — Lớp học phần có tỷ lệ trượt (điểm TK < 4.0) trên 30%
-- @desc: COUNT(*) FILTER đếm số SV trượt; HAVING lọc trên kết quả đã gom nhóm.
SELECT kq.ma_lop, hp.ten AS hoc_phan, kq.ma_hk,
       COUNT(*) AS so_sv,
       COUNT(*) FILTER (WHERE kq.diem_tk < 4.0) AS so_truot,
       ROUND(100.0 * COUNT(*) FILTER (WHERE kq.diem_tk < 4.0) / COUNT(*), 1) AS ty_le_truot_pct
FROM v_ketqua kq
JOIN hocphan hp ON hp.ma_hp = kq.ma_hp
WHERE kq.diem_tk IS NOT NULL
GROUP BY kq.ma_lop, hp.ten, kq.ma_hk
HAVING COUNT(*) FILTER (WHERE kq.diem_tk < 4.0) > 0.3 * COUNT(*)
ORDER BY ty_le_truot_pct DESC;

-- @id: q5
-- @title: 5. Outer Join — Môn trong CTĐT ngành CNTT và lớp mở trong kỳ này (kể cả môn không mở lớp)
-- @desc: Điều kiện học kỳ phải nằm trong ON của LEFT JOIN; đặt ở WHERE sẽ loại mất các môn không mở lớp.
WITH hk_nay AS (
    SELECT ma_hk FROM hocky ORDER BY nam_hoc DESC, ky DESC LIMIT 1
)
SELECT ct.ma_hp, hp.ten AS hoc_phan,
       CASE WHEN ct.bat_buoc THEN 'Bắt buộc' ELSE 'Tự chọn' END AS loai,
       lop.ma_lop, lop.ma_phong
FROM chuongtrinhdaotao ct
JOIN hocphan hp ON hp.ma_hp = ct.ma_hp
LEFT JOIN lophocphan lop
       ON lop.ma_hp = ct.ma_hp
      AND lop.ma_hk = (SELECT ma_hk FROM hk_nay)
WHERE ct.ma_nganh = 'CNTT'
ORDER BY ct.ma_hp;

-- @id: q6
-- @title: 6. NOT EXISTS — Sinh viên đã đăng kí học kỳ này nhưng chưa nộp học phí
SELECT sv.ma_sv, sv.ten, sv.ma_lophc
FROM sinhvien sv
WHERE EXISTS (                              -- có đăng kí ít nhất 1 lớp trong kỳ này
        SELECT 1 FROM dangki dk
        JOIN lophocphan lop ON lop.ma_lop = dk.ma_lop
        WHERE dk.ma_sv = sv.ma_sv
          AND lop.ma_hk = (SELECT ma_hk FROM hocky ORDER BY nam_hoc DESC, ky DESC LIMIT 1))
  AND NOT EXISTS (                          -- ...nhưng không có bản ghi học phí kỳ này
        SELECT 1 FROM hocphi hp
        WHERE hp.ma_sv = sv.ma_sv
          AND hp.ma_hk = (SELECT ma_hk FROM hocky ORDER BY nam_hoc DESC, ky DESC LIMIT 1))
ORDER BY sv.ma_sv;

-- @id: q7
-- @title: 7. Division — Sinh viên đã học và đỗ TẤT CẢ các môn nhóm "Kỹ năng mềm"
-- @desc: Phép chia bằng 2 lớp NOT EXISTS: không tồn tại môn Kỹ năng mềm nào mà sinh viên chưa đỗ.
SELECT sv.ma_sv, sv.ten
FROM sinhvien sv
WHERE NOT EXISTS (
        SELECT 1 FROM hocphan hp
        WHERE hp.nhom_hp = 'Kỹ năng mềm'
          AND NOT EXISTS (
                SELECT 1 FROM v_ketqua kq
                WHERE kq.ma_sv = sv.ma_sv
                  AND kq.ma_hp = hp.ma_hp
                  AND kq.diem_tk >= 4.0))
ORDER BY sv.ma_sv;

-- @id: q8
-- @title: 8. Window Function & CTE — Xếp hạng GPA tích luỹ theo ngành, lọc top 1% nhận học bổng
-- @desc: Mỗi môn lấy lần học tốt nhất; RANK() theo ngành; top 1% = hạng ≤ CEIL(1% × số SV của ngành), nên ngành nhỏ vẫn có ít nhất 1 SV.
WITH diem_mon AS (           -- điểm tốt nhất của mỗi SV ở mỗi môn (tính cả học lại)
    SELECT ma_sv, ma_hp, MAX(so_tc) AS so_tc, MAX(diem_he4) AS diem_he4
    FROM v_ketqua
    WHERE diem_tk IS NOT NULL
    GROUP BY ma_sv, ma_hp
),
gpa AS (                     -- GPA tích luỹ của từng SV
    SELECT dm.ma_sv, lhc.ma_nganh,
           ROUND(SUM(dm.diem_he4 * dm.so_tc) / SUM(dm.so_tc), 2) AS gpa
    FROM diem_mon dm
    JOIN sinhvien sv      ON sv.ma_sv = dm.ma_sv
    JOIN lophanhchinh lhc ON lhc.ma_lop = sv.ma_lophc
    GROUP BY dm.ma_sv, lhc.ma_nganh
),
xep_hang AS (
    SELECT g.*,
           RANK()   OVER (PARTITION BY ma_nganh ORDER BY gpa DESC) AS hang,
           COUNT(*) OVER (PARTITION BY ma_nganh)                   AS so_sv_nganh
    FROM gpa g
)
SELECT xh.ma_nganh, xh.ma_sv, sv.ten, xh.gpa, xh.hang, xh.so_sv_nganh
FROM xep_hang xh
JOIN sinhvien sv ON sv.ma_sv = xh.ma_sv
WHERE xh.hang <= CEIL(0.01 * xh.so_sv_nganh)
ORDER BY xh.ma_nganh, xh.hang;

-- @id: q9
-- @title: 9. Recursive CTE — Tất cả môn tiên quyết (trực tiếp và gián tiếp) của "Đồ án tốt nghiệp"
-- @desc: Neo = tiên quyết trực tiếp (cấp 1); bước đệ quy đi tiếp xuống tiên quyết của tiên quyết. Một môn có thể đến bằng nhiều đường (HP001) nên cuối cùng GROUP BY theo môn; cap < 20 chặn lặp vô hạn nếu dữ liệu có chu trình.
WITH RECURSIVE cay_tq (ma_hp, cap, duong_di) AS (
    SELECT tq.mh_tq, 1, hp.ten || ' ← ' || tq.mh_tq
    FROM tienquyet tq
    JOIN hocphan hp ON hp.ma_hp = tq.mon_hoc
    WHERE hp.ten = 'Đồ án tốt nghiệp'
  UNION
    SELECT tq.mh_tq, c.cap + 1, c.duong_di || ' ← ' || tq.mh_tq
    FROM tienquyet tq
    JOIN cay_tq c ON tq.mon_hoc = c.ma_hp
    WHERE c.cap < 20
)
SELECT c.ma_hp, hp.ten,
       MIN(c.cap) AS cap,
       string_agg(c.duong_di, '  |  ' ORDER BY c.duong_di) AS cac_duong_di
FROM cay_tq c
JOIN hocphan hp ON hp.ma_hp = c.ma_hp
GROUP BY c.ma_hp, hp.ten
ORDER BY cap, c.ma_hp;

-- @id: q10
-- @title: 10. Xét tốt nghiệp — Đỗ hết môn bắt buộc của CTĐT ngành và GPA tích luỹ ≥ 2.0
-- @desc: Số môn bắt buộc còn thiếu tính bằng NOT EXISTS; GPA tích luỹ lấy điểm tốt nhất của mỗi môn.
WITH diem_mon AS (
    SELECT ma_sv, ma_hp, MAX(so_tc) AS so_tc, MAX(diem_he4) AS diem_he4, MAX(diem_tk) AS diem_tk
    FROM v_ketqua
    WHERE diem_tk IS NOT NULL
    GROUP BY ma_sv, ma_hp
),
tong_hop AS (
    SELECT sv.ma_sv, sv.ten, lhc.ma_nganh,
           (SELECT COUNT(*) FROM chuongtrinhdaotao ct
             WHERE ct.ma_nganh = lhc.ma_nganh AND ct.bat_buoc
               AND NOT EXISTS (SELECT 1 FROM diem_mon dm
                               WHERE dm.ma_sv = sv.ma_sv AND dm.ma_hp = ct.ma_hp AND dm.diem_tk >= 4.0)
           ) AS mon_bb_con_thieu,
           (SELECT COALESCE(SUM(so_tc), 0) FROM diem_mon dm
             WHERE dm.ma_sv = sv.ma_sv AND dm.diem_tk >= 4.0) AS tc_tich_luy,
           (SELECT ROUND(SUM(diem_he4 * so_tc) / NULLIF(SUM(so_tc), 0), 2) FROM diem_mon dm
             WHERE dm.ma_sv = sv.ma_sv) AS gpa_tich_luy
    FROM sinhvien sv
    JOIN lophanhchinh lhc ON lhc.ma_lop = sv.ma_lophc
)
SELECT th.*,
       CASE WHEN mon_bb_con_thieu = 0 AND gpa_tich_luy >= 2.0 THEN 'Đủ điều kiện'
            ELSE 'Chưa đủ' END AS ket_qua
FROM tong_hop th
ORDER BY (mon_bb_con_thieu = 0 AND gpa_tich_luy >= 2.0) DESC, ma_nganh, ma_sv;

-- @id: q11
-- @title: 11. Xét cảnh báo học vụ — GPA học kỳ (thang 4) < 1.0; bị liên tiếp 2 kỳ thì mức 2
-- @desc: LAG() lấy kết quả của học kỳ trước của cùng sinh viên; đối chiếu với bảng canhbao đã ghi nhận.
WITH gpa_hk AS (
    SELECT kq.ma_sv, kq.ma_hk, hk.nam_hoc, hk.ky,
           ROUND(SUM(kq.diem_he4 * kq.so_tc) / SUM(kq.so_tc), 2) AS gpa
    FROM v_ketqua kq
    JOIN hocky hk ON hk.ma_hk = kq.ma_hk
    WHERE kq.diem_tk IS NOT NULL
    GROUP BY kq.ma_sv, kq.ma_hk, hk.nam_hoc, hk.ky
),
danh_dau AS (
    SELECT g.*,
           LAG(g.gpa) OVER (PARTITION BY g.ma_sv ORDER BY g.nam_hoc, g.ky) AS gpa_ky_truoc
    FROM gpa_hk g
)
SELECT d.ma_sv, sv.ten, d.ma_hk, d.gpa, d.gpa_ky_truoc,
       CASE WHEN d.gpa_ky_truoc < 1.0 THEN 2 ELSE 1 END AS muc_de_xuat,
       cb.muc_cb AS muc_da_ghi_nhan
FROM danh_dau d
JOIN sinhvien sv     ON sv.ma_sv = d.ma_sv
LEFT JOIN canhbao cb ON cb.ma_sv = d.ma_sv AND cb.ma_hk = d.ma_hk
WHERE d.gpa < 1.0
ORDER BY d.nam_hoc, d.ky, d.ma_sv;
