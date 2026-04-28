import { differenceInDays, format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to convert numeric amount to Indian Rupee Words
function amountToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const numStr = Math.floor(amount).toString();
  if (numStr.length > 9) return 'Amount too large';
  
  const paddedStr = ('000000000' + numStr).slice(-9);
  const match = paddedStr.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!match) return '';
  
  const getGroupText = (str: string) => {
    const n = Number(str);
    if (n === 0) return '';
    if (n < 20) return a[n];
    return b[Number(str[0])] + (str[1] !== '0' ? ' ' + a[Number(str[1])] : '');
  };

  let str = '';
  if (Number(match[1]) !== 0) str += getGroupText(match[1]) + ' Crore ';
  if (Number(match[2]) !== 0) str += getGroupText(match[2]) + ' Lakh ';
  if (Number(match[3]) !== 0) str += getGroupText(match[3]) + ' Thousand ';
  if (Number(match[4]) !== 0) str += getGroupText(match[4]) + ' Hundred ';
  if (Number(match[5]) !== 0) str += (str !== '' ? 'and ' : '') + getGroupText(match[5]);
  
  return str.trim() + ' Rupees Only';
}

export const generateInvoicePDF = (
  folio: any,
  assignments: any[],
  services: any[],
  property: any,
  payments: any[] = []
) => {
  const doc = new jsPDF()
  const margin = 15
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  let currentY = 20

  // 1. Header Block
  // Optional Logos
  doc.setDrawColor(200, 200, 200)
  doc.rect(margin, currentY, 30, 20)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text('OUR LOGO', margin + 5, currentY + 11)

  doc.rect(margin + 35, currentY, 30, 20)
  doc.text('PROP LOGO', margin + 40, currentY + 11)

  currentY += 30
  
  // Property Info
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(property.name.toUpperCase(), margin, currentY)
  
  currentY += 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(property.address || 'Address not available', margin, currentY)

  currentY += 5
  doc.text(`Phone: ${property.phone || 'N/A'} | Email: ${property.email || 'N/A'}`, margin, currentY)

  // Align "INVOICE" title to the top right
  doc.setFontSize(28)
  doc.setTextColor(150, 150, 150)
  doc.text('INVOICE', pageWidth - margin, 35, { align: 'right' })
  doc.setTextColor(0, 0, 0)

  // 2. Booking Guest Details
  currentY += 15
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, currentY, pageWidth - margin, currentY)
  
  currentY += 10
  const leftColX = margin
  const rightColX = pageWidth / 2 + 10
  
  doc.setFontSize(10)
  
  // Row 1
  doc.setFont('helvetica', 'bold')
  doc.text('Guest Name:', leftColX, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(folio.Guest?.name || 'N/A', leftColX + 30, currentY)

  doc.setFont('helvetica', 'bold')
  doc.text('Invoice ID:', rightColX, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${folio.id.toUpperCase().slice(0, 8)}`, rightColX + 30, currentY)

  // Row 2
  currentY += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Phone:', leftColX, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(folio.Guest?.phone || 'N/A', leftColX + 30, currentY)

  doc.setFont('helvetica', 'bold')
  doc.text('Channel:', rightColX, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(folio.source || 'N/A', rightColX + 30, currentY)

  // Row 3
  currentY += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Address:', leftColX, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text('N/A', leftColX + 30, currentY)

  doc.setFont('helvetica', 'bold')
  doc.text('Check-In:', rightColX, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(format(new Date(folio.checkInDate), 'dd MMM yyyy, hh:mm a'), rightColX + 30, currentY)

  // Row 4
  currentY += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Guests:', leftColX, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(`${folio.adults || 1} Adult(s), ${folio.children || 0} Child(ren)`, leftColX + 30, currentY)

  doc.setFont('helvetica', 'bold')
  doc.text('Check-Out:', rightColX, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(format(new Date(folio.checkOutDate), 'dd MMM yyyy, hh:mm a'), rightColX + 30, currentY)

  // Row 5
  currentY += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Rooms Count:', leftColX, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(`${assignments.length}`, leftColX + 30, currentY)

  currentY += 15

  // 3. Room Details
  const roomData = assignments.map(a => [
    a.RoomType?.name || 'Standard Room',
    a.Room?.roomNumber || 'N/A',
    `INR ${Number(a.priceOverride || a.RoomType?.defaultPrice || 0).toLocaleString()}`
  ])

  autoTable(doc, {
    startY: currentY,
    head: [['Room Type', 'Room No.', 'Price (Per Night)']],
    body: roomData,
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    margin: { left: margin, right: margin }
  })

  // 4.1 Charges
  currentY = (doc as any).lastAutoTable.finalY + 15

  const totalNights = Math.max(1, differenceInDays(new Date(folio.checkOutDate), new Date(folio.checkInDate)))
  const chargesData: Array<string[]> = []
  
  const roomSubtotal = assignments.reduce((sum, a) => sum + (Number(a.priceOverride) || Number(a.RoomType?.defaultPrice) || 0), 0)
  const totalRoomCharges = roomSubtotal * totalNights
  
  chargesData.push([
    `Accommodation Charges (${totalNights} night(s) x ${assignments.length} room(s) x Daily Rate)`,
    `INR ${totalRoomCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ])

  services.forEach(s => {
    chargesData.push([
      `Service: ${s.Service?.name || 'Add-on'} (Qty: ${s.quantity})`,
      `INR ${Number(s.totalPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ])
  })

  autoTable(doc, {
    startY: currentY,
    head: [['Charges Detail', 'Amount']],
    body: chargesData,
    theme: 'plain',
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: { bottom: 0.5 } as any, lineColor: 200 },
    bodyStyles: { lineWidth: 0 },
    margin: { left: margin, right: margin }
  })

  currentY = (doc as any).lastAutoTable.finalY + 5

  // 4.2 Divider
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 10

  // 4.3 Totals Section
  const serviceSubtotal = services.reduce((sum, s) => sum + Number(s.totalPrice), 0)
  const subtotal = totalRoomCharges + serviceSubtotal
  
  const discount = folio.discountType === 'PERCENTAGE' 
    ? subtotal * (Number(folio.discountAmount) / 100)
    : Number(folio.discountAmount || 0)

  const taxRate = property.taxPercentage / 100
  const tax = (subtotal - discount) * taxRate
  const payableAmount = subtotal - discount + tax
  
  const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const dueAmount = payableAmount - paidAmount

  // Left - Words
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Total Amount (in words):', margin, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(amountToWords(payableAmount), margin, currentY + 6)
  
  // Right - Amounts
  const totalsXLabel = pageWidth - 80
  const totalsXValue = pageWidth - margin
  doc.setFontSize(10)

  const renderTotalRow = (label: string, value: number, isBold: boolean = false, yOffset: number) => {
    if (isBold) doc.setFont('helvetica', 'bold')
    else doc.setFont('helvetica', 'normal')
    doc.text(label, totalsXLabel, currentY + yOffset)
    doc.text(`INR ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsXValue, currentY + yOffset, { align: 'right' })
  }

  renderTotalRow('Payable Amount:', subtotal, false, 0)
  renderTotalRow('Discount Amount:', discount, false, 6)
  renderTotalRow(`Tax Amount (${property.taxPercentage}%):`, tax, false, 12)
  renderTotalRow('Grand Total:', payableAmount, true, 20)
  renderTotalRow('Paid Amount:', paidAmount, false, 28)
  renderTotalRow('Balance Due:', dueAmount, true, 34)

  currentY += 50

  // Handle page break before Payment Breakup if needed
  if (currentY > pageHeight - 60) {
    doc.addPage()
    currentY = 20
  }

  // 5. Payment Breakup
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Payment Breakup', margin, currentY)
  currentY += 8

  if (payments.length > 0) {
    const paymentData = payments.map(p => [
      format(new Date(p.createdAt), 'dd MMM yyyy'),
      format(new Date(p.createdAt), 'hh:mm a'),
      p.method || 'N/A',
      `#${p.id.slice(0, 8).toUpperCase()}`,
      `INR ${Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ])

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Time', 'Mode of Payment', 'Receipt No.', 'Amount']],
      body: paymentData,
      theme: 'grid',
      headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: margin, right: margin }
    })
    currentY = (doc as any).lastAutoTable.finalY + 30
  } else {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    doc.text('No payment records found for this folio.', margin, currentY + 5)
    currentY += 25
  }

  // Check if signatures fit
  if (currentY > pageHeight - 40) {
    doc.addPage()
    currentY = 30
  }

  // 6. Signatures
  doc.setDrawColor(0, 0, 0)
  doc.line(margin, currentY, margin + 50, currentY)
  doc.line(pageWidth - margin - 50, currentY, pageWidth - margin, currentY)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Guest Signature', margin + 10, currentY + 5)
  doc.text('Authorized Signatory', pageWidth - margin - 45, currentY + 5)

  // 7. Footer
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(150, 150, 150)
  doc.text('This is a computer generated invoice and does not require a physical signature.', pageWidth / 2, pageHeight - 15, { align: 'center' })
  doc.text('Powered by Antigravity PMS', pageWidth / 2, pageHeight - 10, { align: 'center' })

  // Save the PDF
  doc.save(`Invoice_${folio.id.slice(0, 8)}_${folio.Guest.name.replace(' ', '_')}.pdf`)
}
