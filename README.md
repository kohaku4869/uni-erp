# University ERP

Bài tập lớn môn Cơ sở dữ liệu — hệ thống quản lý đào tạo đại học.

- **Database**: PostgreSQL 16 (chạy bằng Docker)
- **Backend**: FastAPI + SQLAlchemy 2.0 (`backend/`)
- **Frontend**: React + TypeScript + Vite + Ant Design (`frontend/`)

## Cấu trúc thư mục

```
uni-erp/
├── database/
│   ├── schema.sql        # DDL: 16 bảng + view v_ketqua (điểm tổng kết, điểm thang 4)
│   ├── triggers.sql      # 3 business rule khi đăng kí học phần
│   ├── seed.sql          # Dữ liệu mẫu (đi qua cả 3 trigger)
│   └── queries.sql       # 11 truy vấn (hiển thị ở trang "Truy vấn SQL")
├── docs/
│   └── API.md            # Đặc tả API (hợp đồng giữa backend và frontend)
├── backend/              # FastAPI
│   └── app/
│       ├── main.py       # Khởi tạo app, CORS, xử lý lỗi ràng buộc
│       ├── database.py   # Cấu hình, kết nối DB
│       ├── models.py     # 16 bảng (SQLAlchemy)
│       ├── schemas.py    # Validate dữ liệu vào/ra (Pydantic)
│       ├── crud.py       # API thêm/sửa/xóa dùng chung cho 16 bảng
│       ├── reports.py    # Báo cáo (truy vấn SQL JOIN)
│       └── queries.py    # Chạy các truy vấn trong database/queries.sql (chỉ đọc)
├── frontend/             # React
│   └── src/
│       ├── App.tsx       # Layout, menu, routes
│       ├── api.ts        # Gọi API
│       ├── resources.ts  # Cấu hình khai báo cho 16 bảng
│       ├── ResourcePage.tsx / ResourceForm.tsx   # Bảng + form dùng chung
│       └── pages/        # Dashboard, 3 trang báo cáo, trang Truy vấn SQL
├── docker-compose.yml
└── dev.py                # Chạy cả 3 phần bằng một lệnh
```

## Chạy dự án

Yêu cầu: Docker Desktop, Python 3.12 + [uv](https://docs.astral.sh/uv/), Node.js 20+.

### Cách nhanh: chạy cả 3 bằng một lệnh

```bash
python dev.py            # DB + backend + frontend, Ctrl+C để dừng
python dev.py --stop-db  # dừng luôn container DB khi thoát
```

Script tự tạo `backend/.env` và chạy `npm install` nếu chưa có, log của từng phần được tô màu `[ db]`, `[api]`, `[web]`.

### Hoặc chạy từng phần

### 1. Database

```bash
docker compose up -d
```

Postgres chạy ở `localhost:5433` (user / password / db: `uni_erp`). Lần đầu khởi động sẽ tự chạy `schema.sql` → `triggers.sql` → `seed.sql` (trigger nạp trước nên dữ liệu mẫu cũng phải thoả mọi business rule).

Muốn tạo lại DB từ đầu (sau khi sửa schema/seed):

```bash
docker compose down -v
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload
```

API: http://localhost:8000/api — Swagger UI: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Mở http://localhost:5173 (Vite tự proxy `/api` sang backend).

## Chức năng

- CRUD đầy đủ cho cả 16 bảng, kể cả bảng có khóa chính phức hợp (`lich`, `dangki`, `renluyen`, ...).
- Ràng buộc toàn vẹn (khóa ngoại, CHECK, UNIQUE) được kiểm tra ở DB và trả lỗi dễ hiểu (409 / 400).
- Business rules (trigger trên bảng `dangki`, chạy cả khi INSERT lẫn UPDATE đổi SV/lớp):
  1. Chưa có điểm tổng kết ≥ 4.0 ở môn tiên quyết → không được đăng kí.
  2. Bị cảnh báo học vụ ở học kỳ liền trước → tối đa 14 tín chỉ trong học kỳ.
  3. Sĩ số lớp không vượt sức chứa phòng học (có khoá dòng chống đăng kí đồng thời).
- Trang **Truy vấn SQL**: 9 truy vấn theo đề (Cơ bản, Inner Join, Group By, Having, Outer Join, NOT EXISTS, Division, Window + CTE, Recursive CTE) + xét tốt nghiệp + xét cảnh báo học vụ; xem câu SQL và kết quả trực tiếp.
- Báo cáo: thống kê tổng quan, bảng điểm + GPA sinh viên, thời khóa biểu, danh sách lớp học phần.
