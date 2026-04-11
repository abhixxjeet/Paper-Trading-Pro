import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ isAdmin = false }) {
  return (
    <div className="flex h-screen overflow-hidden bg-dark-950">
      {/* Sidebar Navigation */}
      <Sidebar isAdmin={isAdmin} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 bg-hero-pattern">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
