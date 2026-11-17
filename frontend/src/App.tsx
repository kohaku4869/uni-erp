import { BrowserRouter, Link, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { App as AntApp, ConfigProvider, Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import { DashboardOutlined } from '@ant-design/icons'
import viVN from 'antd/locale/vi_VN'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { RESOURCE_MAP } from './resources'
import ResourcePage from './ResourcePage'
import Dashboard from './pages/Dashboard'
import BangDiem from './pages/BangDiem'
import ThoiKhoaBieu from './pages/ThoiKhoaBieu'
import DanhSachLop from './pages/DanhSachLop'
import TruyVan from './pages/TruyVan'

dayjs.locale('vi')

const link = (to: string, label?: string) => ({
  key: to,
  label: <Link to={to}>{label}</Link>,
})
const res = (key: string, label?: string) => link(`/r/${key}`, label ?? RESOURCE_MAP[key].label)

const menuItems: MenuProps['items'] = [
  { ...link('/', 'Tổng quan'), icon: <DashboardOutlined /> },
  {
    key: 'g-to-chuc',
    label: 'Tổ chức',
    type: 'group',
    children: [res('khoa'), res('nganh'), res('giang-vien'), res('lop-hanh-chinh'), res('sinh-vien')],
  },
  {
    key: 'g-dao-tao',
    label: 'Đào tạo',
    type: 'group',
    children: [
      res('hoc-ky'),
      res('hoc-phan'),
      res('phong-hoc'),
      res('lop-hoc-phan'),
      res('lich'),
      res('dang-ki'),
      res('chuong-trinh-dao-tao', 'CTĐT'),
      res('tien-quyet'),
    ],
  },
  {
    key: 'g-ctsv',
    label: 'Công tác SV',
    type: 'group',
    children: [res('ren-luyen'), res('hoc-phi'), res('canh-bao', 'Cảnh báo')],
  },
  {
    key: 'g-bao-cao',
    label: 'Báo cáo',
    type: 'group',
    children: [
      link('/bao-cao/bang-diem', 'Bảng điểm'),
      link('/bao-cao/thoi-khoa-bieu', 'Thời khóa biểu'),
      link('/bao-cao/danh-sach-lop', 'Danh sách lớp HP'),
      link('/bao-cao/truy-van', 'Truy vấn SQL'),
    ],
  },
]

function MainLayout() {
  const { pathname } = useLocation()
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider
        width={240}
        theme="light"
        breakpoint="lg"
        collapsedWidth={0}
        style={{ overflow: 'auto', maxHeight: '100vh', position: 'sticky', top: 0 }}
      >
        <div style={{ padding: 16, fontWeight: 700, fontSize: 18 }}>University ERP</div>
        <Menu mode="inline" selectedKeys={[pathname]} items={menuItems} style={{ borderInlineEnd: 0 }} />
      </Layout.Sider>
      <Layout>
        <Layout.Content style={{ padding: 24 }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}

export default function App() {
  return (
    <ConfigProvider locale={viVN}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="r/:resourceKey" element={<ResourcePage />} />
              <Route path="bao-cao/bang-diem" element={<BangDiem />} />
              <Route path="bao-cao/thoi-khoa-bieu" element={<ThoiKhoaBieu />} />
              <Route path="bao-cao/danh-sach-lop" element={<DanhSachLop />} />
              <Route path="bao-cao/truy-van" element={<TruyVan />} />
              <Route path="*" element={<Dashboard />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}
