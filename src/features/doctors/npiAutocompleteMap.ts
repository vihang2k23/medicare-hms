import type { NpiProviderCard, NpiRawResult } from '../../shared/lib/npiRegistryApi'
import { taxonomyToDepartment } from '../../shared/lib/npiRegistryApi'

function pickPracticeAddress(addrs: NpiRawResult['addresses']) {
  if (!addrs?.length) return undefined
  return (
    addrs.find((a) => (a.address_purpose ?? '').toUpperCase() === 'LOCATION') ??
    addrs.find((a) => (a.address_purpose ?? '').toUpperCase() === 'PRIMARY') ??
    addrs[0]
  )
}

function pickPrimaryTaxonomy(taxonomies: NpiRawResult['taxonomies']) {
  if (!taxonomies?.length) return undefined
  return taxonomies.find((t) => t.primary === true) ?? taxonomies[0]
}

/** Row for NPI autocomplete UI — correct NPI from {@link NpiProviderCard.npi} (not `basic.npi`, which CMS does not use). */
export interface AutocompleteDoctor {
  npi: string
  firstName: string
  lastName: string
  middleName?: string
  credential?: string
  city?: string
  state?: string
  country?: string
  contact?: string
  specialty?: string
  fullName: string
  gender?: string
  address?: string
  address2?: string
  postalCode?: string
  enumerationDate?: string
  lastUpdated?: string
  taxonomyCode?: string
  department: string
  /** Use with {@link import('../../lib/npiRegistryApi').npiCardToInternalRecord} when saving. */
  sourceCard: NpiProviderCard
}

export function providerCardToAutocompleteDoctor(card: NpiProviderCard): AutocompleteDoctor {
  const raw = card.raw
  const b = raw.basic ?? {}
  const addr = pickPracticeAddress(raw.addresses)
  const tax = pickPrimaryTaxonomy(raw.taxonomies)
  const isOrg = card.enumerationType === 'NPI-2'

  const firstName = isOrg ? (b.organization_name ?? '').trim() : (b.first_name ?? '').trim()
  const lastName = isOrg ? '' : (b.last_name ?? '').trim()
  const middleName = isOrg ? undefined : b.middle_name
  const fullName = isOrg
    ? (b.organization_name ?? card.displayName).trim()
    : [b.first_name, b.middle_name, b.last_name].filter(Boolean).join(' ').trim() || card.displayName

  return {
    npi: card.npi,
    firstName,
    lastName,
    middleName,
    credential: b.credential,
    city: addr?.city ?? card.city,
    state: addr?.state ?? card.state,
    country: addr?.country_code?.trim() || 'US',
    contact: addr?.telephone_number ?? card.phone,
    postalCode: addr?.postal_code ?? card.postalCode,
    address: addr?.address_1 ?? card.addressLine1,
    address2: addr?.address_2,
    specialty: tax?.desc ?? card.primaryTaxonomyDesc,
    taxonomyCode: tax?.code ?? card.primaryTaxonomyCode,
    fullName,
    gender: b.sex,
    enumerationDate: b.enumeration_date,
    lastUpdated: b.last_updated,
    department: taxonomyToDepartment(card.primaryTaxonomyDesc),
    sourceCard: card,
  }
}
