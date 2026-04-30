import { Tables } from '@/database.types'
import { differenceInDays, format } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Booking = Tables<'Booking'> & {
  Guest: Tables<'Guest'> | null
  Payment:
    | Pick<Tables<'Payment'>, 'amount' | 'method' | 'status' | 'createdAt'>[]
    | null
}

type BookingRoom = Tables<'BookingRoom'> & {
  Room: Tables<'Room'> | null
  RoomType: Tables<'RoomType'> | null
}

type BookingService = Tables<'BookingService'> & {
  Service: Tables<'Service'> | null
}

type Room = Tables<'Room'> & {
  RoomType: Tables<'RoomType'> | null
}

type Service = Tables<'Service'>
type Property = Tables<'Property'>
type Payment = Tables<'Payment'>
type PaymentStatus = Tables<'Payment'>['status']

// Helper function to convert numeric amount to Indian Rupee Words
function amountToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only'
  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const b = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ]

  const numStr = Math.floor(amount).toString()
  if (numStr.length > 9) return 'Amount too large'

  const paddedStr = ('000000000' + numStr).slice(-9)
  const match = paddedStr.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/)
  if (!match) return ''

  const getGroupText = (str: string) => {
    const n = Number(str)
    if (n === 0) return ''
    if (n < 20) return a[n]
    return b[Number(str[0])] + (str[1] !== '0' ? ' ' + a[Number(str[1])] : '')
  }

  let str = ''
  if (Number(match[1]) !== 0) str += getGroupText(match[1]) + ' Crore '
  if (Number(match[2]) !== 0) str += getGroupText(match[2]) + ' Lakh '
  if (Number(match[3]) !== 0) str += getGroupText(match[3]) + ' Thousand '
  if (Number(match[4]) !== 0) str += getGroupText(match[4]) + ' Hundred '
  if (Number(match[5]) !== 0)
    str += (str !== '' ? 'and ' : '') + getGroupText(match[5])

  return str.trim() + ' Rupees Only'
}

