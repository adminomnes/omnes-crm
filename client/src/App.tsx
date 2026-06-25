import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/dashboard/Dashboard';
import ClientList from './pages/clients/ClientList';
import ServiceList from './pages/services/ServiceList';
import QuotationList from './pages/quotations/QuotationList';
import QuotationForm from './pages/quotations/QuotationForm';
import ContractList from './pages/contracts/ContractList';
import ContractForm from './pages/contracts/ContractForm';
import CompanyConfig from './pages/config/CompanyConfig';
import DocumentList from './pages/documents/DocumentList';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<ClientList />} />
        <Route path="servicios" element={<ServiceList />} />
        <Route path="cotizaciones" element={<QuotationList />} />
        <Route path="cotizaciones/nueva" element={<QuotationForm />} />
        <Route path="cotizaciones/:id" element={<QuotationForm />} />
        <Route path="contratos" element={<ContractList />} />
        <Route path="contratos/nuevo" element={<ContractForm />} />
        <Route path="contratos/:id" element={<ContractForm />} />
        <Route path="configuracion" element={<CompanyConfig />} />
        <Route path="documentos" element={<DocumentList />} />
      </Route>
    </Routes>
  );
}
