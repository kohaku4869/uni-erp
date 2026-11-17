-- =====================================================================
-- University ERP - PostgreSQL schema
-- Sinh ra từ thiết kế DBML. Đây là "nguồn sự thật" (source of truth):
-- backend chỉ ánh xạ (map) các bảng này, KHÔNG tự tạo bảng.
-- =====================================================================

DROP VIEW IF EXISTS v_ketqua;
DROP TABLE IF EXISTS canhbao, hocphi, renluyen, tienquyet, chuongtrinhdaotao,
    dangki, lich, lophocphan, phonghoc, hocphan, hocky, sinhvien,
    lophanhchinh, giangvien, nganh, khoa CASCADE;

-- ---------------------------------------------------------------------
-- Danh mục tổ chức
-- ---------------------------------------------------------------------
CREATE TABLE khoa (
    ma_khoa VARCHAR(20)  PRIMARY KEY,
    ten     VARCHAR(255) NOT NULL
);

CREATE TABLE nganh (
    ma_nganh VARCHAR(20)  PRIMARY KEY,
    ten      VARCHAR(255) NOT NULL,
    ma_khoa  VARCHAR(20)  NOT NULL REFERENCES khoa (ma_khoa)
);

CREATE TABLE giangvien (
    ma_gv   VARCHAR(20)  PRIMARY KEY,
    ten     VARCHAR(255) NOT NULL,
    ma_khoa VARCHAR(20)  NOT NULL REFERENCES khoa (ma_khoa)
);

CREATE TABLE lophanhchinh (
    ma_lop   VARCHAR(20)  PRIMARY KEY,
    ten_lop  VARCHAR(255) NOT NULL UNIQUE,
    ma_nganh VARCHAR(20)  NOT NULL REFERENCES nganh (ma_nganh),
    ma_cvht  VARCHAR(20)  NOT NULL REFERENCES giangvien (ma_gv)
);

CREATE TABLE sinhvien (
    ma_sv    VARCHAR(20)  PRIMARY KEY,
    ten      VARCHAR(255) NOT NULL,
    ngaysinh DATE         NOT NULL,
    ma_lophc VARCHAR(20)  NOT NULL REFERENCES lophanhchinh (ma_lop)
);

-- ---------------------------------------------------------------------
-- Đào tạo
-- ---------------------------------------------------------------------
CREATE TABLE hocky (
    ma_hk   VARCHAR(20) PRIMARY KEY,
    nam_hoc VARCHAR(20),
    ky      INTEGER
);

CREATE TABLE hocphan (
    ma_hp   VARCHAR(20)  PRIMARY KEY,
    ten     VARCHAR(255) NOT NULL,
    so_tc   INTEGER      NOT NULL CHECK (so_tc >= 1 AND so_tc <= 6),
    nhom_hp VARCHAR(50)
);

CREATE TABLE phonghoc (
    ma_phong VARCHAR(20) PRIMARY KEY,
    suc_chua INTEGER CHECK (suc_chua > 0)
);

CREATE TABLE lophocphan (
    ma_lop   VARCHAR(20) PRIMARY KEY,
    ma_gv    VARCHAR(20) NOT NULL REFERENCES giangvien (ma_gv),
    ma_hp    VARCHAR(20) NOT NULL REFERENCES hocphan (ma_hp),
    ma_hk    VARCHAR(20) NOT NULL REFERENCES hocky (ma_hk),
    ma_phong VARCHAR(20) NOT NULL REFERENCES phonghoc (ma_phong)
);

CREATE TABLE lich (
    ngay    DATE        NOT NULL,
    tiet_bd INTEGER     NOT NULL,
    so_tiet INTEGER     NOT NULL,
    lop_hp  VARCHAR(20) NOT NULL REFERENCES lophocphan (ma_lop),
    PRIMARY KEY (ngay, tiet_bd, lop_hp)
);

CREATE TABLE dangki (
    ma_sv   VARCHAR(20)  NOT NULL REFERENCES sinhvien (ma_sv),
    ma_lop  VARCHAR(20)  NOT NULL REFERENCES lophocphan (ma_lop),
    diem_cc NUMERIC(4,2) CHECK (diem_cc >= 0.0 AND diem_cc <= 10.0),
    diem_gk NUMERIC(4,2) CHECK (diem_gk >= 0.0 AND diem_gk <= 10.0),
    diem_ck NUMERIC(4,2) CHECK (diem_ck >= 0.0 AND diem_ck <= 10.0),
    ngay_dk TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_sv, ma_lop)
);

