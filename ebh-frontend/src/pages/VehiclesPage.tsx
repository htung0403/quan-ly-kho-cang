import { useState, useEffect } from 'react';
import {
    Truck,
    Plus,
    Search,
    Edit2,
    Trash2,
    Phone,
    User,
    Filter
} from 'lucide-react';
import {
    Button,
    Input,
    Card,
    CardContent,
    Table,
    Badge,
    Modal,
    ConfirmDialog,
    Select
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Vehicle } from '@/types';
import { formatNumber } from '@/lib/utils';

export const VehiclesPage: React.FC = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const limit = 10;

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { success: showSuccess, error: showError } = useToast();

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const response = await api.vehicles.getAll({
                page,
                limit,
                search: searchTerm,
                status: statusFilter
            }) as any;
            if (response.success) {
                setVehicles(response.data.items);
            }
        } catch (error: any) {
            showError(error.message || 'Không thể tải danh sách xe');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, [page, statusFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchVehicles();
    };

    const handleCreate = () => {
        setSelectedVehicle(null);
        setIsModalOpen(true);
    };

    const handleEdit = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleDelete = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setIsConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedVehicle) return;
        try {
            await api.vehicles.delete(selectedVehicle.id);
            showSuccess('Đã xóa xe khỏi hệ thống');
            fetchVehicles();
        } catch (error: any) {
            showError(error.message || 'Không thể xóa xe');
        } finally {
            setIsConfirmOpen(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            plate_number: formData.get('plate_number') as string,
            driver_name: formData.get('driver_name') as string,
            driver_phone: formData.get('driver_phone') as string,
            vehicle_type: formData.get('vehicle_type') as string,
            capacity_tons: Number(formData.get('capacity_tons')),
            notes: formData.get('notes') as string,
            status: (formData.get('status') as any) || 'available',
        };

        try {
            setIsSubmitting(true);
            if (selectedVehicle) {
                await api.vehicles.update(selectedVehicle.id, data);
                showSuccess('Cập nhật thông tin xe thành công');
            } else {
                await api.vehicles.create(data);
                showSuccess('Thêm xe mới thành công');
            }
            setIsModalOpen(false);
            fetchVehicles();
        } catch (error: any) {
            showError(error.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available':
                return <Badge variant="success">Sẵn sàng</Badge>;
            case 'in_transit':
                return <Badge variant="primary">Đang vận chuyển</Badge>;
            case 'maintenance':
                return <Badge variant="warning">Bảo trì</Badge>;
            case 'inactive':
                return <Badge variant="slate">Ngưng hoạt động</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const columns: Column<Vehicle>[] = [
        {
            key: 'plate_number',
            header: 'Biển số',
            cell: (item) => <span className="font-bold text-slate-900">{item.plate_number}</span>
        },
        {
            key: 'driver_name',
            header: 'Tài xế',
            cell: (item) => (
                <div className="flex flex-col">
                    <span className="font-medium flex items-center gap-1">
                        <User className="w-3 h-3" /> {item.driver_name || 'Chưa gán'}
                    </span>
                    {item.driver_phone && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {item.driver_phone}
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'vehicle_type',
            header: 'Loại xe',
        },
        {
            key: 'capacity_tons',
            header: 'Tải trọng',
            cell: (item) => `${formatNumber(item.capacity_tons || 0)} Tấn`
        },
        {
            key: 'status',
            header: 'Trạng thái',
            cell: (item) => getStatusBadge(item.status)
        },
        {
            key: 'actions',
            header: 'Thao tác',
            cell: (item) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        leftIcon={<Edit2 className="w-4 h-4" />}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger-600 hover:text-danger-700"
                        onClick={() => handleDelete(item)}
                        leftIcon={<Trash2 className="w-4 h-4" />}
                    />
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="text-primary-600" />
                        Quản lý Đội xe
                    </h1>
                    <p className="text-slate-500">
                        Quản lý danh sách phương tiện vận chuyển và tài xế.
                    </p>
                </div>
                <Button onClick={handleCreate} leftIcon={<Plus className="w-4 h-4" />}>Thêm xe mới</Button>
            </div>

            <Card>
                <CardContent className="p-4">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <Input
                                placeholder="Tìm biển số, tài xế..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                leftIcon={<Search className="w-4 h-4" />}
                            />
                        </div>
                        <div className="w-48">
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                options={[
                                    { value: '', label: 'Tất cả trạng thái' },
                                    { value: 'available', label: 'Sẵn sàng' },
                                    { value: 'in_transit', label: 'Đang vận chuyển' },
                                    { value: 'maintenance', label: 'Bảo trì' },
                                    { value: 'inactive', label: 'Ngưng hoạt động' },
                                ]}
                            />
                        </div>
                        <Button type="submit" variant="outline" leftIcon={<Filter className="w-4 h-4" />}>Lọc</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <Table
                    isLoading={loading}
                    columns={columns as any}
                    data={vehicles as any}
                />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedVehicle ? 'Cập nhật thông tin xe' : 'Thêm phương tiện mới'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Biển số xe"
                            name="plate_number"
                            defaultValue={selectedVehicle?.plate_number}
                            placeholder="Ví dụ: 29H-123.45"
                            required
                            disabled={!!selectedVehicle}
                        />
                        <Input
                            label="Loại xe"
                            name="vehicle_type"
                            defaultValue={selectedVehicle?.vehicle_type}
                            placeholder="VD: Xe ben 4 chân, Xe đầu kéo..."
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Tên tài xế"
                            name="driver_name"
                            defaultValue={selectedVehicle?.driver_name}
                            placeholder="Nhập họ và tên"
                        />
                        <Input
                            label="Số điện thoại"
                            name="driver_phone"
                            defaultValue={selectedVehicle?.driver_phone}
                            placeholder="Nhập số điện thoại"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Tải trọng (Tấn)"
                            name="capacity_tons"
                            type="number"
                            step="0.1"
                            defaultValue={selectedVehicle?.capacity_tons}
                            placeholder="Ví dụ: 15.5"
                            required
                        />
                        {selectedVehicle && (
                            <Select
                                label="Trạng thái"
                                name="status"
                                defaultValue={selectedVehicle.status}
                                options={[
                                    { value: 'available', label: 'Sẵn sàng' },
                                    { value: 'in_transit', label: 'Đang vận chuyển' },
                                    { value: 'maintenance', label: 'Bảo trì' },
                                    { value: 'inactive', label: 'Ngưng hoạt động' },
                                ]}
                            />
                        )}
                    </div>
                    <Input
                        label="Ghi chú"
                        name="notes"
                        defaultValue={selectedVehicle?.notes}
                        placeholder="Thông tin thêm..."
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            {selectedVehicle ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Xóa phương tiện"
                message={`Bạn có chắc chắn muốn xóa xe ${selectedVehicle?.plate_number} khỏi hệ thống? Hành động này không thể hoàn tác.`}
                variant="danger"
            />
        </div>
    );
};
