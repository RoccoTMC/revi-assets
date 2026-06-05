import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AssetList from './pages/AssetList';
import AssetForm from './pages/AssetForm';
import AssetDetail from './pages/AssetDetail';
import AssetLabel from './pages/AssetLabel';
import AssetPublicView from './pages/AssetPublicView';
import Reports from './pages/Reports';

const isLoggedIn = () => {
  const token = localStorage.getItem('revi_token');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

const PrivateRoute = ({ children }: { children: React.ReactNode }) =>
  isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="activos" element={<AssetList />} />
          <Route path="activos/nuevo" element={<AssetForm />} />
          <Route path="activos/:id" element={<AssetDetail />} />
          <Route path="activos/:id/editar" element={<AssetForm />} />
          <Route path="activos/:id/etiqueta" element={<AssetLabel />} />
          <Route path="ver" element={<AssetPublicView />} />
          <Route path="reportes" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