export const generateInvoicePDF = (
  folio: Booking,
  assignments: BookingRoom[],
  services: BookingService[],
  property: Property,
  payments: Payment[] = [],
) => {
  const doc = new jsPDF()
  const margin = 15
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  let currentY = 20

  // --- 1. Header Block ---
  // Property Logos (Placeholder if URL not available)
  try {
    // Left: Our Logo
    doc.setDrawColor(240, 240, 240)
    doc.setFillColor(245, 245, 245)
    doc.rect(margin, currentY, 40, 25, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(150, 150, 150)
    doc.text('ANTIGRAVITY', margin + 8, currentY + 12)
    doc.text('PMS', margin + 17, currentY + 16)

    // Right: Property Logo (if available)
    if (property.logoUrl) {
      // Note: In a real browser environment, we'd use doc.addImage
      // For now, we'll placeholder it as a box with text
      doc.rect(pageWidth - margin - 40, currentY, 40, 25, 'F')
      doc.text('LOGO', pageWidth - margin - 25, currentY + 14)
    }
  } catch (e) {
    console.error('Logo error', e)
  }

  currentY += 35

  // Property Details
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59) // Slate-800
  doc.text(property.name.toUpperCase(), pageWidth / 2, currentY, {
    align: 'center',
  })

  currentY += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105) // Slate-600
  doc.text(
    property.address || 'Address not available',
    pageWidth / 2,
    currentY,
    { align: 'center' },
  )

  currentY += 5
  const contactInfo = [
    property.phone && `Ph: ${property.phone}`,
    property.email && `Email: ${property.email}`,
  ]
    .filter(Boolean)
    .join(' | ')
  doc.text(contactInfo, pageWidth / 2, currentY, { align: 'center' })

  // INVOICE label
  currentY += 15
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 10
  doc.setFontSize(14)
  doc.setFont('helvetica', 'black')
  doc.text('TAX INVOICE', margin, currentY)
  doc.setFontSize(10)
  doc.text(
    `DATE: ${format(new Date(), 'dd/MM/yyyy')}`,
    pageWidth - margin,
    currentY,
    { align: 'right' },
  )

  // --- 2. Booking Guest Details ---
  currentY += 10
  doc.setFillColor(248, 250, 252) // Slate-50
  doc.rect(margin, currentY, pageWidth - margin * 2, 45, 'F')

  currentY += 8
  const col1 = margin + 5
  const col2 = pageWidth / 2 + 5
  const labelW = 35

  const drawDetail = (label: string, value: string, x: number, y: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 116, 139)
    doc.text(label, x, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)
    doc.text(String(value || 'N/A'), x + labelW, y)
  }

  drawDetail('Guest Name:', folio.Guest!.name, col1, currentY)
  drawDetail(
    'Invoice ID:',
    `#${folio.id.toUpperCase().slice(0, 8)}`,
    col2,
    currentY,
  )

  currentY += 7
  drawDetail('Phone:', folio.Guest?.phone ?? '', col1, currentY)
  drawDetail('Channel:', folio.source || 'Direct', col2, currentY)

  currentY += 7
  drawDetail('Address:', folio.Guest?.address || 'N/A', col1, currentY)
  drawDetail(
    'Check-In:',
    format(new Date(folio.checkInDate), 'dd MMM yyyy, hh:mm a'),
    col2,
    currentY,
  )

  currentY += 7
  drawDetail(
    'Guests:',
    `${folio.adults} Adults, ${folio.children} Children`,
    col1,
    currentY,
  )
  drawDetail(
    'Check-Out:',
    format(new Date(folio.checkOutDate), 'dd MMM yyyy, hh:mm a'),
    col2,
    currentY,
  )

  currentY += 7
  drawDetail('Total Rooms:', `${assignments.length}`, col1, currentY)

  currentY += 15

  // --- 3. Room Details ---
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('ROOM DETAILS', margin, currentY)
  currentY += 4

  const roomData = assignments.map((a) => [
    a.RoomType?.name || 'Standard Room',
    a.Room?.roomNumber || 'N/A',
    `INR ${Number(a.priceOverride || a.RoomType?.defaultPrice || 0).toLocaleString()}`,
  ])

  autoTable(doc, {
    startY: currentY,
    head: [['Room Type', 'Room No.', 'Daily Rate']],
    body: roomData,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: margin, right: margin },
  })

  // --- 4.1 Charges ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable.finalY + 12
  doc.setFont('helvetica', 'bold')
  doc.text('CHARGES & SERVICES', margin, currentY)
  currentY += 4

  const totalNights = Math.max(
    1,
    differenceInDays(new Date(folio.checkOutDate), new Date(folio.checkInDate)),
  )
  const chargesData: Array<string[]> = []

  const roomSubtotal = assignments.reduce(
    (sum, a) =>
      sum + (Number(a.priceOverride) || Number(a.RoomType?.defaultPrice) || 0),
    0,
  )
  const totalRoomCharges = roomSubtotal * totalNights

  chargesData.push([
    `Accommodation (${totalNights} Night(s) x ${assignments.length} Room(s))`,
    `INR ${totalRoomCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
  ])

  services.forEach((s) => {
    chargesData.push([
      `${s.Service?.name || 'Service'} (Price: ${Number(s.totalPrice).toLocaleString()} x Qty: ${s.quantity})`,
      `INR ${Number(s.totalPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    ])
  })

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Amount']],
    body: chargesData,
    theme: 'striped',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: margin, right: margin },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable.finalY + 10

  // --- 4.3 Totals Section ---
  const serviceSubtotal = services.reduce(
    (sum, s) => sum + Number(s.totalPrice),
    0,
  )
  const subtotal = totalRoomCharges + serviceSubtotal

  const discount =
    folio.discountType === 'PERCENTAGE'
      ? subtotal * (Number(folio.discountAmount) / 100)
      : Number(folio.discountAmount || 0)

  const taxRate = (property.taxPercentage || 0) / 100
  const tax = (subtotal - discount) * taxRate
  const payableAmount = subtotal - discount + tax

  const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const dueAmount = payableAmount - paidAmount

  // Words and Summary Grid
  doc.setFillColor(248, 250, 252)
  doc.rect(margin, currentY, pageWidth - margin * 2, 45, 'F')

  currentY += 8
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Amount in Words:', margin + 5, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(amountToWords(payableAmount), margin + 5, currentY + 5, {
    maxWidth: 80,
  })

  const totalColX = pageWidth - margin - 60
  const totalValX = pageWidth - margin - 5

  const drawTotalRow = (
    label: string,
    value: number,
    y: number,
    isBold = false,
  ) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')
    doc.setTextColor(isBold ? 0 : 70)
    doc.text(label, totalColX, y)
    doc.text(
      `INR ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      totalValX,
      y,
      { align: 'right' },
    )
  }

  drawTotalRow('Sub Total:', subtotal, currentY)
  drawTotalRow('Discount:', discount, currentY + 6)
  drawTotalRow(`Tax (${property.taxPercentage}%):`, tax, currentY + 12)

  currentY += 22
  doc.setDrawColor(203, 213, 225)
  doc.line(totalColX, currentY - 5, totalValX, currentY - 5)

  drawTotalRow('Grand Total:', payableAmount, currentY, true)
  drawTotalRow('Paid Amount:', paidAmount, currentY + 6)
  drawTotalRow('Balance Due:', dueAmount, currentY + 12, true)

  currentY += 25

  // --- 5. Payment Breakup ---
  if (payments.length > 0) {
    if (currentY > pageHeight - 60) {
      doc.addPage()
      currentY = 20
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('PAYMENT BREAKUP', margin, currentY)
    currentY += 5

    const paymentData = payments.map((p) => [
      format(new Date(p.createdAt ?? ''), 'dd MMM yyyy, hh:mm a'),
      p.method || 'N/A',
      `#${p.id.slice(0, 8).toUpperCase()}`,
      `INR ${Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    ])

    autoTable(doc, {
      startY: currentY,
      head: [['Date & Time', 'Payment Mode', 'Reference ID', 'Amount']],
      body: paymentData,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      margin: { left: margin, right: margin },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable.finalY + 25
  } else {
    currentY += 10
  }

  // Footer / Signatures
  if (currentY > pageHeight - 40) {
    doc.addPage()
    currentY = 30
  }

  doc.setDrawColor(203, 213, 225)
  doc.line(margin, currentY, margin + 50, currentY)
  doc.line(pageWidth - margin - 50, currentY, pageWidth - margin, currentY)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Guest Signature', margin + 10, currentY + 5)
  doc.text('Authorized Signatory', pageWidth - margin - 45, currentY + 5)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(148, 163, 184)
  doc.text(
    'This is a computer generated invoice and does not require a physical signature.',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' },
  )
  doc.text('TravelsPuri13 v1.2', pageWidth / 2, pageHeight - 10, {
    align: 'center',
  })

  doc.save(
    `Invoice_${folio.id.slice(0, 8)}_${folio.Guest?.name?.replace(' ', '_')}.pdf`,
  )
}
