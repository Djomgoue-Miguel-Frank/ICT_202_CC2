import { formatCurrency } from '../utils/format';

export default function DashboardCards({ stats }) {
  const cards = [
    {
      title: 'Commandes totales',
      value: stats?.totalOrders ?? 0,
      tint: 'tone-blue'
    },
    {
      title: 'En attente',
      value: stats?.waitingOrders ?? 0,
      tint: 'tone-orange'
    },
    {
      title: 'Lavées',
      value: stats?.washedOrders ?? 0,
      tint: 'tone-green'
    },
    {
      title: 'Livrées',
      value: stats?.deliveredOrders ?? 0,
      tint: 'tone-purple'
    }
  ];

  return (
    <section className="dashboard-grid">
      {cards.map((card) => (
        <article className={`dashboard-card ${card.tint}`} key={card.title}>
          <p className="label">{card.title}</p>
          <h3>{card.value}</h3>
        </article>
      ))}

      <article className="dashboard-card wide tone-dark">
        <p className="label">Chiffres financiers</p>
        <div className="finance-row">
          <span>Total facturé: {formatCurrency(stats?.totalAmount ?? 0)}</span>
          <span>Total payé: {formatCurrency(stats?.totalPaid ?? 0)}</span>
          <span>Reste: {formatCurrency(stats?.totalRemaining ?? 0)}</span>
        </div>
      </article>
    </section>
  );
}
