import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'مدير النظام',
    REGISTRAR: 'مسجل',
    INSTRUCTOR: 'أستاذ',
    COORDINATOR: 'منسق',
    STUDENT: 'طالب',
};

const navItems = [
    { path: '/', label: 'الرئيسية', exact: true },
    { path: '/students', label: 'الطلاب', roles: ['ADMIN', 'REGISTRAR', 'COORDINATOR'] },
    { path: '/enrollments', label: 'التسجيل', roles: ['ADMIN', 'REGISTRAR'] },
    { path: '/grades', label: 'الدرجات', roles: ['ADMIN', 'REGISTRAR', 'INSTRUCTOR'] },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuthStore();

    const visibleNav = navItems.filter(
        (item) => !item.roles || (user && item.roles.includes(user.role))
    );

    return (
        <div className="app-layout">
            {/* Navbar */}
            <nav className="main-navbar" role="navigation" aria-label="القائمة الرئيسية">
                <div className="navbar-inner">
                    {/* Brand */}
                    <NavLink to="/" className="navbar-brand" aria-label="الصفحة الرئيسية">
                        <div className="brand-logo-circle" aria-hidden="true">🎓</div>
                        <span className="brand-title">جامعة بورتسودان الأهلية</span>
                    </NavLink>

                    {/* Nav links */}
                    <div className="navbar-nav">
                        {visibleNav.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.exact}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </div>

                    {/* User + logout */}
                    <div className="flex items-center gap-3">
                        {user && (
                            <div className="user-pill">
                                <span className="user-name">{user.username}</span>
                                <span className="user-role-tag">{ROLE_LABELS[user.role] ?? user.role}</span>
                            </div>
                        )}
                        <button
                            onClick={logout}
                            className="btn-logout-nav"
                            aria-label="تسجيل الخروج"
                        >
                            تسجيل الخروج
                        </button>
                    </div>
                </div>
            </nav>

            {/* Page content */}
            <main className="page-content" id="main-content">
                {children}
            </main>
        </div>
    );
}
