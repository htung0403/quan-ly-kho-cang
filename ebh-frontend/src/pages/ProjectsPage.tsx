import React, { useState, useEffect } from 'react';
import {
    Briefcase,
    Plus,
    Search,
    Users,
    UserPlus,
    Trash2,
    ChevronRight,
    ShieldCheck,
    Building,
    Filter
} from 'lucide-react';
import {
    Button,
    Input,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Badge,
    Modal,
    Select
} from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Project, User } from '@/types';

export const ProjectsPage: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]); // All users for assignment
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectUsers, setProjectUsers] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { success: showSuccess, error: showError } = useToast();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projRes, userRes] = await Promise.all([
                api.projects.getAll({ search: searchTerm }),
                api.users.getAll()
            ]) as any[];

            if (projRes.success) setProjects(projRes.data);
            if (userRes.success) setUsers(userRes.data.items);
        } catch (error: any) {
            showError(error.message || 'Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [searchTerm]);

    const handleCreateProject = () => {
        setSelectedProject(null);
        setIsProjectModalOpen(true);
    };

    const handleProjectSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            code: formData.get('code') as string,
            name: formData.get('name') as string,
            client_name: formData.get('client_name') as string,
            description: formData.get('description') as string,
        };

        try {
            setIsSubmitting(true);
            await api.projects.create(data);
            showSuccess('Đã tạo dự án mới');
            setIsProjectModalOpen(false);
            fetchData();
        } catch (error: any) {
            showError(error.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleManageUsers = async (project: Project) => {
        setSelectedProject(project);
        try {
            const res = await api.projects.getUsers(project.id);
            if (res.data) {
                setProjectUsers(res.data);
                setIsAssignModalOpen(true);
            }
        } catch (error: any) {
            showError('Không thể tải danh sách nhân sự dự án');
        }
    };

    const handleAssignUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedProject) return;
        const formData = new FormData(e.currentTarget);
        const user_id = formData.get('user_id') as string;

        if (!user_id) {
            showError('Vui lòng chọn nhân viên');
            return;
        }

        try {
            setIsSubmitting(true);
            await api.projects.assignProject(selectedProject.id, user_id, {
                can_view: true,
                can_edit: true,
                can_delete: false
            });
            showSuccess('Đã phân quyền nhân sự vào dự án');
            handleManageUsers(selectedProject); // Refresh list
        } catch (error: any) {
            showError(error.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveUser = async (userId: string) => {
        if (!selectedProject) return;
        try {
            await api.projects.removeProject(selectedProject.id, userId);
            showSuccess('Đã gỡ nhân sự khỏi dự án');
            handleManageUsers(selectedProject);
        } catch (error: any) {
            showError('Có lỗi xảy ra');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Briefcase className="text-primary-600" />
                        Quản lý Dự án & Phân quyền
                    </h1>
                    <p className="text-slate-500">Thiết lập dự án và giới hạn quyền truy cập dữ liệu cho nhân viên.</p>
                </div>
                <Button onClick={handleCreateProject} leftIcon={<Plus className="w-4 h-4" />}>Tạo dự án mới</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Project List */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Tìm tên hoặc mã dự án..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        leftIcon={<Search className="w-4 h-4" />}
                                    />
                                </div>
                                <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>Lọc</Button>
                            </div>
                        </CardContent>
                    </Card>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {projects.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-slate-400">Không tìm thấy dự án nào</div>
                            ) : (
                                projects.map((project) => (
                                    <Card key={project.id} className="group hover:border-primary-500 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md">
                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl">
                                                    <Building className="w-5 h-5" />
                                                </div>
                                                <Badge variant={project.status === 'active' ? 'success' : 'slate'}>
                                                    {project.status === 'active' ? 'Đang chạy' : 'Hoàn thành'}
                                                </Badge>
                                            </div>
                                            <h3 className="font-bold text-lg text-slate-900 mb-1">{project.name}</h3>
                                            <p className="text-sm text-slate-500 font-mono mb-4">{project.code}</p>

                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                                <div className="flex items-center text-sm text-slate-600 gap-1.5">
                                                    <div className="flex -space-x-2">
                                                        {[1, 2].map(i => (
                                                            <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold">U</div>
                                                        ))}
                                                    </div>
                                                    <span className="ml-1 text-xs">Nhân sự dự án</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleManageUsers(project)}
                                                    className="group-hover:translate-x-1 transition-transform"
                                                    rightIcon={<ChevronRight className="w-4 h-4" />}
                                                >
                                                    Chi tiết
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                )
                                ))}
                        </div>
                    )}
                </div>

                {/* Info Sidebar */}
                <div className="space-y-4">
                    <Card className="bg-gradient-to-br from-primary-600 to-primary-800 text-white border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5" />
                                Quy tắc Phân quyền
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-primary-100 text-sm space-y-3 pb-6">
                            <p className="flex gap-2">
                                <span className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">1</span>
                                <span>Nhân viên chỉ thấy dữ liệu (Nhập/Xuất/Tồn) của các dự án được gán quyền.</span>
                            </p>
                            <p className="flex gap-2">
                                <span className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">2</span>
                                <span>Admin và Kế toán có quyền mặc định xem tất cả dữ liệu hệ thống.</span>
                            </p>
                            <p className="flex gap-2">
                                <span className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">3</span>
                                <span>Mỗi dự án có thể có nhiều nhân viên hiện trường cùng quản lý.</span>
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-dashed border-2">
                        <CardContent className="p-6 text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Plus className="text-slate-400 w-6 h-6" />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">Bạn có dự án mới?</p>
                            <Button variant="ghost" size="sm" onClick={handleCreateProject} className="mt-2 text-primary-600">Thêm ngay</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Project Modal */}
            <Modal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
                title="Tạo dự án mới"
                size="md"
            >
                <form onSubmit={handleProjectSubmit} className="space-y-4">
                    <Input label="Mã dự án *" name="code" placeholder="VD: VH_GRAND_PARK" required />
                    <Input label="Tên dự án *" name="name" placeholder="VD: Vinhomes Grand Park" required />
                    <Input label="Tên chủ đầu tư/Khách hàng" name="client_name" placeholder="VD: Vingroup" />
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">Mô tả dự án</label>
                        <textarea name="description" className="input min-h-[100px] resize-none" placeholder="Địa điểm, quy mô..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" type="button" onClick={() => setIsProjectModalOpen(false)}>Hủy</Button>
                        <Button type="submit" isLoading={isSubmitting}>Tạo dự án</Button>
                    </div>
                </form>
            </Modal>

            {/* Assignment Modal */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title={`Phân quyền dự án: ${selectedProject?.name}`}
                size="lg"
            >
                <div className="space-y-6">
                    <form onSubmit={handleAssignUser} className="flex items-end gap-3 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex-1">
                            <Select
                                label="Chọn nhân viên"
                                name="user_id"
                                required
                                options={users
                                    .filter(u => !projectUsers.find(pu => pu.user_id === u.id))
                                    .map(u => ({ value: u.id, label: `${u.full_name} (${u.email})` }))
                                }
                                placeholder="Tìm nhân viên..."
                            />
                        </div>
                        <Button type="submit" isLoading={isSubmitting} leftIcon={<UserPlus className="w-4 h-4" />}>Thêm vào</Button>
                    </form>

                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary-600" />
                                Nhân sự hiện tại
                                <span className="ml-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-bold">{projectUsers.length}</span>
                            </h4>
                        </div>
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-5 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Họ tên</th>
                                        <th className="px-5 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Vai trò</th>
                                        <th className="px-5 py-3 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {projectUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-5 py-10 text-center text-slate-400 italic font-medium">Chưa có nhân sự nào được gán cho dự án này</td>
                                        </tr>
                                    ) : (
                                        projectUsers.map((item) => (
                                            <tr key={item.user_id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-4">
                                                    <p className="font-bold text-slate-900">{item.user?.full_name}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{item.user?.email}</p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Badge variant="primary">{item.user?.role?.display_name || 'Nhân viên'}</Badge>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveUser(item.user_id)}
                                                        className="text-danger-500 hover:text-danger-700 bg-danger-50 hover:bg-danger-100 p-2 rounded-xl transition-all"
                                                        title="Gỡ khỏi dự án"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
