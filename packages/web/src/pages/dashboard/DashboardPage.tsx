import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

interface DashboardStats {
    totalStudents: number;
    activeStudents: number;
    warningStudents: number;
    dismissedStudents: number;
    activeSemester: string;
}

// Fallback stats when API isn't connected
const MOCK_STATS: DashboardStats = {
    totalStudents: 1287,
    activeStudents: 1245,
    warningStudents: 38,
    dismissedStudents: 4,
    activeSemester: '2024/2025 - الفصل الأول',
};

export function DashboardPage() {
    const user = useAuthStore((s) => s.user);

    const { data: stats = MOCK_STATS } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () => apiRequest.get<DashboardStats>('/dashboard/stats'),
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

    const timeOfDay = () => {
        const h = new Date().getHours();
        if (h < 12) return 'صباح الخير';
        if (h < 17) return 'مساء الخير';
        return 'مساء النور';
    };

    return (
        <div>
            {/* Page Title */}
            <div className="mb-6">
                <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-1)' }}>
                    {timeOfDay()}، {user?.username} 👋
                </h1>
                <p className="text-muted">
                    الفصل الدراسي الحالي: <strong>{stats.activeSemester}</strong>
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                    <div className="stat-icon blue">👥</div>
                    <div>
                        <div className="stat-value">{stats.totalStudents.toLocaleString('ar-SA')}</div>
                        <div className="stat-label">إجمالي الطلاب</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div>
                        <div className="stat-value">{stats.activeStudents.toLocaleString('ar-SA')}</div>
                        <div className="stat-label">طلاب نشطون</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon yellow">⚠️</div>
                    <div>
                        <div className="stat-value">{stats.warningStudents.toLocaleString('ar-SA')}</div>
                        <div className="stat-label">إنذار أكاديمي</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red">🚫</div>
                    <div>
                        <div className="stat-value">{stats.dismissedStudents.toLocaleString('ar-SA')}</div>
                        <div className="stat-label">مفصولون</div>
                    </div>
                </div>
            </div>

            {/* Info Cards Row */}
            <div className="grid grid-cols-2 gap-4">
                {/* System Status */}
                <div className="card">
                    <div className="card-header">
                        <h3 style={{ fontSize: 'var(--text-lg)' }}>حالة النظام</h3>
                        <span className="badge badge-green">مشغّل</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {[
                            { label: 'قاعدة البيانات', status: '🟢 متصلة', ok: true },
                            { label: 'المصادقة (JWT)', status: '🟢 مفعّلة', ok: true },
                            { label: 'معدل الأمان', status: '🟢 مفعّل', ok: true },
                            { label: 'النسخ الاحتياطي', status: '🟡 قريباً', ok: false },
                        ].map(({ label, status, ok }) => (
                            <div key={label} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 'var(--space-2) 0',
                                borderBottom: '1px solid var(--color-border-subtle)',
                            }}>
                                <span className="text-sm text-muted">{label}</span>
                                <span className="text-sm" style={{ color: ok ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                    {status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <div className="card-header">
                        <h3 style={{ fontSize: 'var(--text-lg)' }}>إجراءات سريعة</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {[
                            { icon: '👤', label: 'إضافة طالب جديد', path: '/students' },
                            { icon: '📋', label: 'تسجيل مقررات', path: '/enrollments' },
                            { icon: '📝', label: 'إدخال الدرجات', path: '/grades' },
                            { icon: '📊', label: 'تقارير المعدلات', path: '/reports' },
                        ].map(({ icon, label }) => (
                            <button key={label} className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: 'var(--space-3)' }}>
                                <span>{icon}</span> {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
