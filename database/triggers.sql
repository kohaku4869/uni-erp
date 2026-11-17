-- =====================================================================
-- Business rules cho bảng dangki (đăng kí học phần).
-- Nạp SAU schema.sql và TRƯỚC seed.sql -> dữ liệu mẫu cũng phải tuân thủ.
--
-- Cả 3 trigger đều là AFTER INSERT OR UPDATE OF ma_sv, ma_lop:
--   * AFTER: dòng mới đã nằm trong bảng -> chỉ cần đếm/tính rồi so với giới hạn,
--     vi phạm thì RAISE EXCEPTION -> PostgreSQL huỷ cả câu lệnh.
--   * UPDATE OF ma_sv, ma_lop: chỉ chạy khi đổi SV/lớp; nhập điểm không kích hoạt.
--   * Trigger cùng sự kiện chạy theo thứ tự TÊN -> đánh số 1, 2, 3.
-- Lỗi dùng ERRCODE check_violation (23514) -> backend trả HTTP 400.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Rule 1: Không được đăng kí lớp học phần A nếu chưa có điểm tổng kết >= 4.0
--         ở môn tiên quyết của A (xét mọi lần học trước đó).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_kiem_tra_tien_quyet() RETURNS trigger AS $$
DECLARE
    mon_thieu VARCHAR(20);
BEGIN
    SELECT tq.mh_tq INTO mon_thieu
    FROM lophocphan lop
    JOIN tienquyet tq ON tq.mon_hoc = lop.ma_hp            -- các môn tiên quyết của A
    WHERE lop.ma_lop = NEW.ma_lop
      AND NOT EXISTS (                                      -- ...mà SV chưa có lần nào đạt
          SELECT 1 FROM v_ketqua kq
          WHERE kq.ma_sv = NEW.ma_sv
            AND kq.ma_hp = tq.mh_tq
            AND kq.diem_tk >= 4.0                           -- NULL (chưa có điểm) -> không đạt
      )
    ORDER BY tq.mh_tq
    LIMIT 1;

    IF mon_thieu IS NOT NULL THEN
        RAISE EXCEPTION 'Sinh viên % chưa qua môn tiên quyết %', NEW.ma_sv, mon_thieu
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NULL;  -- AFTER trigger: giá trị trả về bị bỏ qua
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Rule 2: SV bị cảnh báo học vụ ở học kỳ LIỀN TRƯỚC thì tổng tín chỉ đăng kí
--         trong học kỳ này không vượt quá 14.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_kiem_tra_so_tin_chi() RETURNS trigger AS $$
DECLARE
    v_hk       VARCHAR(20);  -- học kỳ của lớp đang đăng kí
    v_hk_truoc VARCHAR(20);  -- học kỳ liền trước
    v_tong_tc  INTEGER;
BEGIN
    SELECT lop.ma_hk INTO v_hk FROM lophocphan lop WHERE lop.ma_lop = NEW.ma_lop;

    -- Kỳ liền trước = kỳ lớn nhất nhỏ hơn kỳ hiện tại theo (nam_hoc, ky)
    SELECT hk.ma_hk INTO v_hk_truoc
    FROM hocky hk
    WHERE (hk.nam_hoc, hk.ky) < (SELECT nam_hoc, ky FROM hocky WHERE ma_hk = v_hk)
    ORDER BY hk.nam_hoc DESC, hk.ky DESC
    LIMIT 1;

    IF NOT EXISTS (SELECT 1 FROM canhbao WHERE ma_sv = NEW.ma_sv AND ma_hk = v_hk_truoc) THEN
        RETURN NULL;  -- không bị cảnh báo -> không giới hạn
    END IF;

    -- Khoá dòng sinh viên: 2 lượt đăng kí đồng thời của cùng SV phải xếp hàng,
    -- tránh cả hai cùng đếm thấy "còn đủ chỗ" rồi cùng được chèn.
    PERFORM 1 FROM sinhvien WHERE ma_sv = NEW.ma_sv FOR NO KEY UPDATE;

    SELECT COALESCE(SUM(hp.so_tc), 0) INTO v_tong_tc
    FROM dangki dk
    JOIN lophocphan lop ON lop.ma_lop = dk.ma_lop
    JOIN hocphan hp     ON hp.ma_hp = lop.ma_hp
    WHERE dk.ma_sv = NEW.ma_sv AND lop.ma_hk = v_hk;       -- đã gồm cả dòng mới

    IF v_tong_tc > 14 THEN
        RAISE EXCEPTION 'Sinh viên % bị cảnh báo học vụ kỳ % nên chỉ được đăng kí tối đa 14 TC (sẽ thành % TC)',
            NEW.ma_sv, v_hk_truoc, v_tong_tc
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Rule 3: Sĩ số đăng kí không vượt quá sức chứa (SiSoToiDa) của phòng học.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_kiem_tra_si_so() RETURNS trigger AS $$
DECLARE
    v_suc_chua INTEGER;
    v_si_so    INTEGER;
BEGIN
    -- Khoá dòng lớp học phần để các lượt đăng kí cùng lớp xếp hàng (chống vượt sĩ số
    -- khi nhiều SV đăng kí chỗ cuối cùng cùng lúc). NO KEY UPDATE không xung đột với
    -- khoá KEY SHARE mà ràng buộc khoá ngoại tự lấy -> không gây deadlock.
    SELECT ph.suc_chua INTO v_suc_chua
    FROM lophocphan lop
    JOIN phonghoc ph ON ph.ma_phong = lop.ma_phong
    WHERE lop.ma_lop = NEW.ma_lop
    FOR NO KEY UPDATE OF lop;

    IF v_suc_chua IS NULL THEN
        RETURN NULL;  -- phòng chưa khai báo sức chứa -> không giới hạn
    END IF;

    SELECT COUNT(*) INTO v_si_so FROM dangki WHERE ma_lop = NEW.ma_lop;  -- đã gồm dòng mới

    IF v_si_so > v_suc_chua THEN
        RAISE EXCEPTION 'Lớp % đã đủ sĩ số tối đa (% SV)', NEW.ma_lop, v_suc_chua
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Gắn trigger
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_dangki_tien_quyet ON dangki;  -- tên cũ (bản trước)
DROP TRIGGER IF EXISTS trg_dangki_1_tien_quyet ON dangki;
DROP TRIGGER IF EXISTS trg_dangki_2_so_tin_chi ON dangki;
DROP TRIGGER IF EXISTS trg_dangki_3_si_so ON dangki;

CREATE TRIGGER trg_dangki_1_tien_quyet
    AFTER INSERT OR UPDATE OF ma_sv, ma_lop ON dangki
    FOR EACH ROW EXECUTE FUNCTION fn_kiem_tra_tien_quyet();

CREATE TRIGGER trg_dangki_2_so_tin_chi
    AFTER INSERT OR UPDATE OF ma_sv, ma_lop ON dangki
    FOR EACH ROW EXECUTE FUNCTION fn_kiem_tra_so_tin_chi();

CREATE TRIGGER trg_dangki_3_si_so
    AFTER INSERT OR UPDATE OF ma_sv, ma_lop ON dangki
    FOR EACH ROW EXECUTE FUNCTION fn_kiem_tra_si_so();
