export default function StockPanel({ stock }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Stock en atelier</h2>
        <p>Pièces déposées et pas encore livrées</p>
      </div>

      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Type</th>
              <th className="text-end">Pièces en cours</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((row) => (
              <tr key={row.id}>
                <td>{row.category}</td>
                <td>{row.name}</td>
                <td className="text-end fw-semibold">{row.inShopPieces}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
