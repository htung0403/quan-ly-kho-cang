import { useState, useEffect } from 'react';
import {
    Truck,
    Plus,
    Search,
    Edit2,
    Trash2,
    Phone,
    User,
    Filter,
    Building2,
    History
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
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Vehicle, TransportUnit } from '@/types';

export const VehiclesPage: React.FC = () => {
    const navigate = useNavigate();
    const [units, setUnits] = useState<TransportUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deleteType, setDeleteType] = useState<'unit' | 'vehicle'>('vehicle');

    const [selectedUnit, setSelectedUnit] = useState<TransportUnit | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [expandedUnitIds, setExpandedUnitIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { success: showSuccess, error: showError } = useToast();

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.transportUnits.getAll({ search: searchTerm }) as any;
            if (response.success) setUnits(response.data.items);
        } catch (error: any) {
            showError(error.message || 'Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData();
    };

    // Unit Handlers
    const handleCreateUnit = () => {
        setSelectedUnit(null);
        setIsUnitModalOpen(true);
    };

    const handleEditUnit = (unit: TransportUnit) => {
        setSelectedUnit(unit);
        setIsUnitModalOpen(true);
    };

    const handleDeleteUnit = (unit: TransportUnit) => {
        setSelectedUnit(unit);
        setDeleteType('unit');
        setIsConfirmOpen(true);
    };

    // Vehicle Handlers
    const handleQuickAddVehicle = (unit: TransportUnit) => {
        setSelectedVehicle({
            transport_unit_id: unit.id,
            plate_number: '',
            vehicle_type: '',
            status: 'available',
            // Store unit name for modal display
            transport_unit: { name: unit.name }
        } as any);
        setIsVehicleModalOpen(true);
    };

    const handleToggleExpand = (unitId: string) => {
        setExpandedUnitIds(prev =>
            prev.includes(unitId)
                ? prev.filter(id => id !== unitId)
                : [...prev, unitId]
        );
    };

    const handleEditVehicle = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setIsVehicleModalOpen(true);
    };

    const handleDeleteVehicle = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setDeleteType('vehicle');
        setIsConfirmOpen(true);
    };

    const confirmDelete = async () => {
        try {
            if (deleteType === 'unit' && selectedUnit) {
                await api.transportUnits.delete(selectedUnit.id);
                showSuccess('Đã xóa đơn vị vận chuyển');
            } else if (deleteType === 'vehicle' && selectedVehicle) {
                await api.vehicles.delete(selectedVehicle.id);
                showSuccess('Đã xóa xe khỏi hệ thống');
            }
            fetchData();
        } catch (error: any) {
            showError(error.message || 'Không thể xóa');
        } finally {
            setIsConfirmOpen(false);
        }
    };

    const handleUnitSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name') as string,
            contact_name: formData.get('contact_name') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            notes: formData.get('notes') as string,
        };

        try {
            setIsSubmitting(true);
            if (selectedUnit) {
                await api.transportUnits.update(selectedUnit.id, data);
                showSuccess('Cập nhật thành công');
            } else {
                await api.transportUnits.create(data);
                showSuccess('Thêm đơn vị vận chuyển mới thành công');
            }
            setIsUnitModalOpen(false);
            fetchData();
        } catch (error: any) {
            showError(error.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVehicleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            plate_number: formData.get('plate_number') as string,
            driver_name: formData.get('driver_name') as string,
            driver_phone: formData.get('driver_phone') as string,
            vehicle_type: formData.get('vehicle_type') as string,
            capacity_tons: Number(formData.get('capacity_tons')),
            transport_unit_id: formData.get('transport_unit_id') as string,
            notes: formData.get('notes') as string,
            status: (formData.get('status') as any) || 'available',
        };

        try {
            setIsSubmitting(true);
            if (selectedVehicle && selectedVehicle.id) {
                await api.vehicles.update(selectedVehicle.id, data);
                showSuccess('Cập nhật thông tin xe thành công');
            } else {
                await api.vehicles.create(data);
                showSuccess('Khai báo xe mới thành công');
            }
            setIsVehicleModalOpen(false);
            fetchData();
        } catch (error: any) {
            showError(error.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const unitColumns: Column<TransportUnit>[] = [
        {
            key: 'name',
            header: 'Tên đơn vị',
            cell: (item) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{item.name}</span>
                    <span className="text-xs text-slate-500">{item.address}</span>
                </div>
            )
        },
        {
            key: 'contact',
            header: 'Liên hệ',
            cell: (item) => (
                <div className="flex flex-col text-sm">
                    <span className="flex items-center gap-1 font-medium"><User className="w-3 h-3" /> {item.contact_name || '---'}</span>
                    <span className="flex items-center gap-1 text-slate-500"><Phone className="w-3 h-3" /> {item.phone || '---'}</span>
                </div>
            )
        },
        {
            key: 'vehicles',
            header: 'Số xe',
            cell: (item) => (
                <Badge variant="slate" className="font-bold">{(item as any).vehicles?.length || 0} xe</Badge>
            )
        },
        {
            key: 'actions',
            header: 'Thao tác',
            cell: (item) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary-600 hover:text-primary-700"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAddVehicle(item);
                        }}
                        leftIcon={<Plus className="w-4 h-4" />}
                        title="Khai báo xe mới"
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:text-slate-700"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/reports/transport?unit_id=${item.id}`);
                        }}
                        leftIcon={<History className="w-4 h-4" />}
                        title="Xem lịch sử vận chuyển"
                    />
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditUnit(item); }} leftIcon={<Edit2 className="w-4 h-4" />} />
                    <Button variant="ghost" size="sm" className="text-danger-600 hover:text-danger-700" onClick={(e) => { e.stopPropagation(); handleDeleteUnit(item); }} leftIcon={<Trash2 className="w-4 h-4" />} />
                </div>
            )
        }
    ];

    const renderExpandedUnitRow = (unit: TransportUnit) => {
        const unitVehicles = (unit as any).vehicles || [];

        if (unitVehicles.length === 0) {
            return (
                <div className="p-8 text-center bg-slate-50/50 border-y border-dashed">
                    <p className="text-sm text-slate-400 font-medium">Đơn vị này chưa có xe được khai báo.</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-primary-600"
                        onClick={() => handleQuickAddVehicle(unit)}
                        leftIcon={<Plus className="w-3 h-3" />}
                    >
                        Khai báo xe đầu tiên
                    </Button>
                </div>
            );
        }

        return (
            <div className="bg-slate-50/50 border-y py-4 px-6 space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Truck className="w-3 h-3" /> Danh sách xe của {unit.name}
                    </h4>
                    <span className="text-xs font-medium text-slate-400">{unitVehicles.length} xe đang hoạt động</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {unitVehicles.map((v: Vehicle) => (
                        <div key={v.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group hover:border-primary-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 leading-none">{v.plate_number}</span>
                                    <span className="text-[10px] text-slate-500 mt-1 uppercase font-medium">{v.driver_name || 'Chưa có tài xế'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditVehicle(v)} leftIcon={<Edit2 className="w-3 h-3" />} />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-slate-600"
                                    onClick={() => navigate(`/reports/transport?vehicle_id=${v.id}`)}
                                    leftIcon={<History className="w-3 h-3" />}
                                    title="Xem lịch sử vận chuyển"
                                />
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-danger-600" onClick={() => handleDeleteVehicle(v)} leftIcon={<Trash2 className="w-3 h-3" />} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="text-primary-600" />
                        Quản lý Đơn vị vận chuyển
                    </h1>
                    <p className="text-slate-500">Quản lý các công ty vận tải và đội xe trực thuộc.</p>
                </div>
                <Button onClick={handleCreateUnit} leftIcon={<Plus className="w-4 h-4" />}>Thêm đơn vị mới</Button>
            </div>

            <Card>
                <CardContent className="p-4">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[300px]">
                            <Input
                                placeholder="Tìm kiếm tên đơn vị, địa chỉ hoặc người liên hệ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                leftIcon={<Search className="w-4 h-4" />}
                            />
                        </div>
                        <Button type="submit" leftIcon={<Filter className="w-4 h-4" />}>Tìm kiếm</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <Table
                    isLoading={loading}
                    columns={unitColumns as any}
                    data={units as any}
                    onRowClick={(item) => handleToggleExpand((item as any).id)}
                    isRowExpanded={(item) => expandedUnitIds.includes((item as any).id)}
                    renderExpandedRow={renderExpandedUnitRow as any}
                />
            </Card>

            {/* Unit Modal */}
            <Modal isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} title={selectedUnit ? 'Sửa đơn vị vận chuyển' : 'Thêm đơn vị vận chuyển'}>
                <form onSubmit={handleUnitSubmit} className="space-y-4">
                    <Input label="Tên đơn vị (*)" name="name" defaultValue={selectedUnit?.name} required placeholder="Ví dụ: Công ty Vận tải FUTA" />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Người liên hệ" name="contact_name" defaultValue={selectedUnit?.contact_name} placeholder="Họ và tên" />
                        <Input label="Số điện thoại" name="phone" defaultValue={selectedUnit?.phone} placeholder="090..." />
                    </div>
                    <Input label="Địa chỉ" name="address" defaultValue={selectedUnit?.address} placeholder="Số nhà, đường, phường/xã..." />
                    <Input label="Ghi chú" name="notes" defaultValue={selectedUnit?.notes} placeholder="Thêm ghi chú nếu có" />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)}>Hủy</Button>
                        <Button type="submit" isLoading={isSubmitting}>{selectedUnit ? 'Cập nhật' : 'Thêm mới'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Vehicle Modal - REFACTORED TO FOCUS ON ADDING FOR UNIT */}
            <Modal
                isOpen={isVehicleModalOpen}
                onClose={() => setIsVehicleModalOpen(false)}
                title={selectedVehicle?.id ? 'Cập nhật thông tin xe' : `Khai báo xe mới cho ${selectedVehicle?.transport_unit?.name || 'đơn vị'}`}
            >
                <form onSubmit={handleVehicleSubmit} className="space-y-4">
                    <input type="hidden" name="transport_unit_id" value={selectedVehicle?.transport_unit_id || ''} />
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-700 text-sm font-medium mb-4 flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Đơn vị: {selectedVehicle?.transport_unit?.name || 'Chưa xác định'}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Biển số (*)"
                            name="plate_number"
                            defaultValue={selectedVehicle?.plate_number}
                            required
                            placeholder="Ví dụ: 29C-123.45"
                            autoFocus
                        />
                        <Input
                            label="Loại xe"
                            name="vehicle_type"
                            defaultValue={selectedVehicle?.vehicle_type}
                            placeholder="Ví dụ: Xe ben, Xe tải"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Tài xế" name="driver_name" defaultValue={selectedVehicle?.driver_name} placeholder="Tên tài xế" />
                        <Input label="SĐT tài xế" name="driver_phone" defaultValue={selectedVehicle?.driver_phone} placeholder="098..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Tải trọng (Tấn)" name="capacity_tons" type="number" step="0.1" defaultValue={selectedVehicle?.capacity_tons} placeholder="0.0" />
                        <Select
                            label="Trạng thái"
                            name="status"
                            defaultValue={selectedVehicle?.status || 'available'}
                            options={[
                                { value: 'available', label: 'Sẵn sàng' },
                                { value: 'in_transit', label: 'Đang chạy' },
                                { value: 'maintenance', label: 'Bảo trì' },
                                { value: 'inactive', label: 'Ngưng hoạt động' },
                            ]}
                        />
                    </div>
                    <Input label="Ghi chú" name="notes" defaultValue={selectedVehicle?.notes} placeholder="Ghi chú thêm về xe" />

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="ghost" onClick={() => setIsVehicleModalOpen(false)}>Hủy</Button>
                        <Button type="submit" isLoading={isSubmitting}>{selectedVehicle?.id ? 'Cập nhật' : 'Khai báo xe'}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDelete}
                title={deleteType === 'unit' ? 'Xóa đơn vị vận chuyển' : 'Xóa xe'}
                message={deleteType === 'unit' ? "Xóa đơn vị sẽ không thể hoàn tác. Các xe thuộc đơn vị này sẽ trở thành xe vãng lai." : "Bạn có chắc chắn muốn xóa xe này khỏi hệ thống?"}
                variant="danger"
            />
        </div>
    );
};
