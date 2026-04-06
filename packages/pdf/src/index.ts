import type { CalculationResult, InheritanceCase } from '@mirath/core'
import type { Locale } from '@mirath/i18n'
import pdfMake from 'pdfmake/build/pdfmake'

const labels = {
  en: {
    title: 'Inheritance Report',
    deceased: 'Deceased',
    name: 'Name',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    dateOfDeath: 'Date of Death',
    totalEstate: 'Total Estate',
    madhab: 'School of Jurisprudence',
    heir: 'Heir',
    relation: 'Relation',
    type: 'Type',
    share: 'Share',
    amount: 'Amount',
    reason: 'Reason',
    totalAllocated: 'Total Allocated',
    remainderMethod: 'Remainder Method',
    warnings: 'Warnings',
    fixed: 'Fixed Share',
    residuary: 'Residuary',
    excluded: 'Excluded',
    blocked: 'Blocked',
    awl: 'Awl (Proportional Reduction)',
    radd: 'Radd (Remainder Return)',
    none: 'None',
    hanafi: 'Hanafi',
    maliki: 'Maliki',
    shafii: "Shafi'i",
    hanbali: 'Hanbali',
    generatedAt: 'Generated at',
  },
  ar: {
    title: 'تقرير المواريث',
    deceased: 'المتوفى',
    name: 'الاسم',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    dateOfDeath: 'تاريخ الوفاة',
    totalEstate: 'إجمالي التركة',
    madhab: 'المذهب الفقهي',
    heir: 'الوارث',
    relation: 'الصلة',
    type: 'النوع',
    share: 'النصيب',
    amount: 'المبلغ',
    reason: 'السبب',
    totalAllocated: 'الإجمالي الموزع',
    remainderMethod: 'طريقة التوزيع',
    warnings: 'تنبيهات',
    fixed: 'فرض',
    residuary: 'عصبة',
    excluded: 'محجوب',
    blocked: 'محجوب حجب حرمان',
    awl: 'عول (تخفيض نسبي)',
    radd: 'رد (إرجاع الباقي)',
    none: 'لا يوجد',
    hanafi: 'حنفي',
    maliki: 'مالكي',
    shafii: 'شافعي',
    hanbali: 'حنبلي',
    generatedAt: 'تاريخ إنشاء التقرير',
  },
}

export async function generatePDF(
  inheritanceCase: InheritanceCase,
  result: CalculationResult,
  locale: Locale
): Promise<Blob> {
  const l = labels[locale]
  const heirsMap = new Map(inheritanceCase.heirs.map((h) => [h.id, h]))

  const tableBody = [
    [
      { text: l.heir, bold: true, fillColor: '#f5f5f5' },
      { text: l.relation, bold: true, fillColor: '#f5f5f5' },
      { text: l.type, bold: true, fillColor: '#f5f5f5' },
      { text: l.share, bold: true, fillColor: '#f5f5f5' },
      { text: l.amount, bold: true, fillColor: '#f5f5f5', alignment: 'right' as const },
    ],
    ...result.shares.map((share) => {
      const heir = heirsMap.get(share.heirId)
      const shareTypeLabel = l[share.shareType as keyof typeof l] || share.shareType
      return [
        { text: heir?.name || share.heirId },
        { text: heir?.relation.replace(/_/g, ' ') || '' },
        { text: shareTypeLabel },
        {
          text: share.fraction
            ? `${share.fraction.numerator}/${share.fraction.denominator}`
            : '—',
        },
        {
          text: share.amount != null
            ? `${share.amount.toLocaleString()} ${inheritanceCase.deceased.currency}`
            : '—',
          alignment: 'right' as const,
        },
      ]
    }),
  ]

  const remainderLabel = l[result.remainderMethod as keyof typeof l] || result.remainderMethod
  const madhabLabel = l[result.madhab as keyof typeof l] || result.madhab

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      { text: l.title, fontSize: 22, bold: true, alignment: 'center', margin: [0, 0, 0, 20] },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: `${l.deceased}`, bold: true, fontSize: 14, margin: [0, 0, 0, 8] },
              { text: `${l.name}: ${inheritanceCase.deceased.name}` },
              { text: `${l.gender}: ${inheritanceCase.deceased.gender === 'male' ? l.male : l.female}` },
              { text: `${l.madhab}: ${madhabLabel}` },
              inheritanceCase.deceased.dateOfDeath
                ? { text: `${l.dateOfDeath}: ${inheritanceCase.deceased.dateOfDeath}` }
                : {},
              { text: `${l.totalEstate}: ${inheritanceCase.deceased.totalEstate.toLocaleString()} ${inheritanceCase.deceased.currency}` },
            ],
          },
        ],
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: tableBody,
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 20],
      },
      {
        columns: [
          { text: `${l.totalAllocated}: ${result.totalAllocated.toLocaleString()} ${inheritanceCase.deceased.currency}`, bold: true },
          { text: `${l.remainderMethod}: ${remainderLabel}`, alignment: 'right' },
        ],
        margin: [0, 0, 0, 12],
      },
      ...(result.warnings.length > 0
        ? [
            { text: l.warnings, bold: true, fontSize: 12, margin: [0, 12, 0, 4] as [number, number, number, number] },
            ...result.warnings.map((w) => ({ text: `• ${w}`, color: '#c00', fontSize: 10 })),
          ]
        : []),
      {
        text: `${l.generatedAt}: ${new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}`,
        fontSize: 9,
        color: '#888',
        alignment: 'center' as const,
        margin: [0, 30, 0, 0],
      },
    ],
  }

  return new Promise<Blob>((resolve) => {
    const pdfDoc = pdfMake.createPdf(docDefinition)
    pdfDoc.getBlob((blob: Blob) => {
      resolve(blob)
    })
  })
}