CREATE TABLE chuongtrinhdaotao (
    ma_nganh VARCHAR(20) NOT NULL REFERENCES nganh (ma_nganh),
    ma_hp    VARCHAR(20) NOT NULL REFERENCES hocphan (ma_hp),
    bat_buoc BOOLEAN     NOT NULL,
    PRIMARY KEY (ma_nganh, ma_hp)
);

CREATE TABLE tienquyet (
    mon_hoc VARCHAR(20) NOT NULL REFERENCES hocphan (ma_hp),
    mh_tq   VARCHAR(20) NOT NULL REFERENCES hocphan (ma_hp),
    PRIMARY KEY (mon_hoc, mh_tq),
    CHECK (mon_hoc <> mh_tq)  -- một môn không thể tiên quyết của chính nó
);

-- ---------------------------------------------------------------------
-- Công tác sinh viên
-- ---------------------------------------------------------------------
CREATE TABLE renluyen (
    ma_sv  VARCHAR(20) NOT NULL REFERENCES sinhvien (ma_sv),
    ma_hk  VARCHAR(20) NOT NULL REFERENCES hocky (ma_hk),
    diem_rl INTEGER    NOT NULL CHECK (diem_rl >= 0 AND diem_rl <= 100),
    PRIMARY KEY (ma_sv, ma_hk)
);

CREATE TABLE hocphi (
    ma_sv    VARCHAR(20)   NOT NULL REFERENCES sinhvien (ma_sv),
    ma_hk    VARCHAR(20)   NOT NULL REFERENCES hocky (ma_hk),
    so_tien  NUMERIC(15,2) NOT NULL,
    ngay_nop DATE          NOT NULL,
    PRIMARY KEY (ma_sv, ma_hk)
);

CREATE TABLE canhbao (
    ma_sv  VARCHAR(20) NOT NULL REFERENCES sinhvien (ma_sv),
    ma_hk  VARCHAR(20) NOT NULL REFERENCES hocky (ma_hk),
    muc_cb INTEGER     NOT NULL,
    PRIMARY KEY (ma_sv, ma_hk)
);

-- ---------------------------------------------------------------------
-- View kết quả học tập: điểm tổng kết và điểm thang 4 là dữ liệu DẪN XUẤT,
-- không lưu thành cột (tránh dư thừa, giữ 3NF) mà tính qua view này.
-- Dùng chung cho trigger (triggers.sql) và các truy vấn (queries.sql).
-- ---------------------------------------------------------------------
CREATE VIEW v_ketqua AS
SELECT k.*,
       CASE WHEN k.diem_tk IS NULL THEN NULL      -- chưa đủ điểm thành phần
            WHEN k.diem_tk >= 8.5 THEN 4.0        -- A
            WHEN k.diem_tk >= 8.0 THEN 3.5        -- B+
            WHEN k.diem_tk >= 7.0 THEN 3.0        -- B
            WHEN k.diem_tk >= 6.5 THEN 2.5        -- C+
            WHEN k.diem_tk >= 5.5 THEN 2.0        -- C
            WHEN k.diem_tk >= 5.0 THEN 1.5        -- D+
            WHEN k.diem_tk >= 4.0 THEN 1.0        -- D
            ELSE 0.0                              -- F
       END AS diem_he4
FROM (
    SELECT dk.ma_sv, dk.ma_lop, lop.ma_hp, lop.ma_hk, hp.so_tc,
           dk.diem_cc, dk.diem_gk, dk.diem_ck,
           -- chỉ cần 1 thành phần NULL thì cả biểu thức NULL
           ROUND(0.1 * dk.diem_cc + 0.3 * dk.diem_gk + 0.6 * dk.diem_ck, 2) AS diem_tk
    FROM dangki dk
    JOIN lophocphan lop ON lop.ma_lop = dk.ma_lop
    JOIN hocphan hp     ON hp.ma_hp = lop.ma_hp
) k;
