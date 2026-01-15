import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button, Input } from '@/components/ui';

const loginSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
    const navigate = useNavigate();
    const { login, isAuthenticated, isLoading: authLoading } = useAuth();
    const { error: showError } = useToast();
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    // Redirect if already authenticated
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const onSubmit = async (data: LoginFormData) => {
        setIsSubmitting(true);
        try {
            await login(data);
            navigate('/dashboard');
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-12 flex-col justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                            <Building2 className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">EBH System</h1>
                            <p className="text-primary-200 text-sm">Quản lý vật tư xây dựng</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div>
                        <h2 className="text-4xl font-bold text-white leading-tight">
                            Số hóa quy trình<br />
                            <span className="text-primary-200">quản lý vật tư</span>
                        </h2>
                        <p className="text-primary-200 mt-4 text-lg leading-relaxed">
                            Tự động quy đổi Tấn ↔ m³, theo dõi tồn kho, vận tải và hiệu quả dự án
                            trong thời gian thực.
                        </p>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { title: 'Nhập mua', desc: 'Ghi nhận nhanh tại hiện trường' },
                            { title: 'Xuất bán', desc: 'Theo dõi xe & chuyến hàng' },
                            { title: 'Tồn kho', desc: 'Real-time Tấn & m³' },
                            { title: 'Báo cáo', desc: 'Lãi/lỗ theo dự án' },
                        ].map((feature) => (
                            <div
                                key={feature.title}
                                className="bg-white/10 backdrop-blur rounded-xl p-4"
                            >
                                <h3 className="font-semibold text-white">{feature.title}</h3>
                                <p className="text-primary-200 text-sm mt-1">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-primary-300 text-sm">
                    © 2024 EBH System. All rights reserved.
                </p>
            </div>

            {/* Right side - Login form */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">EBH System</h1>
                            <p className="text-slate-500 text-sm">Quản lý vật tư xây dựng</p>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900">Đăng nhập</h2>
                        <p className="text-slate-500 mt-2">
                            Nhập thông tin đăng nhập để tiếp tục
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="email@example.com"
                            leftIcon={<Mail className="w-5 h-5" />}
                            error={errors.email?.message}
                            {...register('email')}
                        />

                        <div className="form-group">
                            <label className="label">Mật khẩu</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                                    {...register('password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-sm text-danger-600 mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-slate-600">Ghi nhớ đăng nhập</span>
                            </label>
                            <a
                                href="#"
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Quên mật khẩu?
                            </a>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            isLoading={isSubmitting}
                        >
                            Đăng nhập
                        </Button>
                    </form>

                    {/* Demo account info */}
                    <div className="mt-8 p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-600 font-medium mb-2">
                            Tài khoản demo:
                        </p>
                        <div className="space-y-1 text-sm text-slate-500">
                            <p>Admin: admin@ebh.vn / admin123</p>
                            <p>Kế toán: accountant@ebh.vn / accountant123</p>
                            <p>Nhân viên: staff@ebh.vn / staff123</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
