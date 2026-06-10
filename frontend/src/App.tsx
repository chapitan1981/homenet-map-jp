import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import RoomsPage from './pages/RoomsPage';
import DevicesPage from './pages/DevicesPage';
import DeviceDetailPage from './pages/DeviceDetailPage';
import MonitoringCenterPage from './pages/MonitoringCenterPage';
import InfrastructureMonitorPage from './pages/InfrastructureMonitorPage';
import StableDashboardPage from './pages/StableDashboardPage';
import AutoDiscoveryPage from './pages/AutoDiscoveryPage';
import HomeLabDashboardPage from './pages/HomeLabDashboardPage';
import HomeLabHealthPage from './pages/HomeLabHealthPage';
import MonitoringPage from './pages/MonitoringPage';
import DiagramPage from './pages/DiagramPage';
import RoomLayoutPage from './pages/RoomLayoutPage';
import BackupPage from './pages/BackupPage';
import DataProtectionPage from './pages/DataProtectionPage';
import ManualPage from './pages/ManualPage';
import SettingsPage from './pages/SettingsPage';
import RackPage from './pages/RackPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/devices/:id" element={<DeviceDetailPage />} />
          <Route path="/center" element={<MonitoringCenterPage />} />
          <Route path="/infra" element={<InfrastructureMonitorPage />} />
          <Route path="/stable" element={<StableDashboardPage />} />
          <Route path="/discovery" element={<AutoDiscoveryPage />} />
          <Route path="/homelab" element={<HomeLabDashboardPage />} />
          <Route path="/health" element={<HomeLabHealthPage />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/diagram" element={<DiagramPage />} />
          <Route path="/room-layout" element={<RoomLayoutPage />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="/racks" element={<RackPage />} />
          <Route path="/data-protection" element={<DataProtectionPage />} />
          <Route path="/manual" element={<ManualPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
