import { useState } from 'react'
import { BookOpen, FileText, LayoutDashboard, LogOut, Menu, Shield, UserRound, UploadCloud, X } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { demoUser, signOut } from '../../services/demoAuth'

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analyze-statement', label: 'Analyze Statement', icon: UploadCloud },
  { to: '/transactions', label: 'Transactions', icon: FileText },
]

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  function logout() {
    signOut()
    navigate('/login', { replace: true })
  }

  return <div className="app-shell">
    <button className="mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={22} /></button>
    {mobileOpen && <button className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
      <div className="brand"><div className="brand__mark"><Shield size={20} aria-hidden="true" /></div><div><strong>Sentinel</strong><span>Credit Card Fraud Detection</span></div><button className="sidebar__close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
      <div className="sidebar__section"><span className="sidebar__label">Workspace</span><nav aria-label="Workspace navigation">{navigation.map(({ to, label, icon: Icon }) => <NavItem key={to} to={to} label={label} icon={<Icon size={18} />} close={() => setMobileOpen(false)} />)}</nav></div>
      <div className="sidebar__section sidebar__section--learning"><span className="sidebar__label">Guidance</span><nav aria-label="Guidance navigation"><NavItem to="/how-it-works" label="How It Works" icon={<BookOpen size={18} />} close={() => setMobileOpen(false)} /></nav></div>
      <div className="sidebar__footer"><div className="sidebar-user"><span className="sidebar-user__avatar"><UserRound size={16} /></span><span className="sidebar-user__copy"><strong>{demoUser.name}</strong></span><span className="status-badge status-badge--neutral">Demo</span><button className="sidebar-user__logout" onClick={logout} aria-label="Logout"><LogOut size={15} /><span>Logout</span></button></div></div>
    </aside>
    <main className="main-content"><Outlet /></main>
  </div>
}

function NavItem({ to, label, icon, close }: { to: string; label: string; icon: React.ReactNode; close: () => void }) {
  return <NavLink to={to} onClick={close} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><span className="nav-item__icon">{icon}</span><span>{label}</span></NavLink>
}
