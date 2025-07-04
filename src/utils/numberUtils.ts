export function convertNumberToWords(amount: number): string {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

  function convertLessThanOneThousand(n: number): string {
    if (n % 1 === 0) {
      if (n < 10) return units[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
      if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanOneThousand(n % 100) : '');
    }
    return '';
  }

  if (amount === 0) return 'Zero';

  let words = '';
  let i = 0;
  let num = Math.floor(amount);

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk !== 0) {
      words = convertLessThanOneThousand(chunk) + (chunk !== 0 ? ' ' + thousands[i] : '') + (words ? ' ' + words : '');
    }
    num = Math.floor(num / 1000);
    i++;
  }

  return words + ' Rupees Only';
}
