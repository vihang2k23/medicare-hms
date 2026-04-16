import MediCareLogo from '../brand/MediCareLogo'
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
      <div className="medicare-print-fixed-header__top">
        <div className="medicare-print-fixed-header__logo-wrap">
          <MediCareLogo size="sm" title={false} />
        </div>
        <div className="medicare-print-fixed-header__brand-col">
          <p className="medicare-print-fixed-header__brand">MediCare HMS</p>
          <p className="medicare-print-fixed-header__product">Hospital Management System</p>
        </div>
      </div>
      <p className="medicare-print-fixed-header__title">{documentLabel}</p>
      {detail ? <p className="medicare-print-fixed-header__detail">{detail}</p> : null}
      <p className="medicare-print-fixed-header__meta">Printed {printedAt}</p>
    </div>
  )
}

export function MedicarePrintPageFooter() {
  return (
    <div className="medicare-print-fixed-footer print-only-medicare-chrome">
      <div className="medicare-print-fixed-footer__brand">
        <div className="medicare-print-fixed-footer__logo-wrap">
          <MediCareLogo size="sm" title={false} />
        </div>
        <span className="medicare-print-fixed-footer__name">MediCare HMS</span>
      </div>
      <p className="medicare-print-fixed-footer__line">
        Confidential — MediCare HMS. Authorized use only.
      </p>
      <p className="medicare-print-fixed-footer__line medicare-print-fixed-footer__muted">
        Do not redistribute outside approved workflows.
      </p>
    </div>
  )
}
