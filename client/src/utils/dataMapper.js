export const mapReceiptData = (apiData) => {
  return {
    receiptId: apiData.RECEIPT_ID,
    studentId: apiData.STUDENT_ID,
    bankReceiptNo: apiData.BANK_RECEIPT_NO || '',
    amountNumber: apiData.AMOUNT_NUMBER,
    amountLetters: apiData.AMOUNT_LETTERS,
    paidItems: apiData.PAID_ITEMS,
    semesterNo: apiData.SEMESTER_NO,
    comments: apiData.COMMENTS || '',
    receiptDate: formatDate(apiData.ENTRY_DATE),
    studentName: apiData.STUDENT_NAME,
    departmentName: apiData.DEPARTMENT_NAME,
    enteredByName: apiData.ENTERED_BY_NAME
  };
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};