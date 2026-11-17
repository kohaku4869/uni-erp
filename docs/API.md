# API Contract — University ERP

Base URL: `http://localhost:8000/api` (frontend dev server proxies `/api` → `http://localhost:8000`).
All JSON field names are **exactly the DB column names** in `database/schema.sql`.

## Conventions

- Dates: `"YYYY-MM-DD"`. Datetime (`ngay_dk`): ISO 8601 `"YYYY-MM-DDTHH:MM:SS"`.
- Numeric columns (`diem_*`, `so_tien`) are JSON **numbers** (not strings).
- Errors always have shape `{"detail": "<message>"}` (FastAPI default). Validation errors (422) use FastAPI's default list format.
- Status codes:
  - `200` OK, `201` created, `204` deleted (no body)
  - `404` not found
  - `409` conflict: duplicate primary key / unique violation, or delete blocked by foreign key (row is referenced)
  - `400` foreign key on insert/update points to a non-existent row, or CHECK constraint violated
  - `422` request body validation failed (Pydantic)

## Generic CRUD resources

For every resource below:

| Method | Path | Description |
|---|---|---|
| GET | `/api/{resource}` | List. Query: `skip` (default 0), `limit` (default 100, max 1000). Other query params are ignored (no filtering). Ordered by primary key. Returns a JSON array. |
| GET | `/api/{resource}/{pk1}[/{pk2}[/{pk3}]]` | Get one by primary key (path segments in the PK order listed below). |
| POST | `/api/{resource}` | Create. Body contains all columns (PK included). Returns created object, `201`. |
| PUT | `/api/{resource}/{pk...}` | Update **non-PK** columns. Body = object with non-PK columns (all optional / partial update). PK cannot be changed. Returns updated object. |
| DELETE | `/api/{resource}/{pk...}` | Delete. `204`. |

| resource (URL) | table | primary key (path order) | columns (type, required?) |
|---|---|---|---|
| `khoa` | khoa | ma_khoa | ma_khoa str*, ten str* |
| `nganh` | nganh | ma_nganh | ma_nganh str*, ten str*, ma_khoa str* → khoa |
| `giang-vien` | giangvien | ma_gv | ma_gv str*, ten str*, ma_khoa str* → khoa |
| `lop-hanh-chinh` | lophanhchinh | ma_lop | ma_lop str*, ten_lop str* (unique), ma_nganh str* → nganh, ma_cvht str* → giang-vien |
| `sinh-vien` | sinhvien | ma_sv | ma_sv str*, ten str*, ngaysinh date*, ma_lophc str* → lop-hanh-chinh |
| `hoc-ky` | hocky | ma_hk | ma_hk str*, nam_hoc str?, ky int? |
| `hoc-phan` | hocphan | ma_hp | ma_hp str*, ten str*, so_tc int* (1..6), nhom_hp str? |
| `phong-hoc` | phonghoc | ma_phong | ma_phong str*, suc_chua int? (>0) |
| `lop-hoc-phan` | lophocphan | ma_lop | ma_lop str*, ma_gv str* → giang-vien, ma_hp str* → hoc-phan, ma_hk str* → hoc-ky, ma_phong str* → phong-hoc |
| `lich` | lich | ngay, tiet_bd, lop_hp | ngay date*, tiet_bd int*, so_tiet int*, lop_hp str* → lop-hoc-phan |
| `dang-ki` | dangki | ma_sv, ma_lop | ma_sv str* → sinh-vien, ma_lop str* → lop-hoc-phan, diem_cc float? (0..10), diem_gk float? (0..10), diem_ck float? (0..10), ngay_dk datetime? (DB default now) |
| `chuong-trinh-dao-tao` | chuongtrinhdaotao | ma_nganh, ma_hp | ma_nganh str* → nganh, ma_hp str* → hoc-phan, bat_buoc bool* |
| `tien-quyet` | tienquyet | mon_hoc, mh_tq | mon_hoc str* → hoc-phan, mh_tq str* → hoc-phan (must differ) |
| `ren-luyen` | renluyen | ma_sv, ma_hk | ma_sv str* → sinh-vien, ma_hk str* → hoc-ky, diem_rl int* (0..100) |
| `hoc-phi` | hocphi | ma_sv, ma_hk | ma_sv str* → sinh-vien, ma_hk str* → hoc-ky, so_tien float*, ngay_nop date* |
| `canh-bao` | canhbao | ma_sv, ma_hk | ma_sv str* → sinh-vien, ma_hk str* → hoc-ky, muc_cb int* |

