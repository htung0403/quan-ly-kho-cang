import React from 'react';
import { SystemSettings } from '@/types';
import { formatNumber, formatDate } from '@/lib/utils';
import { readMoney } from '@/lib/readMoney';

interface PrintPurchaseReceiptProps {
    receipt: any; // Using any for more flexibility as types might lag
    settings?: SystemSettings;
}

export const PrintPurchaseReceipt: React.FC<PrintPurchaseReceiptProps> = ({ receipt, settings }) => {
    if (!receipt) return null;

    // Prepare items list
    const items = receipt.items && receipt.items.length > 0 ? receipt.items : [
        {
            material: receipt.material,
            quantity_primary: receipt.quantity_primary,
            quantity_secondary: receipt.quantity_secondary,
            unit_price: receipt.unit_price,
            total_amount: receipt.total_amount
        }
    ];

    const totalAmount = receipt.total_amount || items.reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0);

    const date = receipt.receipt_date ? new Date(receipt.receipt_date) : new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return (
        <div id="print-receipt-content" className="bg-white px-10 py-8 text-black font-['Times_New_Roman',_serif] text-[13px] leading-tight relative mx-auto overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="w-[400px]">
                    <h2 className="font-bold text-[13px] uppercase tracking-tight">{settings?.companyName || 'CÔNG TY TNHH XÂY DỰNG VẬN TẢI QUỐC TUẤN'}</h2>
                    <p className="text-[12px] leading-tight">{settings?.companyAddress || 'Số 22, Phạm Hồng Thái, Khu Phố Song Vĩnh, Phường Tân Phước, Thành phố Hồ Chí Minh, Việt Nam.'}</p>
                </div>
                <div className="text-right flex-1">
                    <p className="font-bold text-[12px]">Mẫu số: 01 - VT</p>
                    <p className="text-[10px] italic leading-tight">(Ban hành theo Thông tư số 133/2016/TT-BTC</p>
                    <p className="text-[10px] italic leading-tight">ngày 26/08/2016 của Bộ Tài chính)</p>
                </div>
            </div>

            {/* Title */}
            <div className="text-center mb-6 relative">
                <h1 className="text-2xl font-bold uppercase mb-1">PHIẾU NHẬP KHO</h1>
                <p className="italic text-[13px]">Ngày {day} tháng {month} năm {year}</p>

                <div className="absolute top-[40px] right-0 text-left text-[12px]">
                    <p>Nợ: 156</p>
                    <p>Có: 331</p>
                </div>

                <div className="text-[12px] mt-1">
                    <p>Số: <span className="font-bold">{receipt.receipt_number}</span></p>
                </div>
            </div>

            {/* Info */}
            <div className="space-y-1.5 mb-4 text-[13px]">
                <div className="flex">
                    <span className="min-w-[170px]">- Họ và tên người giao:</span>
                    <span className="font-bold uppercase tracking-tight">{receipt.supplier_name || '...................................................'}</span>
                </div>
                <div className="flex">
                    <span className="min-w-[170px]">- Theo hóa đơn số:</span>
                    <span>{receipt.invoice_number || '.............'} Ngày {receipt.invoice_date ? formatDate(receipt.invoice_date) : '..../..../....'} của {receipt.supplier_name || '...................'}</span>
                </div>
                <div className="flex justify-between items-end">
                    <div className="flex">
                        <span className="min-w-[170px]">- Nhập tại kho:</span>
                        <span className="font-bold uppercase">{receipt.warehouse?.name || '................................'}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[12px]">Địa điểm: </span>
                        <span className="italic text-[12px]">{receipt.warehouse?.address || '................................'}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-black mb-4 text-[13px] table-fixed">
                <thead>
                    <tr className="font-bold text-center bg-slate-50/10">
                        <th className="border border-black px-1 py-1 w-[40px]" rowSpan={2}>STT</th>
                        <th className="border border-black px-1 py-1" rowSpan={2}>Tên, nhãn hiệu, quy cách, phẩm chất vật tư,<br />dụng cụ sản phẩm, hàng hóa</th>
                        <th className="border border-black px-1 py-1 w-[75px]" rowSpan={2}>Mã số</th>
                        <th className="border border-black px-1 py-1 w-[55px]" rowSpan={2}>Đơn vị<br />tính</th>
                        <th className="border border-black px-1 py-1" colSpan={2}>Số lượng</th>
                        <th className="border border-black px-1 py-1 w-[85px]" rowSpan={2}>Đơn giá</th>
                        <th className="border border-black px-1 py-1 w-[105px]" rowSpan={2}>Thành tiền</th>
                    </tr>
                    <tr className="font-bold text-center bg-slate-50/10">
                        <th className="border border-black px-1 py-1 w-[65px]">Theo<br />chứng từ</th>
                        <th className="border border-black px-1 py-1 w-[65px]">Thực<br />nhập</th>
                    </tr>
                    <tr className="text-center italic font-normal text-[11px]">
                        <td className="border border-black py-0.5">A</td>
                        <td className="border border-black py-0.5">B</td>
                        <td className="border border-black py-0.5">C</td>
                        <td className="border border-black py-0.5">D</td>
                        <td className="border border-black py-0.5">1</td>
                        <td className="border border-black py-0.5">2</td>
                        <td className="border border-black py-0.5">3</td>
                        <td className="border border-black py-0.5">4</td>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item: any, idx: number) => (
                        <tr key={idx} className="h-8">
                            <td className="border border-black px-1 py-1 text-center align-middle">{idx + 1}</td>
                            <td className="border border-black px-2 py-1 align-top">
                                <p className="font-semibold">{item.material?.name}</p>
                                {item.notes && <p className="text-[11px] italic font-normal">{item.notes}</p>}
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-mono text-[11px] align-top">{item.material?.code}</td>
                            <td className="border border-black px-1 py-1 text-center align-top">{item.material?.secondary_unit || item.material?.primary_unit}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold align-top">{formatNumber(item.quantity_secondary || item.quantity_primary, 2)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold align-top">{formatNumber(item.quantity_secondary || item.quantity_primary, 2)}</td>
                            <td className="border border-black px-1 py-1 text-right align-top font-mono truncate">{item.unit_price ? formatNumber(item.unit_price, 0) : ''}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold align-top font-mono truncate">{item.total_amount ? formatNumber(item.total_amount, 0) : ''}</td>
                        </tr>
                    ))}

                    {/* Empty rows to fill space */}
                    {items.length < 2 && Array.from({ length: 2 - items.length }).map((_, i) => (
                        <tr key={`filler-${i}`} className="h-8">
                            <td className="border border-black px-1 py-1"></td>
                            <td className="border border-black px-2 py-1"></td>
                            <td className="border border-black px-1 py-1"></td>
                            <td className="border border-black px-1 py-1"></td>
                            <td className="border border-black px-1 py-1"></td>
                            <td className="border border-black px-1 py-1"></td>
                            <td className="border border-black px-1 py-1"></td>
                            <td className="border border-black px-1 py-1"></td>
                        </tr>
                    ))}

                    <tr className="h-8">
                        <td className="border border-black px-2 py-1 text-center font-bold uppercase" colSpan={7}>Cộng</td>
                        <td className="border border-black px-1 py-1 text-right font-bold font-mono underline decoration-double">{formatNumber(totalAmount, 0)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Bottom info */}
            <div className="space-y-2 mb-8 text-[13px]">
                <p>- Tổng số tiền (Viết bằng chữ): <span className="italic font-bold underline decoration-blue-500/20">{readMoney(totalAmount)}</span></p>
                <p>- Số chứng từ gốc kèm theo: ............................................................................................</p>
            </div>

            {/* Signatures */}
            <div className="mt-8 text-[13px]">
                <div className="flex justify-end mb-1">
                    <div className="w-1/4 text-center">
                        <p className="italic">Ngày {day} tháng {month} năm {year}</p>
                    </div>
                </div>

                <div className="flex justify-between text-center leading-tight">
                    <div className="w-1/5">
                        <p className="font-bold">Người lập biểu</p>
                        <p className="italic text-[11px]">(Ký, họ tên)</p>
                    </div>
                    <div className="w-1/5">
                        <p className="font-bold">Người giao hàng</p>
                        <p className="italic text-[11px]">(Ký, họ tên)</p>
                    </div>
                    <div className="w-1/5">
                        <p className="font-bold">Thủ kho</p>
                        <p className="italic text-[11px]">(Ký, họ tên)</p>
                    </div>
                    <div className="w-1/5">
                        <p className="font-bold">Kế toán trưởng</p>
                        <p className="font-bold italic text-[10px] mb-1 leading-none">(Hoặc bộ phận có nhu cầu nhập)</p>
                        <p className="italic text-[11px]">(Ký, họ tên)</p>
                    </div>
                    <div className="w-1/5">
                        <p className="font-bold">Giám đốc</p>
                        <p className="italic text-[11px]">(Ký, họ tên, đóng dấu)</p>
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
                    #print-receipt-content {
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
};
