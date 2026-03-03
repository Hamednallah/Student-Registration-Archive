import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'مدير النظام',
    REGISTRAR: 'مسجل',
    INSTRUCTOR: 'أستاذ',
    COORDINATOR: 'منسق',
    STUDENT: 'طالب',
};

const navItems = [
    { path: '/', icon: '📊', label: 'لوحة التحكم', exact: true },
    { path: '/students', icon: '👥', label: 'الطلاب', roles: ['ADMIN', 'REGISTRAR', 'COORDINATOR'] },
    { path: '/enrollments', icon: '📋', label: 'التسجيل', roles: ['ADMIN', 'REGISTRAR'] },
    { path: '/grades', icon: '📝', label: 'الدرجات', roles: ['ADMIN', 'REGISTRAR', 'INSTRUCTOR'] },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const visibleNav = navItems.filter(
        (item) => !item.roles || (user && item.roles.includes(user.role))
    );

    const userInitials = user?.username?.slice(0, 2).toUpperCase() ?? '??';

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <h1>🎓 PSAU</h1>
                    <p>نظام الإدارة الأكاديمية</p>
                </div>

                <nav className="nav-section" aria-label="القائمة الرئيسية">
                    <div className="nav-section-title">القائمة</div>
                    {visibleNav.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar" aria-hidden="true">{userInitials}</div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div className="user-name truncate">{user?.username}</div>
                            <div className="user-role">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</div>
                        </div>
                        <button
                            onClick={logout}
                            className="btn btn-ghost btn-sm"
                            aria-label="تسجيل الخروج"
                            title="تسجيل الخروج"
                            style={{ flexShrink: 0 }}
                        >
                            🚪
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="main-content" id="main-content">
                <header className="page-header">
                    <div style={{ flex: 1 }} />
                    <span className="text-xs text-muted latin">v2.0.0</span>
                </header>
                <div className="page-body">
                    {children}
                </div>
            </main>
        </div>
    );
}
