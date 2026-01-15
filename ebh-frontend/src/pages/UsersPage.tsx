import { useState, useEffect } from 'react';
import {
    Users as UsersIcon,
    Search,
    Plus,
    Edit,
    Trash2,
    Mail,
    Phone,
    Shield,
    CheckCircle2,
    XCircle,
    Loader2
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardContent,
    StatsCard,
    Modal,
    ConfirmDialog
} from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getRoleLabel } from '@/lib/utils';

import { Upload } from 'lucide-react';

export function UsersPage() {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');

    useEffect(() => {
        if (selectedUser) {
            setAvatarUrl(selectedUser.img_url || '');
        } else {
            setAvatarUrl('');
        }
    }, [selectedUser]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, rolesRes] = await Promise.all([
                api.users.getAll({ search }),
                api.users.getRoles()
            ]) as any;

            if (usersRes.success) setUsers(usersRes.data.items);
            if (rolesRes.success) setRoles(rolesRes.data);
        } catch (err) {
            error('Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [search]);

    const handleOpenAddModal = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user: any) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleOpenDeleteConfirm = (user: any) => {
        setSelectedUser(user);
        setIsConfirmOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        // Add current avatar URL if not present in form (since file input doesn't carry old value)
        if (avatarUrl) {
            data.img_url = avatarUrl;
        }

        try {
            setIsSubmitting(true);
            if (selectedUser) {
                await api.users.update(selectedUser.id, data);
                success('Cập nhật thông tin nhân sự thành công');
            } else {
                await api.users.create(data);
                success('Tạo tài khoản nhân sự mới thành công');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            error(err.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await api.users.delete(selectedUser.id);
            success('Đã xóa nhân sự khỏi hệ thống');
            setIsConfirmOpen(false);
            fetchData();
        } catch (err) {
            error('Không thể xóa nhân sự');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Quản lý Nhân sự</h1>
                    <p className="text-slate-500 mt-1">Quản lý tài khoản, phân quyền và trạng thái làm việc của nhân sự</p>
                </div>
                <button
                    onClick={handleOpenAddModal}
                    className="btn btn-primary btn-md flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Thêm nhân sự
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                    title="Tổng nhân sự"
                    value={users.length}
                    icon={<UsersIcon className="w-5 h-5" />}
                />
                <StatsCard
                    title="Đang hoạt động"
                    value={users.filter(u => u.is_active).length}
                    icon={<CheckCircle2 className="w-5 h-5 text-success-500" />}
                />
                <StatsCard
                    title="Vai trò Admin"
                    value={users.filter(u => u.role?.name === 'admin').length}
                    icon={<Shield className="w-5 h-5 text-primary-500" />}
                />
            </div>

            <Card>
                <CardHeader className="border-b border-slate-50">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên hoặc email..."
                            className="input pl-10 h-10 w-full"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                            <p className="text-slate-500">Đang tải danh sách...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="py-20 text-center text-slate-500">
                            Không tìm thấy nhân sự nào
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                                        <th className="px-6 py-4">Nhân viên</th>
                                        <th className="px-6 py-4">Liên hệ</th>
                                        <th className="px-6 py-4">Vai trò</th>
                                        <th className="px-6 py-4">Trạng thái</th>
                                        <th className="px-6 py-4 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {user.img_url ? (
                                                        <img
                                                            src={user.img_url}
                                                            alt={user.full_name}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = ''; // Fallback if image fails
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">
                                                            {user.full_name?.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-slate-900">{user.full_name}</p>
                                                        <p className="text-xs text-slate-500">ID: {user.email.split('@')[0]}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                        {user.email}
                                                    </div>
                                                    {user.phone && (
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                            {user.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Shield className={`w-4 h-4 ${user.role?.name === 'admin' ? 'text-primary-600' : 'text-slate-400'}`} />
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {user.role?.display_name || getRoleLabel(user.role?.name)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.is_active ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success-50 text-success-700 border border-success-100">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Đang hoạt động
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-danger-50 text-danger-700 border border-danger-100">
                                                        <XCircle className="w-3 h-3" />
                                                        Tạm khóa
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenEditModal(user)}
                                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                        title="Sửa thông tin"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenDeleteConfirm(user)}
                                                        className="p-2 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                                                        title="Xóa nhân sự"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedUser ? 'Cập nhật nhân sự' : 'Thêm nhân sự mới'}
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="flex flex-col items-center gap-4 mb-6">
                        <div className="relative group">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Avatar preview"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-slate-100 shadow-lg"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center border-4 border-slate-50 text-slate-300 shadow-inner">
                                    <UsersIcon className="w-16 h-16" />
                                </div>
                            )}
                            <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-primary-600" /> : <Upload className="w-5 h-5 text-slate-600" />}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploading}
                                    onChange={async (e) => {
                                        try {
                                            if (!e.target.files || e.target.files.length === 0) return;

                                            const file = e.target.files[0];
                                            setUploading(true);

                                            const res = await api.users.uploadAvatar(file) as any;

                                            if (res.success) {
                                                setAvatarUrl(res.data.publicUrl);
                                                success('Tải ảnh lên thành công');
                                            }
                                        } catch (err: any) {
                                            console.error(err);
                                            error('Lỗi tải ảnh: ' + (err.message || 'Không xác định'));
                                        } finally {
                                            setUploading(false);
                                        }
                                    }}
                                />
                            </label>
                        </div>
                        <p className="text-xs text-slate-400">Hỗ trợ định dạng: JPG, PNG, GIF</p>
                        <input type="hidden" name="img_url" value={avatarUrl} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                            <label className="text-sm font-bold text-slate-700">Họ và tên</label>
                            <input
                                name="full_name"
                                defaultValue={selectedUser?.full_name}
                                required
                                className="input h-10"
                                placeholder="VD: Nguyễn Văn A"
                            />
                        </div>
                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                            <label className="text-sm font-bold text-slate-700">Email (ID đăng nhập)</label>
                            <input
                                name="email"
                                type="email"
                                defaultValue={selectedUser?.email}
                                required
                                disabled={!!selectedUser}
                                className="input h-10 disabled:bg-slate-50 disabled:text-slate-400"
                                placeholder="email@company.com"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                            <label className="text-sm font-bold text-slate-700">Số điện thoại</label>
                            <input
                                name="phone"
                                defaultValue={selectedUser?.phone}
                                className="input h-10"
                                placeholder="09xx xxx xxx"
                            />
                        </div>
                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                            <label className="text-sm font-bold text-slate-700">Vai trò / Phân quyền</label>
                            <select
                                name="role_id"
                                defaultValue={selectedUser?.role_id}
                                required
                                className="input h-10"
                            >
                                <option value="">Chọn vai trò...</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>
                                        {role.display_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>



                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">
                            {selectedUser ? 'Đổi mật khẩu (Bỏ trống nếu không đổi)' : 'Mật khẩu mặc định'}
                        </label>
                        <input
                            name="password"
                            type="password"
                            required={!selectedUser}
                            minLength={6}
                            className="input h-10"
                            placeholder="Ít nhất 6 ký tự"
                        />
                    </div>

                    {selectedUser && (
                        <div className="flex items-center gap-2 py-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                name="is_active"
                                defaultChecked={selectedUser.is_active}
                                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600"
                            />
                            <label htmlFor="is_active" className="text-sm font-bold text-slate-700">Kích hoạt tài khoản</label>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="btn btn-secondary btn-md px-6"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary btn-md px-8 flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {selectedUser ? 'Lưu thay đổi' : 'Tạo nhân sự'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Xóa nhân sự"
                message={`Bạn có chắc chắn muốn xóa nhân sự ${selectedUser?.full_name}? Nhân sự này sẽ không thể đăng nhập vào hệ thống nữa.`}
                confirmText="Xóa ngay"
                variant="danger"
                isLoading={isDeleting}
            />
        </div >
    );
}
