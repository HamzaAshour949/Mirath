import type { CalculationResult, InheritanceCase } from '@mirath/core'
import type { Locale } from '@mirath/i18n'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

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

// Minimal valid .docx template as a base (contains {variables} for templating)
function createMinimalTemplate(): PizZip {
  const zip = new PizZip()

  // [Content_Types].xml
  zip.file('[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>'
  )

  // _rels/.rels
  zip.file('_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>'
  )

  // word/_rels/document.xml.rels
  zip.file('word/_rels/document.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '</Relationships>'
  )

  return zip
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function generateDOCX(
  inheritanceCase: InheritanceCase,
  result: CalculationResult,
  locale: Locale
): Promise<ArrayBuffer> {
  const l = labels[locale]
  const heirsMap = new Map(inheritanceCase.heirs.map((h) => [h.id, h]))
  const bidi = locale === 'ar' ? '<w:bidi/>' : ''

  // Build document body XML
  const rows = result.shares.map((share) => {
    const heir = heirsMap.get(share.heirId)
    const shareTypeLabel = l[share.shareType as keyof typeof l] || share.shareType
    const fractionStr = share.fraction
      ? `${share.fraction.numerator}/${share.fraction.denominator}`
      : '—'
    const amountStr = share.amount != null
      ? `${share.amount.toLocaleString()} ${inheritanceCase.deceased.currency}`
      : '—'

    return `<w:tr>
      <w:tc><w:p><w:pPr>${bidi}</w:pPr><w:r><w:t>${escapeXml(heir?.name || share.heirId)}</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:pPr>${bidi}</w:pPr><w:r><w:t>${escapeXml(heir?.relation.replace(/_/g, ' ') || '')}</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:pPr>${bidi}</w:pPr><w:r><w:t>${escapeXml(String(shareTypeLabel))}</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:pPr>${bidi}</w:pPr><w:r><w:t>${escapeXml(fractionStr)}</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:pPr>${bidi}</w:pPr><w:r><w:t>${escapeXml(amountStr)}</w:t></w:r></w:p></w:tc>
    </w:tr>`
  }).join('\n')

  const remainderLabel = l[result.remainderMethod as keyof typeof l] || result.remainderMethod
  const madhabLabel = l[result.madhab as keyof typeof l] || result.madhab
  const genderLabel = inheritanceCase.deceased.gender === 'male' ? l.male : l.female

  const warningsXml = result.warnings.length > 0
    ? `<w:p><w:pPr><w:pStyle w:val="Heading2"/>${bidi}</w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(l.warnings)}</w:t></w:r></w:p>` +
      result.warnings.map(w => `<w:p><w:pPr>${bidi}</w:pPr><w:r><w:t>• ${escapeXml(w)}</w:t></w:r></w:p>`).join('\n')
    : ''

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:pPr><w:jc w:val="center"/>${bidi}</w:pPr><w:r><w:rPr><w:b/><w:sz w:val="44"/></w:rPr><w:t>${escapeXml(l.title)}</w:t></w:r></w:p>
    <w:p/>
    <w:p><w:pPr>${bidi}</w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>${escapeXml(l.deceased)}</w:t></w:r></w:p>
    <w:p><w:pPr>${bidi}</w:pPr><w:r><w:t>${escapeXml(l.name)}: ${escapeXml(inheritanceCase.deceased.name)}</w:t></w:r></w:p>
    <w:p><w:pPr>${bidi}</w:pPr><w:r><w:t>${escapeXml(l.gender)}: ${escapeXml(genderLabel)}</w:t></w:r></w:p>
    <w:p><w:pPr>${bidi}</w:pPr><w:r><w:t>${escapeXml(l.madhab)}: ${escapeXml(String(madhabLabel))}</w:t></w:r></w:p>
    ${inheritanceCase.deceased.dateOfDeath ? `<w:p><w:pPr>${bidi}</w:pPr><w:r><w:t>${escapeXml(l.dateOfDeath)}: ${escapeXml(inheritanceCase.deceased.dateOfDeath)}</w:t></w:r></w:p>` : ''}
    <w:p><w:pPr>${bidi}</w:pPr><w:r><w:t>${escapeXml(l.totalEstate)}: ${escapeXml(inheritanceCase.deceased.totalEstate.toLocaleString())} ${escapeXml(inheritanceCase.deceased.currency)}</w:t></w:r></w:p>
    <w:p/>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        </w:tblBorders>
        ${locale === 'ar' ? '<w:bidiVisual/>' : ''}
      </w:tblPr>
      <w:tr>
        <w:tc><w:p><w:pPr>${bidi}</w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(l.heir)}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr>${bidi}</w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(l.relation)}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr>${bidi}</w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(l.type)}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr>${bidi}</w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(l.share)}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr>${bidi}</w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(l.amount)}</w:t></w:r></w:p></w:tc>
      </w:tr>
      ${rows}
    </w:tbl>
    <w:p/>
    <w:p><w:pPr>${bidi}</w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(l.totalAllocated)}: ${escapeXml(result.totalAllocated.toLocaleString())} ${escapeXml(inheritanceCase.deceased.currency)}</w:t></w:r></w:p>
    <w:p><w:pPr>${bidi}</w:pPr><w:r><w:t>${escapeXml(l.remainderMethod)}: ${escapeXml(String(remainderLabel))}</w:t></w:r></w:p>
    ${warningsXml}
    <w:p/>
    <w:p><w:pPr><w:jc w:val="center"/>${bidi}</w:pPr><w:r><w:rPr><w:color w:val="888888"/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(l.generatedAt)}: ${escapeXml(new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US'))}</w:t></w:r></w:p>
  </w:body>
</w:document>`

  const zip = createMinimalTemplate()
  zip.file('word/document.xml', documentXml)
  const buffer = zip.generate({ type: 'arraybuffer' })
  return buffer
}
