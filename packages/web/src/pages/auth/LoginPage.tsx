import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export function LoginPage() {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const [form, setForm] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    const mutation = useMutation({
        mutationFn: async (creds: typeof form) => {
            const res = await api.post<{ success: boolean; data: { token: string; user: any } }>(
                '/auth/login', creds
            );
            return res.data.data;
        },
        onSuccess: (data) => {
            login(data.token, data.user);
            navigate('/', { replace: true });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.username || !form.password) return;
        mutation.mutate(form);
    };

    const errorMsg = mutation.isError
        ? (mutation.error as any)?.response?.data?.error?.message_ar || 'اسم المستخدم أو كلمة المرور غير صحيحة'
        : null;

    return (
        <div className="login-page">
            <div className="login-card">
                {/* University logo mark */}
                <div className="login-header">
                    <div className="login-logo-mark">🎓</div>
                    <h2>نظام الإدارة الأكاديمية</h2>
                    <p>جامعة بورتسودان الأهلية</p>
                </div>

                {errorMsg && (
                    <div className="alert alert-error mb-4" role="alert">
                        <span>⚠️</span>
                        <span>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label className="form-label required" htmlFor="username">
                            اسم المستخدم
                        </label>
                        <input
                            id="username"
                            type="text"
                            className="form-input"
                            placeholder="أدخل اسم المستخدم"
                            value={form.username}
                            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                            autoComplete="username"
                            autoFocus
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label required" htmlFor="password">
                            كلمة المرور
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="أدخل كلمة المرور"
                                value={form.password}
                                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                autoComplete="current-password"
                                required
                                style={{ paddingLeft: '2.5rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                style={{
                                    position: 'absolute',
                                    left: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--clr-text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    lineHeight: 1,
                                    padding: 0,
                                }}
                                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={`btn btn-primary btn-block btn-lg mt-4 ${mutation.isPending ? 'btn-loading' : ''}`}
                        disabled={mutation.isPending || !form.username || !form.password}
                    >
                        {mutation.isPending ? '' : 'تسجيل الدخول'}
                    </button>
                </form>

                <p className="text-center text-xs text-muted mt-6" style={{ lineHeight: 1.8 }}>
                    نظام آمن — بيانات 30,000 طالب محمية
                    <br />
                    <span className="latin">Port Sudan Ahlia University — Academic System v2.0</span>
                </p>
            </div>
        </div>
    );
}
