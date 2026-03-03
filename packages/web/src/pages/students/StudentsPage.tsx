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

interface PaginatedStudents { items: Student[]; total: number; page: number; limit: number; }

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    GOOD: { label: 'وضع جيد', cls: 'badge-success' },
    WARNING_1: { label: 'إنذار أول', cls: 'badge-warning' },
    WARNING_2: { label: 'إنذار ثاني', cls: 'badge-warning' },
    DISMISSED: { label: 'مفصول', cls: 'badge-danger' },
    REPEAT_YEAR: { label: 'إعادة سنة', cls: 'badge-warning' },
    GRADUATED: { label: 'متخرج', cls: 'badge-info' },
};

const MOCK_STUDENTS: PaginatedStudents = {
    total: 2, page: 1, limit: 20,
    items: [
        { id: 1, student_number: 'S2024001', name_ar: 'أحمد محمد', name_en: 'Ahmed Mohammed', current_level: 2, academic_status: 'GOOD', cgpa: 3.45, department_name: 'علوم الحاسوب' },
        { id: 2, student_number: 'S2024002', name_ar: 'فاطمة علي', name_en: 'Fatima Ali', current_level: 1, academic_status: 'GOOD', cgpa: 0.00, department_name: 'علوم الحاسوب' },
    ],
};

export function StudentsPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;

    const { data, isLoading } = useQuery({
        queryKey: ['students', page, search],
        queryFn: () => apiRequest.get<PaginatedStudents>(
            `/students?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
        ),
        placeholderData: (prev) => prev,
        staleTime: 1000 * 60,
        retry: false,
    });

    const students = data ?? MOCK_STUDENTS;
    const totalPages = Math.ceil(students.total / limit);

    return (
        <div>
            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1>الطلاب</h1>
                    <p className="text-sm text-muted mt-2">
                        إجمالي: {students.total.toLocaleString('ar-SA')} طالب
                    </p>
                </div>
                <div>
                    <button className="btn btn-primary">إضافة طالب</button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="search-bar" style={{ flex: 1 }}>
                    <span className="search-icon" aria-hidden="true">🔍</span>
                    <input
                        type="search"
                        placeholder="ابحث بالاسم أو الرقم الجامعي..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        aria-label="بحث عن طالب"
                    />
                </div>
                <select
                    className="form-select"
                    style={{ width: 'auto', height: 'var(--input-height)' }}
                    aria-label="فلتر الحالة"
                >
                    <option value="">جميع الحالات</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                <select
                    className="form-select"
                    style={{ width: 'auto', height: 'var(--input-height)' }}
                    aria-label="فلتر المستوى"
                >
                    <option value="">جميع المستويات</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(l => <option key={l} value={l}>المستوى {l}</option>)}
                </select>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="table-container" style={{ padding: 'var(--space-6)' }}>
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
                                    <td colSpan={7} className="no-data">لا توجد نتائج مطابقة للبحث</td>
                                </tr>
                            ) : students.items.map((student) => {
                                const cfg = STATUS_CONFIG[student.academic_status] ?? { label: student.academic_status, cls: 'badge-muted' };
                                return (
                                    <tr key={student.id}>
                                        <td>
                                            <code className="latin" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--clr-text-secondary)' }}>
                                                {student.student_number}
                                            </code>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{student.name_ar}</div>
                                            <div className="text-xs text-muted latin">{student.name_en}</div>
                                        </td>
                                        <td className="text-muted">{student.department_name ?? '—'}</td>
                                        <td>
                                            <span className="badge badge-purple">المستوى {student.current_level}</span>
                                        </td>
                                        <td>
                                            <span
                                                className="latin font-bold"
                                                style={{ color: student.cgpa >= 2.0 ? 'var(--clr-success-600)' : 'var(--clr-error-600)' }}
                                            >
                                                {student.cgpa.toFixed(2)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button className="btn-icon" title="عرض" aria-label={`عرض ${student.name_ar}`}>👁</button>
                                                <button className="btn-icon" title="تعديل" aria-label={`تعديل ${student.name_ar}`}>✏</button>
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
                        className={`pagination-btn prev ${page === 1 ? 'disabled' : ''}`}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        aria-label="الصفحة السابقة"
                    >›</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                        <button
                            key={n}
                            className={`pagination-btn ${n === page ? 'active' : ''}`}
                            onClick={() => setPage(n)}
                            aria-label={`الصفحة ${n}`}
                            aria-current={n === page ? 'page' : undefined}
                        >
                            {n}
                        </button>
                    ))}
                    <button
                        className={`pagination-btn next ${page === totalPages ? 'disabled' : ''}`}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        aria-label="الصفحة التالية"
                    >‹</button>
                </div>
            )}
        </div>
    );
}
