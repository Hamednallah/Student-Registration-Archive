import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';

interface Student {
    id: number;
    student_number: string;
    name_ar: string;
    name_en: string;
    current_level: number;
    academic_status: string;
    cgpa: number;
    department_name?: string;
}

interface PaginatedStudents {
    items: Student[];
    total: number;
    page: number;
    limit: number;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
    GOOD: { label: 'وضع جيد', cls: 'badge-green' },
    WARNING_1: { label: 'إنذار أول', cls: 'badge-yellow' },
    WARNING_2: { label: 'إنذار ثاني', cls: 'badge-yellow' },
    DISMISSED: { label: 'مفصول', cls: 'badge-red' },
    REPEAT_YEAR: { label: 'إعادة سنة', cls: 'badge-yellow' },
    GRADUATED: { label: 'متخرج', cls: 'badge-blue' },
};

// Mock data for when API isn't connected
const MOCK_STUDENTS: PaginatedStudents = {
    total: 2,
    page: 1,
    limit: 20,
    items: [
        { id: 1, student_number: 'S2024001', name_ar: 'أحمد محمد', name_en: 'Ahmed Mohammed', current_level: 2, academic_status: 'GOOD', cgpa: 3.45, department_name: 'علوم الحاسوب' },
        { id: 2, student_number: 'S2024002', name_ar: 'فاطمة علي', name_en: 'Fatima Ali', current_level: 1, academic_status: 'GOOD', cgpa: 0.0, department_name: 'علوم الحاسوب' },
    ],
};

export function StudentsPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['students', page, search],
        queryFn: () => apiRequest.get<PaginatedStudents>(`/students?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
        placeholderData: (prev) => prev,
        staleTime: 1000 * 60,
        retry: false,
    });

    const students = data ?? MOCK_STUDENTS;
    const totalPages = Math.ceil(students.total / limit);

    return (
        <div>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 style={{ fontSize: 'var(--text-3xl)' }}>الطلاب</h1>
                    <p className="text-muted text-sm">
                        إجمالي: {students.total.toLocaleString('ar-SA')} طالب
                    </p>
                </div>
                <button className="btn btn-primary">
                    ➕ إضافة طالب
                </button>
            </div>

            {/* Search & Filters */}
            <div className="flex gap-3 mb-4">
                <div className="search-bar" style={{ flex: 1 }}>
                    <span className="search-icon">🔍</span>
                    <input
                        type="search"
                        placeholder="ابحث بالاسم أو الرقم الجامعي..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        aria-label="بحث عن طالب"
                    />
                </div>
                <select className="form-select" style={{ width: 'auto' }} aria-label="فلتر الحالة الأكاديمية">
                    <option value="">جميع الحالات</option>
                    <option value="GOOD">وضع جيد</option>
                    <option value="WARNING_1">إنذار أول</option>
                    <option value="WARNING_2">إنذار ثاني</option>
                    <option value="DISMISSED">مفصول</option>
                </select>
                <select className="form-select" style={{ width: 'auto' }} aria-label="فلتر المستوى">
                    <option value="">جميع المستويات</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                        <option key={l} value={l}>المستوى {l}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="table-container p-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />
                    ))}
                </div>
            ) : (
                <div className="table-container">
                    <table className="table" aria-label="قائمة الطلاب">
                        <thead>
                            <tr>
                                <th>الرقم الجامعي</th>
                                <th>الاسم</th>
                                <th>القسم</th>
                                <th>المستوى</th>
                                <th>المعدل التراكمي</th>
                                <th>الحالة الأكاديمية</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
                                        لا توجد نتائج
                                    </td>
                                </tr>
                            ) : students.items.map((student) => {
                                const statusInfo = STATUS_LABELS[student.academic_status] ?? { label: student.academic_status, cls: 'badge-grey' };
                                return (
                                    <tr key={student.id}>
                                        <td>
                                            <span className="latin" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                                {student.student_number}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{student.name_ar}</div>
                                            <div className="text-xs text-muted latin">{student.name_en}</div>
                                        </td>
                                        <td className="text-muted">{student.department_name ?? '—'}</td>
                                        <td>
                                            <span style={{
                                                background: 'var(--color-bg-overlay)',
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-full)',
                                                fontSize: 'var(--text-xs)',
                                                fontWeight: 600,
                                            }}>
                                                {student.current_level}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`latin font-semibold ${student.cgpa >= 2.0 ? 'text-success' : 'text-error'}`}>
                                                {student.cgpa.toFixed(2)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button className="btn btn-ghost btn-sm" title="عرض" aria-label={`عرض ${student.name_ar}`}>👁️</button>
                                                <button className="btn btn-ghost btn-sm" title="تعديل" aria-label={`تعديل ${student.name_ar}`}>✏️</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        aria-label="الصفحة السابقة"
                    >
                        ›
                    </button>
                    <span className="page-info">
                        الصفحة {page} من {totalPages}
                    </span>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        aria-label="الصفحة التالية"
                    >
                        ‹
                    </button>
                </div>
            )}
        </div>
    );
}
