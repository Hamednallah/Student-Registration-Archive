
/**
 * Convert number to words
 * @param {number} amount - Amount to convert
 * @returns {string} Amount in words
 */
function convertToWords(amount) {
    if (amount === 0) return 'صفر جنيه';
    
    let parts = [];
    let whole = Math.floor(amount);
    let decimal = Math.round((amount - whole) * 100);
    
    // Process millions
    if (whole >= 1000000) {
        let millions = Math.floor(whole / 1000000);
        parts.push(convertLessThanThousand(millions) + ' مليون');
        whole %= 1000000;
    }
    
    // Process thousands
    if (whole >= 1000) {
        let thousands = Math.floor(whole / 1000);
        parts.push(convertLessThanThousand(thousands) + ' ألف');
        whole %= 1000;
    }
    
    // Process the remainder (hundreds, tens, units)
    if (whole > 0) {
        parts.push(convertLessThanThousand(whole));
    }
    
    // Join the whole number parts with " و " and append currency
    let result = parts.join(' و ') + ' جنيه';
    
    // Append the decimal part if exists
    if (decimal > 0) {
        result += ' و ' + convertLessThanThousand(decimal) + ' قرس';
    }
    
    return result;
}
    
    function convertLessThanThousand(num) {
    const hundreds = [
        "", "مائة", "مئتان", "ثلاثمائة", "أربعمائة",
        "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"
    ];
    const tens = [
        "", "", "عشرون", "ثلاثون", "أربعون",
        "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"
    ];
    const units = [
        "", "واحد", "اثنان", "ثلاثة", "أربعة",
        "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"
    ];
    const teens = [
        "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر",
        "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"
    ];
    
    let parts = [];
    
    // Process hundreds place
    if (num >= 100) {
        let h = Math.floor(num / 100);
        parts.push(hundreds[h]);
        num %= 100;
    }
    
    // Process tens and units for numbers 20 and above
    if (num >= 20) {
        let t = Math.floor(num / 10);
        let remainder = num % 10;
        let tensPart = remainder > 0 ? units[remainder] + ' و ' + tens[t] : tens[t];
        parts.push(tensPart);
    } else if (num >= 10) {
        // Handle teens (10 to 19)
        parts.push(teens[num - 10]);
    } else if (num > 0) {
        parts.push(units[num]);
    }
    
    return parts.join(' و ');
};

function addCommas(amount) {
    // Convert amount to a string and add commas using a regex
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
      
  export {
    convertToWords,
    addCommas
};