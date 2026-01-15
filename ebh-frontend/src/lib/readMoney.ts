
export function readMoney(number: number | undefined | null): string {
    if (number === undefined || number === null) return 'Không đồng';
    if (isNaN(number)) return 'Số không hợp lệ';
    if (number === 0) return 'Không đồng';

    const dict: any = {
        0: 'không', 1: 'một', 2: 'hai', 3: 'ba', 4: 'bốn', 5: 'năm', 6: 'sáu', 7: 'bảy', 8: 'tám', 9: 'chín'
    };
    const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

    // Convert to integer string (ignore decimals for reading money usually, or round)
    // Rounding to int for simplicity in reading
    const str = Math.round(number).toString();
    const result: string[] = [];

    // Split into groups of 3
    const groups = [];
    for (let i = str.length; i > 0; i -= 3) {
        groups.push(str.substring(Math.max(0, i - 3), i));
    }

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const num = parseInt(group);

        // Skip empty groups unless it's the only group
        if (num === 0 && groups.length > 1) {
            // Handle cases like 1.000.000 (triệu chẵn)
            // If previous groups were processed, we might need unit? No, Vietnamese system works by skipping 000 except for special cases.
            // Simple version: just skip
            continue;
        }

        const unit = units[i];
        let groupText = '';

        const tram = Math.floor(num / 100);
        const chuc = Math.floor((num % 100) / 10);
        const donvi = num % 10;

        if (group.length === 3) {
            groupText += dict[tram] + ' trăm';
            if (chuc === 0 && donvi === 0) {
                // do nothing
            } else if (chuc === 0 && donvi !== 0) {
                groupText += ' lẻ ' + dict[donvi];
            } else {
                groupText += ' ' + readTens(chuc, donvi, dict);
            }
        } else if (group.length === 2) {
            groupText += readTens(chuc, donvi, dict);
        } else {
            groupText += dict[donvi];
        }

        // Fix: "một nghìn" instead of "nghìn" at start if desired, but "một" is correct.

        result.unshift(groupText + (unit ? ' ' + unit : ''));
    }

    // Joining logic needs care.
    // If higher groups exist and lower group is < 100, might need "không trăm" logic if strict.
    // However, simplified version is often acceptable.

    let final = result.join(' ').trim();

    // Capitalize first letter
    return final.charAt(0).toUpperCase() + final.slice(1) + ' đồng';
}

function readTens(chuc: number, donvi: number, dict: any) {
    let text = '';
    if (chuc === 1) {
        text += 'mười';
    } else {
        text += dict[chuc] + ' mươi';
    }

    if (donvi === 1) {
        if (chuc > 1) text += ' mốt';
        else text += ' một';
    } else if (donvi === 5) {
        if (chuc > 0) text += ' lăm';
        else text += ' năm';
    } else if (donvi !== 0) {
        text += ' ' + dict[donvi];
    }
    return text;
}
