export function formatCurrency(value) {
  return new Intl.NumberFormat('fr-FR').format(value || 0) + ' FCFA';
}

export function statusLabel(status) {
  if (status === 'en_attente') return 'En attente';
  if (status === 'lave') return 'Lavé';
  if (status === 'livre') return 'Livré';
  return status;
}

export function paymentStatusLabel(status) {
  if (status === 'impaye') return 'Impayé';
  if (status === 'partiel') return 'Partiel';
  if (status === 'paye') return 'Payé';
  return status;
}
