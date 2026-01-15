import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { SystemSettings } from '@/types';
import {
    Card, CardHeader, CardTitle, CardContent,
    Input,
    Button,
    Label
} from '@/components/ui';
import { Loader2, Save, Upload, Building2, Users } from 'lucide-react';

export const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const { success: showSuccess, error: showError } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const { register, handleSubmit, setValue } = useForm<SystemSettings>();

    const isAdmin = user?.role?.name === 'admin';

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.settings.get() as any;
                if (response.success && response.data) {
                    const settings = response.data;
                    // Set form values
                    Object.keys(settings).forEach(key => {
                        setValue(key as keyof SystemSettings, settings[key]);
                    });
                    if (settings.logoUrl) {
                        setLogoPreview(settings.logoUrl);
                    }
                }
            } catch (err) {
                console.error('Failed to load settings:', err);
                showError('Không thể tải thông tin cài đặt');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [setValue, showError]);

    const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                showError('Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB');
                return;
            }

            try {
                // Upload immediately
                const res = await api.settings.uploadLogo(file) as any;

                if (res.success) {
                    const newLogoUrl = res.data.logoUrl;
                    setLogoPreview(newLogoUrl);
                    setValue('logoUrl', newLogoUrl);
                    showSuccess('Cập nhật logo thành công');

                    // Force a reload of the sidebar logo somehow - for now rely on page refresh or create a context event later
                    // A quick hack is to reload window, but better to dispatch a custom event
                    window.dispatchEvent(new Event('settings-updated'));
                }
            } catch (err: any) {
                console.error(err);
                showError('Lỗi tải logo: ' + (err.message || 'Không xác định'));
            }
        }
    };


    const onSubmit = async (data: SystemSettings) => {
        if (!isAdmin) {
            showError('Bạn không có quyền thực hiện thay đổi này');
            return;
        }

        try {
            setIsSaving(true);
            const updated = await api.settings.update(data);
            if (updated) {
                showSuccess('Cập nhật cài đặt thành công');
            }
        } catch (err) {
            console.error('Failed to save settings:', err);
            showError('Lỗi khi lưu cài đặt');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center string h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Building2 className="w-8 h-8 text-blue-600" />
                Cài đặt hệ thống
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column: Logo */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">Logo Doanh nghiệp</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 relative group">
                            {logoPreview ? (
                                <img
                                    src={logoPreview}
                                    alt="Company Logo"
                                    className="w-full h-full object-contain p-2"
                                />
                            ) : (
                                <span className="text-gray-400">Chưa có logo</span>
                            )}

                            {isAdmin && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Label
                                        htmlFor="logo-upload"
                                        className="cursor-pointer text-white flex flex-col items-center gap-2 hover:scale-105 transition-transform"
                                    >
                                        <Upload className="w-8 h-8" />
                                        <span>Thay đổi</span>
                                    </Label>
                                </div>
                            )}
                        </div>

                        <Input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoChange}
                            disabled={!isAdmin}
                        />

                        {isAdmin && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => document.getElementById('logo-upload')?.click()}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Tải ảnh lên
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Right Column: Form */}
                <Card className="lg:col-span-3">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-blue-700 uppercase">Thông tin doanh nghiệp</CardTitle>
                            {isAdmin && (
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Lưu thay đổi
                                        </>
                                    )}
                                </Button>
                            )}
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Company Info Section */}
                            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                    <Label className="md:col-span-1 text-gray-600 font-semibold">Tên công ty</Label>
                                    <div className="md:col-span-3">
                                        <Input
                                            {...register('companyName', { required: 'Vui lòng nhập tên công ty' })}
                                            className="w-full font-semibold text-gray-900"
                                            placeholder="NHẬP TÊN CÔNG TY..."
                                            disabled={!isAdmin}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                    <Label className="md:col-span-1 text-gray-600 font-semibold">Địa chỉ</Label>
                                    <div className="md:col-span-3">
                                        <Input
                                            {...register('companyAddress')}
                                            className="w-full"
                                            disabled={!isAdmin}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                    <Label className="md:col-span-1 text-gray-600 font-semibold">Số điện thoại</Label>
                                    <div className="md:col-span-3">
                                        <Input
                                            {...register('companyPhone')}
                                            className="w-full"
                                            disabled={!isAdmin}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                    <Label className="md:col-span-1 text-gray-600 font-semibold">Mã số thuế / Bank</Label>
                                    <div className="md:col-span-3">
                                        <Input
                                            {...register('companyTaxCode')}
                                            className="w-full"
                                            placeholder="STK... Ngân hàng..."
                                            disabled={!isAdmin}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Personnel Section */}
                            <div>
                                <h3 className="text-lg font-bold text-blue-600 uppercase border-b-2 border-blue-500 pb-2 mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    Nhân sự
                                </h3>

                                <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                        <Label className="md:col-span-1 text-gray-600 font-semibold">Giám đốc</Label>
                                        <div className="md:col-span-3">
                                            <Input
                                                {...register('directorName')}
                                                className="w-full"
                                                disabled={!isAdmin}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                        <Label className="md:col-span-1 text-gray-600 font-semibold">Kế toán trưởng</Label>
                                        <div className="md:col-span-3">
                                            <Input
                                                {...register('chiefAccountantName')}
                                                className="w-full"
                                                disabled={!isAdmin}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                        <Label className="md:col-span-1 text-gray-600 font-semibold">Người lập phiếu (Mặc định)</Label>
                                        <div className="md:col-span-3">
                                            <Input
                                                {...register('creatorName')}
                                                className="w-full"
                                                placeholder="Tên người lập phiếu nếu chưa đăng nhập..."
                                                disabled={!isAdmin}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                        <Label className="md:col-span-1 text-gray-600 font-semibold">Thủ quỹ</Label>
                                        <div className="md:col-span-3">
                                            <Input
                                                {...register('treasurerName')}
                                                className="w-full"
                                                disabled={!isAdmin}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </form>
                </Card>
            </div>
        </div>
    );
};
