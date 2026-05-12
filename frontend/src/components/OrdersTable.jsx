import { formatCurrency, paymentStatusLabel, statusLabel } from '../utils/format';

function paymentBadgeClass(status) {
  if (status === 'paye') return 'text-bg-success';
  if (status === 'partiel') return 'text-bg-warning';
  return 'text-bg-danger';
}

function statusBadgeClass(status) {
  if (status === 'livre') return 'text-bg-success';
  if (status === 'lave') return 'text-bg-info';
  return 'text-bg-secondary';
}

export default function OrdersTable({
  orders,
  onStatusChange,
  onAddPayment,
  paymentInputs,
  onPaymentInputChange,
  updatingOrderId
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Commandes</h2>
        <p>Suivi du lavage, livraison et paiements</p>
      </div>

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>#</th>
              <th>Client</th>
              <th>Dates</th>
              <th>Statut lavage</th>
              <th>Paiement</th>
              <th className="text-end">Total</th>
              <th className="text-end">Payé</th>
              <th className="text-end">Reste</th>
              <th>Action paiement</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <div className="small fw-semibold">#{order.id}</div>
                  <div className="small text-muted">{order.totalPieces} pièces</div>
                </td>

                <td>
                  <div className="fw-semibold">{order.customerName}</div>
                  <div className="small text-muted">{order.customerPhone}</div>
                </td>

                <td>
                  <div className="small">Dépôt: {order.depositDate}</div>
                  <div className="small">Retrait: {order.pickupDate}</div>
                </td>

                <td>
                  <span className={`badge ${statusBadgeClass(order.status)}`}>{statusLabel(order.status)}</span>
                  <select
                    className="form-select form-select-sm mt-2"
                    value={order.status}
                    onChange={(event) => onStatusChange(order.id, event.target.value)}
                    disabled={updatingOrderId === order.id}
                  >
                    <option value="en_attente">En attente</option>
                    <option value="lave">Lavé</option>
                    <option value="livre">Livré</option>
                  </select>
                </td>

                <td>
                  <span className={`badge ${paymentBadgeClass(order.paymentStatus)}`}>
                    {paymentStatusLabel(order.paymentStatus)}
                  </span>
                </td>

                <td className="text-end">{formatCurrency(order.totalAmount)}</td>
                <td className="text-end">{formatCurrency(order.paidAmount)}</td>
                <td className="text-end fw-semibold">{formatCurrency(order.remainingAmount)}</td>

                <td>
                  <div className="d-flex gap-2">
                    <input
                      className="form-control form-control-sm"
                      type="number"
                      min="0"
                      placeholder="Montant"
                      value={paymentInputs[order.id] ?? ''}
                      onChange={(event) => onPaymentInputChange(order.id, event.target.value)}
                    />
                    <button
                      className="btn btn-sm btn-outline-success"
                      type="button"
                      onClick={() => onAddPayment(order.id)}
                      disabled={updatingOrderId === order.id}
                    >
                      Ajouter
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length === 0 && (
        <p className="mb-0 text-muted">Aucune commande pour le moment.</p>
      )}
    </section>
  );
}
