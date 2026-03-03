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

const MOCK_STATS: DashboardStats = {
    totalStudents: 1287,
    activeStudents: 1245,
    warningStudents: 38,
    dismissedStudents: 4,
    activeSemester: '2024/2025 — الفصل الأول',
};

export function DashboardPage() {
    const user = useAuthStore((s) => s.user);

    const { data: stats = MOCK_STATS } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () => apiRequest.get<DashboardStats>('/dashboard/stats'),
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'صباح الخير';
        if (h < 17) return 'مساء الخير';
        return 'مساء النور';
    };

    return (
        <div>
            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1>{greeting()}، {user?.username}</h1>
                    <p className="mt-2 text-muted text-sm">
                        الفصل الدراسي الحالي: <strong>{stats.activeSemester}</strong>
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="stat-card">
                    <div className="stat-icon purple">👥</div>
                    <div>
                        <div className="stat-value">{stats.totalStudents.toLocaleString('ar-SA')}</div>
                        <div className="stat-label">إجمالي الطلاب</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success">✅</div>
                    <div>
                        <div className="stat-value">{stats.activeStudents.toLocaleString('ar-SA')}</div>
                        <div className="stat-label">طلاب نشطون</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning">⚠️</div>
                    <div>
                        <div className="stat-value">{stats.warningStudents.toLocaleString('ar-SA')}</div>
                        <div className="stat-label">إنذار أكاديمي</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon danger">🚫</div>
                    <div>
                        <div className="stat-value">{stats.dismissedStudents.toLocaleString('ar-SA')}</div>
                        <div className="stat-label">مفصولون</div>
                    </div>
                </div>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-2 gap-6">
                <div className="card">
                    <div className="card-header">
                        <h3>حالة النظام</h3>
                        <span className="badge badge-success">مشغّل</span>
                    </div>
                    <div className="card-body">
                        {[
                            { label: 'قاعدة البيانات', status: 'متصلة', ok: true },
                            { label: 'المصادقة (JWT)', status: 'مفعّلة', ok: true },
                            { label: 'معدل الأمان (Rate Limiter)', status: 'مفعّل', ok: true },
                            { label: 'خادم الواجهة الأمامية', status: 'يعمل', ok: true },
                            { label: 'النسخ الاحتياطي', status: 'قريباً', ok: false },
                        ].map(({ label, status, ok }) => (
                            <div key={label} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: 'var(--space-3) 0',
                                borderBottom: '1px solid var(--clr-border)',
                            }}>
                                <span className="text-sm text-muted">{label}</span>
                                <span className="text-sm" style={{ color: ok ? 'var(--clr-success-600)' : 'var(--clr-warning-600)', fontWeight: 500 }}>
                                    {ok ? '●' : '○'} {status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3>إجراءات سريعة</h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {[
                            { label: 'إضافة طالب جديد', path: '/students' },
                            { label: 'تسجيل مقررات', path: '/enrollments' },
                            { label: 'إدخال الدرجات', path: '/grades' },
                            { label: 'تقارير المعدلات التراكمية', path: '/reports' },
                        ].map(({ label }) => (
                            <button key={label} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
