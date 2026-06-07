import { differenceInCalendarDays, format } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Guest = {
  name: string
  phone: string | null
  address: string | null
}

type RoomType = {
  id: string
  name: string
  defaultPrice: number | null
}

type Room = {
  id: string
  roomNumber: string
}

type BookingRoom = {
  id: string
  checkInDate: string | null
  checkOutDate: string | null
  priceOverride: number | null
  RoomType: RoomType | null
  Room: Room | null
}

type Booking = {
  id: string
  adults: number | null
  children: number | null
  checkInDate: string
  checkOutDate: string
  guestId?: string
  waiveLastDayCharge: boolean | null
  Guest: Guest | null
  source: string | null
}

type Property = {
  name: string
  address: string
  phone: string | null
  email: string | null
  logoUrl: string | null
  checkOutTime: string | null
  taxPercentage: number | null
  settings: {
    checkoutTime: string
    taxAmount?: number
  } | null
}

type ServiceType = {
  id: string
  name: string
}

type BookingService = {
  id: string
  Service: ServiceType | null
  quantity: number | null
  totalPrice: number
}

type Payment = {
  id: string
  amount: number
  method: string
  createdAt: string | null
}

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

const getImageData = async (url: string): Promise<{ base64: string, width: number, height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject('Could not get canvas context')
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve({
        base64: canvas.toDataURL('image/png'),
        width: img.width,
        height: img.height
      })
    }
    img.onerror = (e) => reject(e)
    img.src = url
  })
}

const getRoomStayNights = (
  item: BookingRoom,
  f: Booking,
  p: Property
) => {
  const bookingCheckInDate = new Date(f.checkInDate)
  const bookingCheckOutDate = new Date(f.checkOutDate)

  const checkOutTimeStr = format(bookingCheckOutDate, 'HH:mm:ss')
  const propCheckOutTime = p.settings?.checkoutTime
    ? `${p.settings.checkoutTime}`
    : (p.checkOutTime || '07:00:00')

  const itemCheckIn = item.checkInDate ? new Date(item.checkInDate) : bookingCheckInDate
  const itemCheckOut = item.checkOutDate ? new Date(item.checkOutDate) : bookingCheckOutDate
  
  let roomNights = differenceInCalendarDays(itemCheckOut, itemCheckIn)
  
  // Only apply late checkout extra charge/waiver if we fall back to booking dates
  if (!item.checkOutDate) {
    if (checkOutTimeStr > propCheckOutTime) {
      roomNights += 1
    }
    if (f.waiveLastDayCharge) {
      roomNights -= 1
    }
  }
  
  return Math.max(1, roomNights)
}

