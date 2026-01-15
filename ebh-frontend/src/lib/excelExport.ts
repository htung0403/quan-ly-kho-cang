import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PurchaseReceipt } from '@/types';
import { formatDate } from './utils';

export const exportPurchaseReceiptToExcel = async (receipt: PurchaseReceipt) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Phieu Nhap Kho');

    // Set column widths
    worksheet.columns = [
        { width: 5 },  // A - STT
        { width: 35 }, // B - Tên vật tư
        { width: 12 }, // C - Mã số
        { width: 12 }, // D - Đơn vị tính
        { width: 15 }, // E - Số lượng chứng từ
        { width: 15 }, // F - Số lượng thực nhập
        { width: 15 }, // G - Đơn giá
        { width: 18 }, // H - Thành tiền
    ];

    // Header - Company Info
    const companyName = worksheet.getCell('A1');
    companyName.value = 'CÔNG TY TNHH XÂY DỰNG VẬN TẢI QUỐC TUẤN';
    companyName.font = { bold: true, size: 11 };
    worksheet.mergeCells('A1:D1');

    const address = worksheet.getCell('A2');
    address.value = 'Số 22, Phạm Hồng Thái, Khu Phố Song Vĩnh, Phường Tân Phước, Phú Mỹ, BR-VT';
    address.font = { size: 9 };
    worksheet.mergeCells('A2:D2');

    // Form Info
    const formCode = worksheet.getCell('F1');
    formCode.value = 'Mẫu số: 01 - VT';
    formCode.font = { bold: true };
    formCode.alignment = { horizontal: 'center' };
    worksheet.mergeCells('F1:H1');

    const formDesc = worksheet.getCell('F2');
    formDesc.value = '(Ban hành theo Thông tư số 133/2016/TT-BTC';
    formDesc.font = { italic: true, size: 8 };
    formDesc.alignment = { horizontal: 'center' };
    worksheet.mergeCells('F2:H2');

    const formDesc2 = worksheet.getCell('F3');
    formDesc2.value = 'ngày 26/08/2016 của Bộ Tài chính)';
    formDesc2.font = { italic: true, size: 8 };
    formDesc2.alignment = { horizontal: 'center' };
    worksheet.mergeCells('F3:H3');

    // Title
    const title = worksheet.getCell('A5');
    title.value = 'PHIẾU NHẬP KHO';
    title.font = { bold: true, size: 16 };
    title.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A5:H5');

    const receiptDate = new Date(receipt.receipt_date);
    const dateSub = worksheet.getCell('A6');
    dateSub.value = `Ngày ${receiptDate.getDate().toString().padStart(2, '0')} tháng ${(receiptDate.getMonth() + 1).toString().padStart(2, '0')} năm ${receiptDate.getFullYear()}`;
    dateSub.font = { italic: true };
    dateSub.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A6:H6');

    const receiptNo = worksheet.getCell('A7');
    receiptNo.value = `Số: ${receipt.receipt_number}`;
    receiptNo.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A7:E7');

    const accounts = worksheet.getCell('F7');
    accounts.value = 'Nợ: 156\nCó: 331';
    accounts.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    worksheet.mergeCells('F7:H7');

    // Main Info
    worksheet.getCell('A9').value = '- Họ và tên người giao hàng:';
    worksheet.getCell('B9').value = receipt.supplier_name || '';
    worksheet.getCell('B9').font = { bold: true };
    worksheet.mergeCells('B9:H9');

    worksheet.getCell('A10').value = '- Theo hóa đơn số:';
    worksheet.getCell('B10').value = receipt.invoice_number || '';
    worksheet.getCell('D10').value = 'Ngày:';
    worksheet.getCell('E10').value = receipt.invoice_date ? formatDate(receipt.invoice_date) : '';
    worksheet.getCell('F10').value = 'của:';
    worksheet.getCell('G10').value = receipt.supplier_name || '';
    worksheet.mergeCells('G10:H10');

    worksheet.getCell('A11').value = '- Nhập tại kho:';
    worksheet.getCell('B11').value = receipt.warehouse?.name || '';
    worksheet.getCell('B11').font = { bold: true };
    worksheet.getCell('E11').value = 'Địa điểm:';
    worksheet.getCell('F11').value = receipt.warehouse?.address || '';
    worksheet.mergeCells('F11:H11');

    // Table Headers
    const headerRow = worksheet.getRow(13);
    const headerRow2 = worksheet.getRow(14);

    const headers = ['STT', 'Tên, nhãn hiệu, quy cách, phẩm chất vật tư', 'Mã số', 'ĐVT', 'Số lượng', '', 'Đơn giá', 'Thành tiền'];
    headerRow.values = headers;
    headerRow2.values = ['', '', '', '', 'Theo chứng từ', 'Thực nhập', '', ''];

    // Style headers
    ['A13:A14', 'B13:B14', 'C13:C14', 'D13:D14', 'G13:G14', 'H13:H14'].forEach(m => {
        worksheet.mergeCells(m);
    });
    worksheet.mergeCells('E13:F13');

    [13, 14].forEach(r => {
        worksheet.getRow(r).eachCell(cell => {
            cell.font = { bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // Data Row
    const dataRow = worksheet.getRow(15);
    dataRow.values = [
        1,
        receipt.material?.name || '',
        receipt.material?.code || '',
        receipt.material?.secondary_unit || '',
        receipt.quantity_secondary,
        receipt.quantity_secondary,
        receipt.unit_price || 0,
        receipt.total_amount || 0
    ];
    dataRow.eachCell((cell, colNumber) => {
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        if (colNumber >= 5) {
            cell.numFmt = '#,##0.00';
        }
    });

    // Totals
    const totalRow = worksheet.getRow(16);
    totalRow.getCell(1).value = 'Cộng';
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells('A16:G16');

    totalRow.getCell(8).value = receipt.total_amount || 0;
    totalRow.getCell(8).font = { bold: true };
    totalRow.getCell(8).numFmt = '#,##0.00';
    totalRow.eachCell(cell => {
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Amount in words helper
    const numberToWords = (amount: number): string => {
        if (amount === 0) return 'Không đồng';

        const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

        const readThreeDigits = (num: number, showZeroTen: boolean = false): string => {
            let res = '';
            const h = Math.floor(num / 100);
            const t = Math.floor((num % 100) / 10);
            const u = num % 10;

            if (h > 0) {
                res += units[h] + ' trăm ';
            } else if (showZeroTen) {
                res += 'không trăm ';
            }

            if (t > 0) {
                if (t === 1) res += 'mười ';
                else res += units[t] + ' mươi ';
            } else if (h > 0 || showZeroTen) {
                if (u > 0) res += 'lẻ ';
            }

            if (u > 0) {
                if (t > 1 && u === 1) res += 'mốt';
                else if (t > 0 && u === 5) res += 'lăm';
                else res += units[u];
            }

            return res.trim();
        };

        const levels = ['', 'ngàn', 'triệu', 'tỷ'];
        let res = '';
        let levelIdx = 0;
        let tempAmount = Math.floor(amount);

        while (tempAmount > 0) {
            const part = tempAmount % 1000;
            if (part > 0) {
                const partStr = readThreeDigits(part, tempAmount >= 1000);
                res = partStr + ' ' + levels[levelIdx] + ' ' + res;
            }
            tempAmount = Math.floor(tempAmount / 1000);
            levelIdx++;
        }

        const finalStr = res.trim() + ' đồng';
        return finalStr.charAt(0).toUpperCase() + finalStr.slice(1) + '.';
    };

    worksheet.getCell('A18').value = '- Tổng số tiền (viết bằng chữ):';
    worksheet.getCell('C18').value = numberToWords(receipt.total_amount || 0);
    worksheet.getCell('C18').font = { italic: true, bold: true };
    worksheet.mergeCells('C18:H18');

    // Signatures
    const sigRow = worksheet.getRow(20);
    sigRow.getCell(1).value = 'Người lập biểu';
    sigRow.getCell(3).value = 'Người giao hàng';
    sigRow.getCell(5).value = 'Thủ kho';
    sigRow.getCell(7).value = 'Kế toán trưởng';

    sigRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
    });

    const sigRow2 = worksheet.getRow(21);
    sigRow2.getCell(1).value = '(Ký, họ tên)';
    sigRow2.getCell(3).value = '(Ký, họ tên)';
    sigRow2.getCell(5).value = '(Ký, họ tên)';
    sigRow2.getCell(7).value = '(Hoặc bộ phận có nhu cầu nhập)';

    sigRow2.eachCell(cell => {
        cell.font = { italic: true, size: 8 };
        cell.alignment = { horizontal: 'center' };
    });

    const nameRow = worksheet.getRow(26);
    nameRow.getCell(1).value = receipt.creator?.full_name || '';
    nameRow.getCell(3).value = receipt.supplier_name || '';
    nameRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
    });

    // Export
    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // Sanitize filename
        const cleanReceiptNumber = receipt.receipt_number ? receipt.receipt_number.replace(/[^a-zA-Z0-9-_]/g, '_') : 'new_export';
        const fileName = `Phieu_Nhap_Kho_${cleanReceiptNumber}.xlsx`;

        saveAs(blob, fileName);

        console.log(`[ExcelExport] Exported file: ${fileName}`);
    } catch (error) {
        console.error('[ExcelExport] Export failed:', error);
    }
};
