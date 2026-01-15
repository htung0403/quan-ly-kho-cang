import React from 'react';
import { formatNumber } from '@/lib/utils';
import { readMoney } from '@/lib/readMoney';

interface PrintExportReceiptProps {
    receipt: any;
}

export const PrintExportReceipt = React.forwardRef<HTMLDivElement, PrintExportReceiptProps>(({ receipt }, ref) => {
    if (!receipt) return null;

    // Prepare data for items table if not available (legacy support)
    const items = receipt.items && receipt.items.length > 0 ? receipt.items : [
        {
            material: receipt.material,
            quantity_secondary: receipt.quantity_secondary,
            unit_price: receipt.unit_price,
            total_amount: receipt.total_amount
        }
    ];

    const totalAmount = receipt.total_amount || items.reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0);

    const date = new Date(receipt.receipt_date);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return (
        <div ref={ref} className="px-10 py-8 text-black bg-white font-['Times_New_Roman',_serif] text-[13px] leading-tight" id="print-export-receipt">
            {/* Header */}
            <div className="flex justify-between mb-6">
                <div className="w-[350px]">
                    <p className="uppercase font-bold text-[13px]">CÔNG TY TNHH XÂY DỰNG VẬN TẢI QUỐC TUẤN</p>
                    <p className="italic text-[12px]">Số 22, Phạm Hồng Thái, Khu Phố Song Vĩnh, Phường Tân Phước, Thành phố Hồ Chí Minh, Việt Nam.</p>
                </div>
                <div className="text-center font-bold text-[12px]">
                    <p className="mb-0">Mẫu số: 02 - VT</p>
                    <p className="font-normal italic">(Ban hành theo Thông tư số 133/2016/TT-BTC</p>
                    <p className="font-normal italic">ngày 26/08/2016 của Bộ Tài chính)</p>
                </div>
            </div>

            {/* Title */}
            <div className="text-center mb-6 relative">
                <h1 className="text-2xl font-bold uppercase mb-1">PHIẾU XUẤT KHO</h1>
                <p className="italic text-[13px]">Ngày {day} tháng {month} năm {year}</p>

                <div className="absolute top-[35px] right-0 text-left text-[12px]">
                    <p>Nợ: ........................</p>
                    <p>Có: ........................</p>
                </div>
                <div className="text-[12px] mt-1">
                    <p>Số: {receipt.receipt_number}</p>
                </div>
            </div>

            {/* General Info */}
            <div className="mb-4 space-y-2 text-[13px]">
                <div className="flex">
                    <span className="min-w-[170px]">Họ và tên người nhận hàng:</span>
                    <span className="font-bold">{receipt.customer_name || '...................................................'}</span>
                </div>
                <div className="flex">
                    <span className="min-w-[170px]">Địa chỉ (bộ phận):</span>
                    <span>{receipt.destination || '...................................................'}</span>
                </div>
                <div className="flex">
                    <span className="min-w-[170px]">Lý do xuất kho:</span>
                    <span>Xuất cho dự án {receipt.project?.name}</span>
                </div>
                <div className="flex justify-between">
                    <div className="flex">
                        <span className="min-w-[170px]">Xuất tại kho (ngăn lô):</span>
                        <span>{receipt.warehouse?.name}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-black mb-4 text-[13px]">
                <thead>
                    <tr>
                        <th rowSpan={2} className="border border-black p-1 w-[40px]">STT</th>
                        <th rowSpan={2} className="border border-black p-1">Tên, nhãn hiệu, quy cách, phẩm chất vật tư,<br />dụng cụ sản phẩm, hàng hóa</th>
                        <th rowSpan={2} className="border border-black p-1 w-[80px]">Mã số</th>
                        <th rowSpan={2} className="border border-black p-1 w-[60px]">Đơn vị<br />tính</th>
                        <th colSpan={2} className="border border-black p-1">Số lượng</th>
                        <th rowSpan={2} className="border border-black p-1 w-[90px]">Đơn giá</th>
                        <th rowSpan={2} className="border border-black p-1 w-[110px]">Thành tiền</th>
                    </tr>
                    <tr>
                        <th className="border border-black p-1 w-[70px]">Yêu cầu</th>
                        <th className="border border-black p-1 w-[70px]">Thực xuất</th>
                    </tr>
                    <tr className="text-center font-bold">
                        <td className="border border-black p-1">A</td>
                        <td className="border border-black p-1">B</td>
                        <td className="border border-black p-1">C</td>
                        <td className="border border-black p-1">D</td>
                        <td className="border border-black p-1">1</td>
                        <td className="border border-black p-1">2</td>
                        <td className="border border-black p-1">3</td>
                        <td className="border border-black p-1">4</td>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="border border-black p-1 text-center align-top">{idx + 1}</td>
                            <td className="border border-black p-1 align-top">
                                <div className="font-semibold">{item.material?.name}</div>
                            </td>
                            <td className="border border-black p-1 text-center align-top">{item.material?.code}</td>
                            <td className="border border-black p-1 text-center align-top">{item.material?.secondary_unit}</td>
                            <td className="border border-black p-1 text-right align-top">{formatNumber(item.quantity_secondary, 2)}</td>
                            <td className="border border-black p-1 text-right align-top">{formatNumber(item.quantity_secondary, 2)}</td>
                            <td className="border border-black p-1 text-right align-top">{item.unit_price ? formatNumber(item.unit_price, 0) : ''}</td>
                            <td className="border border-black p-1 text-right align-top">{item.total_amount ? formatNumber(item.total_amount, 0) : ''}</td>
                        </tr>
                    ))}

                    {/* Info Row inside table - Matches the image structure: Content mainly in Column B */}
                    {(receipt.destination || receipt.notes || receipt.vehicle) && (
                        <tr>
                            <td className="border border-black p-1 text-center align-middle"></td>
                            <td className="border border-black p-2 text-left align-top font-normal">
                                <div>
                                    {receipt.destination && (
                                        <span>(Địa điểm giao hàng: {receipt.destination}</span>
                                    )}
                                    {receipt.notes && (
                                        <span>, {receipt.notes}</span>
                                    )}
                                    {receipt.vehicle && (
                                        <span>, phương tiện: {receipt.vehicle.plate_number}{receipt.vehicle.driver_name ? ` - ${receipt.vehicle.driver_name}` : ''}</span>
                                    )}
                                    <span>)</span>
                                </div>
                            </td>
                            {/* Empty cells for strict columnar structure */}
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                        </tr>
                    )}

                    <tr>
                        <td colSpan={7} className="border border-black p-1 text-center font-bold">Cộng</td>
                        <td className="border border-black p-1 text-right font-bold">{formatNumber(totalAmount, 0)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Footer Info */}
            <div className="mb-4 text-[13px]">
                <p>- Tổng số tiền (Viết bằng chữ): <span className="italic font-bold">{readMoney(totalAmount)}</span></p>
                <p>- Số chứng từ gốc kèm theo: ............................................................................................</p>
            </div>

            {/* Signatures */}
            <div className="mt-8 text-[13px]">
                {/* Date line aligned to the right (above Giám đốc) */}
                <div className="flex justify-end mb-1">
                    <div className="w-1/5 text-center">
                        <p className="italic">Ngày {day} tháng {month} năm {year}</p>
                    </div>
                </div>

                <div className="flex justify-between text-center">
                    <div className="w-1/5">
                        <p className="font-bold">Người lập biểu</p>
                        <p className="italic text-[12px]">(Ký, họ tên)</p>
                    </div>
                    <div className="w-1/5">
                        <p className="font-bold">Người nhận hàng</p>
                        <p className="italic text-[12px]">(Ký, họ tên)</p>
                    </div>
                    <div className="w-1/5">
                        <p className="font-bold">Thủ kho</p>
                        <p className="italic text-[12px]">(Ký, họ tên)</p>
                    </div>
                    <div className="w-1/5">
                        <p className="font-bold">Kế toán trưởng</p>
                        <p className="italic text-[12px]">(Hoặc bộ phận có nhu cầu nhập)</p>
                        <p className="italic text-[12px]">(Ký, họ tên)</p>
                    </div>
                    <div className="w-1/5">
                        <p className="font-bold">Giám đốc</p>
                        <p className="italic text-[12px]">(Ký, họ tên, đóng dấu)</p>
                    </div>
                </div>
            </div>
            <style>{`
                @media print {
                    @page { 
                        size: A4;
                        margin: 10mm; 
                    }
                    * {
                        box-shadow: none !important;
                        font-family: "Times New Roman", Times, serif !important;
                    }
                    #print-export-receipt {
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
});

PrintExportReceipt.displayName = 'PrintExportReceipt';