`*` = required (NOT NULL), `?` = nullable. `→ x` = foreign key to resource `x`.

Example: `PUT /api/lich/2025-09-08/1/LHP001` body `{"so_tiet": 4}`.

`GET /api/health` → `{"status": "ok"}`.

## SQL query showcase (read-only)

Queries live in `database/queries.sql` (blocks starting with `-- @id:`, `-- @title:`, `-- @desc:`), re-read on every request.

- `GET /api/queries` → `[{"id", "title", "desc", "sql"}]`
- `GET /api/queries/{id}/run` → `{"columns": [...], "rows": [[...]], "row_count", "elapsed_ms"}`. Runs in a READ ONLY transaction with a 5s statement timeout, always rolled back. 404 unknown id, 400 on SQL error.

## Report endpoints (read-only)

### `GET /api/reports/thong-ke`
Dashboard counts.
```json
{ "khoa": 3, "nganh": 5, "giang_vien": 8, "sinh_vien": 30, "hoc_phan": 12, "lop_hoc_phan": 10, "dang_ki": 60 }
```

### `GET /api/reports/bang-diem/{ma_sv}`
Transcript. `diem_tk = round(0.1*diem_cc + 0.3*diem_gk + 0.6*diem_ck, 2)`, `null` if any component is null.
`gpa_he10` = credit-weighted average of non-null `diem_tk` (rounded 2, `null` if none). `tong_tc` = sum of `so_tc` for rows with non-null `diem_tk`. 404 if student not found.
```json
{
  "sinh_vien": { "ma_sv": "SV001", "ten": "...", "ngaysinh": "2004-01-01", "ma_lophc": "..." , "ten_lop": "...", "ten_nganh": "..." },
  "ket_qua": [
    { "ma_hk": "HK1-2024", "ma_lop": "LHP001", "ma_hp": "HP001", "ten_hp": "...", "so_tc": 3,
      "diem_cc": 9.0, "diem_gk": 7.5, "diem_ck": 8.0, "diem_tk": 7.95 }
  ],
  "tong_tc": 3,
  "gpa_he10": 7.95
}
```
`ket_qua` ordered chronologically by `hocky.nam_hoc`, `hocky.ky`, then `ma_hp`.

### `GET /api/reports/thoi-khoa-bieu/{ma_sv}?ma_hk=...`
Student timetable (`ma_hk` optional filter). 404 if student not found. Ordered by `ngay`, `tiet_bd`.
```json
[ { "ngay": "2025-09-08", "tiet_bd": 1, "so_tiet": 3, "ma_lop": "LHP001", "ma_hp": "HP001",
    "ten_hp": "...", "ma_phong": "A101", "ten_gv": "..." } ]
```

### `GET /api/reports/lop-hoc-phan/{ma_lop}/sinh-vien`
Class roster. 404 if class not found.
```json
{
  "lop_hoc_phan": { "ma_lop": "LHP001", "ma_hp": "HP001", "ten_hp": "...", "ma_hk": "...", "ten_gv": "...", "ma_phong": "A101", "suc_chua": 60, "si_so": 25 },
  "sinh_vien": [ { "ma_sv": "SV001", "ten": "...", "ma_lophc": "...", "diem_cc": 9.0, "diem_gk": 7.5, "diem_ck": 8.0, "diem_tk": 7.95 } ]
}
```
`sinh_vien` ordered by `ma_sv`.
