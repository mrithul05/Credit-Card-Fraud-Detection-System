import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Activity, BookOpen, ChevronRight, FileSearch, LayoutDashboard, Menu, Shield, X } from 'lucide-react'
import { BackendStatus } from '../ui/BackendStatus'

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/check-transaction', label: 'Check Transaction', icon: FileSearch },
  { to: '/transactions', label: 'Transaction History', icon: Activity },
]

const learningNavigation = [
  { to: '/model-information', label: 'Model Information', icon: BookOpen },
  { to: '/how-it-works', label: 'How It Works', icon: ChevronRight },
]

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="app-shell">
      <button className="mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
        <Menu size={22} />
      </button>
      {mobileOpen && <button className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="brand">
          <div className="brand__mark"><Shield size={20} aria-hidden="true" /></div>
          <div><strong>Sentinel</strong><span>Fraud detection lab</span></div>
          <button className="sidebar__close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>
        <div className="sidebar__section">
          <span className="sidebar__label">Workspace</span>
          <nav aria-label="Workspace navigation">
            {navigation.map(({ to, label, icon: Icon }) => <NavItem key={to} to={to} label={label} icon={<Icon size={18} />} close={() => setMobileOpen(false)} />)}
          </nav>
        </div>
        <div className="sidebar__section sidebar__section--learning">
          <span className="sidebar__label">Project guide</span>
          <nav aria-label="Project guide navigation">
            {learningNavigation.map(({ to, label, icon: Icon }) => <NavItem key={to} to={to} label={label} icon={<Icon size={18} />} close={() => setMobileOpen(false)} />)}
          </nav>
        </div>
        <div className="sidebar__footer"><BackendStatus /></div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

function NavItem({ to, label, icon, close }: { to: string; label: string; icon: React.ReactNode; close: () => void }) {
  return <NavLink to={to} onClick={close} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
    {icon}<span>{label}</span>
  </NavLink>
}
