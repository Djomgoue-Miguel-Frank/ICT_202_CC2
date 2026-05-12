import { formatCurrency } from '../utils/format';

export default function PricingTable({ categories }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Tarifs par catégorie</h2>
        <p>Référence rapide des prix unitaires</p>
      </div>

      {categories.map((category) => (
        <div className="mb-3" key={category.id}>
          <h3 className="category-title">{category.name}</h3>
          <p className="category-desc">{category.description}</p>
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Type</th>
                  <th className="text-end">Prix unitaire</th>
                </tr>
              </thead>
              <tbody>
                {category.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td className="text-end fw-semibold">{formatCurrency(item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