export const generateInvoicePDF = async (
  folio: Booking,
  assignments: BookingRoom[],
  services: BookingService[],
  property: Property,
  payments: Payment[] = [],
  totals: {
    nights: number
    roomTotal: number
    serviceTotal: number
    subtotal: number
    discount: number
    tax: number
    total: number
    totalPaid: number
    balance: number
      showTax?: boolean
    },
    mode: 'download' | 'print' = 'download',
  ) => {
    const doc = new jsPDF({
      format: 'a4',
      compress: true
    })
    const margin = 15
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    let currentY = 15
  
    // --- 1. Header Block ---
    try {
      // Left: Our Logo (public/logo.svg)
      const ourLogoData = await getImageData('/logo_large.svg')
      doc.addImage(ourLogoData.base64, 'JPEG', margin, currentY, 80, 30, undefined, 'FAST')
  
      // Right: Property Logo (if available)
      if (property.logoUrl) {
        try {
          const propLogoData = await getImageData(property.logoUrl)
          
          const maxLogoWidth = 50
          const maxLogoHeight = 30
          
          let finalLogoWidth = propLogoData.width
          let finalLogoHeight = propLogoData.height
          
          const ratio = Math.min(maxLogoWidth / finalLogoWidth, maxLogoHeight / finalLogoHeight)
          
          finalLogoWidth = finalLogoWidth * ratio
          finalLogoHeight = finalLogoHeight * ratio

          doc.addImage(
            propLogoData.base64,
            'JPEG',
            pageWidth - margin - finalLogoWidth,
            currentY + (maxLogoHeight - finalLogoHeight) / 2,
            finalLogoWidth,
            finalLogoHeight,
            undefined, 
            'FAST'
          )
        } catch (e) {
          console.error('Property logo load error', e)
          // Fallback or just skip
        }
      }
    } catch (e) {
      console.error('Logo error', e)
      // Fallback to text if logos fail
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('TRAVELS PURI 13', margin, currentY + 10)
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
    currentY += 5
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 10
    doc.setFontSize(14)
    doc.setFont('helvetica', 'black')
    doc.text('INVOICE', margin, currentY)
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
    const col2 = pageWidth / 2 + 10
    const labelW = 28
  
    const drawDetail = (label: string, value: string, x: number, y: number, isWrapped = false) => {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text(label, x, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 41, 59)
      
      const valStr = String(value || 'N/A')
      if (isWrapped) {
        const maxWidth = (pageWidth / 2) - margin - labelW
        const lines = doc.splitTextToSize(valStr, maxWidth)
        doc.text(lines, x + labelW, y)
        return lines.length
      } else {
        doc.text(valStr, x + labelW, y)
        return 1
      }
    }
  
    drawDetail('Guest Name:', folio.Guest!.name, col1, currentY)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gstin = (folio.Guest as any)?.gstin
    if (gstin) {
      currentY += 7
      drawDetail('GSTIN:', gstin, col1, currentY)
    }
  
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
    const addressLinesCount = drawDetail('Address:', folio.Guest?.address || 'N/A', col1, currentY, true)
    drawDetail(
      'Check-In:',
      format(new Date(folio.checkInDate), 'dd MMM yyyy, hh:mm a'),
      col2,
      currentY,
    )

    if (addressLinesCount > 1) {
      currentY += (addressLinesCount - 1) * 5
    }
  
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
    // doc.setFontSize(11)
    // doc.setFont('helvetica', 'bold')
    // doc.setTextColor(30, 41, 59)
    // doc.text('ROOM DETAILS', margin, currentY)
    // currentY += 7
  
    // const roomNumbers = assignments.map((a) => a.Room?.roomNumber).filter(Boolean).join(', ')
    // doc.setFont('helvetica', 'normal')
    // doc.text('Room No.: ' + roomNumbers, margin, currentY)

    // currentY += 12

    // const roomData = assignments.map((a) => [
    //   a.RoomType?.name || 'Standard Room',
    //   a.Room?.roomNumber || 'N/A',
    //   `INR ${Number(a.priceOverride || a.RoomType?.defaultPrice || 0).toLocaleString()}`,
    // ])
  
    // autoTable(doc, {
    //   startY: currentY,
    //   head: [['Room Type', 'Room No.', 'Daily Rate']],
    //   body: roomData,
    //   theme: 'grid',
    //   headStyles: {
    //     fillColor: [51, 65, 85],
    //     textColor: [255, 255, 255],
    //     fontStyle: 'bold',
    //   },
    //   styles: { fontSize: 9, cellPadding: 3 },
    //   margin: { left: margin, right: margin },
    // })
  
    // --- 4.1 Charges ---
    // currentY = (doc as any).lastAutoTable.finalY + 12
    doc.setFont('helvetica', 'bold')
    doc.text('CHARGES & SERVICES', margin, currentY)
    currentY += 7
    const chargesData: Array<string[]> = []
  
    assignments.forEach((a) => {
      const roomNights = getRoomStayNights(a, folio, property)
      const itemCheckIn = a.checkInDate ? new Date(a.checkInDate) : new Date(folio.checkInDate)
      const itemCheckOut = a.checkOutDate ? new Date(a.checkOutDate) : new Date(folio.checkOutDate)
      const datesStr = `${format(itemCheckIn, 'dd MMM yyyy')} - ${format(itemCheckOut, 'dd MMM yyyy')}`
      const roomNum = a.Room?.roomNumber || 'N/A'
      const roomType = a.RoomType?.name || 'Standard'
      const rate = Number(a.priceOverride) || Number(a.RoomType?.defaultPrice) || 0
      const total = rate * roomNights

      chargesData.push([
        `Accommodation: Room ${roomNum} (${roomType}) - ${roomNights} Night(s) [${datesStr}] @ INR ${rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}/night`,
        `INR ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      ])
    })
  
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
    const subtotal = totals.subtotal
    const discount = totals.discount
    const tax = totals.tax
    const payableAmount = totals.total
    const paidAmount = totals.totalPaid
    const dueAmount = totals.balance
  
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
    if(discount > 0) {
      drawTotalRow('Discount:', discount, currentY + 6)
    }
    if (totals.tax > 0 || totals.showTax) {
      drawTotalRow(`Tax (${property.settings?.taxAmount ?? property.taxPercentage}%):`, tax, currentY + 12)
    }
  
    currentY += 18
    doc.setDrawColor(203, 213, 225)
    doc.line(totalColX, currentY - 5, totalValX, currentY - 5)
  
    drawTotalRow('Grand Total:', payableAmount, currentY, true)
    drawTotalRow('Paid Amount:', paidAmount, currentY + 6)
    if(dueAmount > 0) {
      drawTotalRow('Balance Due:', dueAmount, currentY + 12, true)
    }
  
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
    // doc.text(
    //   'This is a computer generated invoice and does not require a physical signature.',
    //   pageWidth / 2,
    //   pageHeight - 15,
    //   { align: 'center' },
    // )
    doc.text('TravelsPuri13 v1.2', pageWidth / 2, pageHeight - 10, {
      align: 'center',
    })
  
    if (mode === 'print') {
      doc.autoPrint()
      window.open(doc.output('bloburl'), '_blank')
    } else {
      doc.save(
        `Invoice_${folio.id.slice(0, 8)}_${folio.Guest?.name?.replace(' ', '_')}.pdf`,
      )
    }
  }
