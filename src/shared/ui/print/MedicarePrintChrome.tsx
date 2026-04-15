import { medicarePrintTimestamp } from '../../lib/medicarePrintTimestamp'

// MedicarePrintChrome defines the Medicare Print Chrome UI surface and its primary interaction flow.
type MedicarePrintPageHeaderProps = {
  documentLabel: string
  detail?: string
}

// MedicarePrintPageHeader renders the medicare print chrome UI.
export function MedicarePrintPageHeader({ documentLabel, detail }: MedicarePrintPageHeaderProps) {
  const printedAt = medicarePrintTimestamp()
  return (
    <div className="medicare-print-fixed-header print-only-medicare-chrome">
      <p className="medicare-print-fixed-header__brand">MediCare Hospital Management System</p>
      <p className="medicare-print-fixed-header__title">{documentLabel}</p>
      {detail ? <p className="medicare-print-fixed-header__detail">{detail}</p> : null}
      <p className="medicare-print-fixed-header__meta">Printed {printedAt}</p>
    </div>
  )
}

export function MedicarePrintPageFooter() {
  return (
    <div className="medicare-print-fixed-footer print-only-medicare-chrome">
      <p className="medicare-print-fixed-footer__line">
        Confidential — MediCare HMS. Authorized use only.
      </p>
      <p className="medicare-print-fixed-footer__line medicare-print-fixed-footer__muted">
        Do not redistribute outside approved workflows.
      </p>
    </div>
  )
}
