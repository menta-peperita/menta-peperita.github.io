export const STATI = {
  lavorazione: { label: 'In lavorazione', cls: 'warn' },
  pronto: { label: 'Pronto', cls: 'ok' },
  consegnato: { label: 'Consegnato', cls: '' },
  annullato: { label: 'Annullato', cls: 'off' }
}
export const PAGAMENTI = {
  pagato: { label: 'Pagato', cls: 'ok' },
  acconto: { label: 'Acconto', cls: 'warn' },
  da_incassare: { label: 'Da incassare', cls: 'off' },
  da_definire: { label: 'Prezzo da definire', cls: '' }
}
export const CANALI = ['Passaparola', 'Instagram', 'Amici', 'Mercatino', 'Altro']
export const METODI = [
  { value: 'contanti', label: 'Contanti' }, { value: 'satispay', label: 'Satispay' },
  { value: 'bonifico', label: 'Bonifico' }, { value: 'carta', label: 'Carta' }, { value: 'paypal', label: 'PayPal' }
]
