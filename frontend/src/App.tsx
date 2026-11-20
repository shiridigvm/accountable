import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate } from './components/AuthGate';
import { Layout } from './components/Layout';
import { PageHeader } from './components/PageHeader';
import Contacts from './pages/Contacts';
import Deals from './pages/Deals';
import ContactDetail from './pages/ContactDetail';
import DealDetail from './pages/DealDetail';
import OrganizationDetail from './pages/OrganizationDetail';
import Organizations from './pages/Organizations';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="deals" element={<Deals />} />
          <Route path="organizations/:id" element={<OrganizationDetail />} />
          <Route path="contacts/:id" element={<ContactDetail />} />
          <Route path="deals/:id" element={<DealDetail />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="*" element={<PageHeader title="Page not found" />} />
        </Route>
      </Routes>
    </AuthGate>
  );
}
