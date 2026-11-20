import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { GuestOnly, RequireAuth, RequireRole } from './auth/RouteGuards';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import AccountPage from './features/auth/AccountPage';
import StoreListPage from './features/vendors/StoreListPage';
import StoreDetailPage from './features/vendors/StoreDetailPage';
import VendorProfilePage from './features/vendors/VendorProfilePage';
import MenuItemsPage from './features/menu/MenuItemsPage';
import MenuItemFormPage from './features/menu/MenuItemFormPage';
import ListingsPage from './features/listings/ListingsPage';
import NewListingPage from './features/listings/NewListingPage';
import UsersPage from './features/admin/UsersPage';
import UserDetailPage from './features/admin/UserDetailPage';
import ProvisionVendorPage from './features/admin/ProvisionVendorPage';
import AuditLogPage from './features/admin/AuditLogPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />

        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="account" element={<AccountPage />} />
          <Route path="stores" element={<StoreListPage />} />
          <Route path="stores/:id" element={<StoreDetailPage />} />

          <Route element={<RequireRole roles={['vendor']} />}>
            <Route path="my-store" element={<VendorProfilePage />} />
            <Route path="menu" element={<MenuItemsPage />} />
            <Route path="menu/new" element={<MenuItemFormPage />} />
            <Route path="menu/:id" element={<MenuItemFormPage />} />
            <Route path="listings" element={<ListingsPage />} />
            <Route path="listings/new" element={<NewListingPage />} />
          </Route>

          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="admin/users" element={<UsersPage />} />
            <Route path="admin/users/:id" element={<UserDetailPage />} />
            <Route path="admin/vendors/new" element={<ProvisionVendorPage />} />
            <Route path="admin/audit" element={<AuditLogPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
