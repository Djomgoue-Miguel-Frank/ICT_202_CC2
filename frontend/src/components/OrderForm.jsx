import { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '../utils/format';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function OrderForm({ categories, onSubmit, submitting }) {
  const allTypes = useMemo(() => {
    return categories.flatMap((category) =>
      category.items.map((item) => ({
        ...item,
        categoryName: category.name
      }))
    );
  }, [categories]);

  const typeById = useMemo(() => {
    const map = new Map();
    for (const type of allTypes) {
      map.set(type.id, type);
    }
    return map;
  }, [allTypes]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [depositDate, setDepositDate] = useState(todayISO());
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [initialPayment, setInitialPayment] = useState('0');
  const [cartItems, setCartItems] = useState([]);
  const [quickQtyByType, setQuickQtyByType] = useState({});

  useEffect(() => {
    if (allTypes.length === 0) {
      return;
    }

    setQuickQtyByType((prev) => {
      if (Object.keys(prev).length > 0) {
        return prev;
      }
      const next = {};
      for (const type of allTypes) {
        next[type.id] = 1;
      }
      return next;
    });
  }, [allTypes]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const type = typeById.get(Number(item.garmentTypeId));
      const quantity = Number(item.quantity) || 0;
      return sum + (type ? type.unitPrice * quantity : 0);
    }, 0);
  }, [cartItems, typeById]);

  const totalPieces = useMemo(
    () => cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [cartItems]
  );

  const remaining = Math.max(totalAmount - (Number(initialPayment) || 0), 0);

  function setQuickQty(garmentTypeId, value) {
    const quantity = Math.max(1, Number(value) || 1);
    setQuickQtyByType((prev) => ({
      ...prev,
      [garmentTypeId]: quantity
    }));
  }

  function addToCart(garmentTypeId) {
    const typeId = Number(garmentTypeId);
    const quantity = Math.max(1, Number(quickQtyByType[typeId]) || 1);

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => Number(item.garmentTypeId) === typeId);
      if (existingIndex === -1) {
        return [...prev, { garmentTypeId: typeId, quantity }];
      }

      return prev.map((item, index) => {
        if (index !== existingIndex) {
          return item;
        }
        return { ...item, quantity: Number(item.quantity) + quantity };
      });
    });
  }

  function updateCartItem(index, quantityValue) {
    setCartItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          quantity: Math.max(1, Number(quantityValue) || 1)
        };
      })
    );
  }

  function removeFromCart(index) {
    setCartItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      customerName,
      customerPhone,
      depositDate,
      pickupDate,
      notes,
      initialPayment: Number(initialPayment) || 0,
      paymentMethod: 'cash',
      items: cartItems
        .filter((item) => Number(item.quantity) > 0)
        .map((item) => ({
          garmentTypeId: Number(item.garmentTypeId),
          quantity: Number(item.quantity)
        }))
    };

    const ok = await onSubmit(payload);
    if (!ok) {
      return;
    }

    setCustomerName('');
    setCustomerPhone('');
    setDepositDate(todayISO());
    setPickupDate(todayISO());
    setNotes('');
    setInitialPayment('0');
    setCartItems([]);
  }

  return (
    <section className="panel storefront-panel">
      <div className="panel-header">
        <h2>Nouveau dépôt</h2>
        <p>Interface boutique: choisissez les articles comme un panier e-commerce</p>
      </div>

      <form className="row g-3" onSubmit={handleSubmit}>
        <div className="col-md-3">
          <label className="form-label">Nom du client</label>
          <input
            className="form-control"
            type="text"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            required
          />
        </div>

        <div className="col-md-3">
          <label className="form-label">Téléphone</label>
          <input
            className="form-control"
            type="text"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            required
          />
        </div>

        <div className="col-md-3">
          <label className="form-label">Date de dépôt</label>
          <input
            className="form-control"
            type="date"
            value={depositDate}
            onChange={(event) => setDepositDate(event.target.value)}
            required
          />
        </div>

        <div className="col-md-3">
          <label className="form-label">Date de retrait</label>
          <input
            className="form-control"
            type="date"
            value={pickupDate}
            onChange={(event) => setPickupDate(event.target.value)}
            required
          />
        </div>

        <div className="col-12">
          <div className="storefront-grid">
            <div>
              {categories.map((category) => (
                <div className="category-block" key={category.id}>
                  <div className="category-head">
                    <h3>{category.name}</h3>
                    <p>{category.description}</p>
                  </div>

                  <div className="product-grid">
                    {category.items.map((typeOption) => (
                      <article className="product-card" key={typeOption.id}>
                        <p className="product-name">{typeOption.name}</p>
                        <p className="product-price">{formatCurrency(typeOption.unitPrice)}</p>
                        <div className="product-actions">
                          <input
                            className="form-control"
                            type="number"
                            min="1"
                            value={quickQtyByType[typeOption.id] ?? 1}
                            onChange={(event) => setQuickQty(typeOption.id, event.target.value)}
                          />
                          <button
                            className="btn btn-outline-primary"
                            type="button"
                            onClick={() => addToCart(typeOption.id)}
                          >
                            Ajouter
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <aside className="cart-box">
              <h3>Panier du client</h3>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Qté</th>
                      <th className="text-end">Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item, index) => {
                      const type = typeById.get(Number(item.garmentTypeId));
                      if (!type) {
                        return null;
                      }

                      return (
                        <tr key={`${item.garmentTypeId}-${index}`}>
                          <td>
                            <div className="fw-semibold">{type.name}</div>
                            <div className="small text-muted">{type.categoryName}</div>
                          </td>
                          <td>
                            <input
                              className="form-control form-control-sm"
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(event) => updateCartItem(index, event.target.value)}
                            />
                          </td>
                          <td className="text-end fw-semibold">
                            {formatCurrency(type.unitPrice * Number(item.quantity || 0))}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              type="button"
                              onClick={() => removeFromCart(index)}
                            >
                              X
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {cartItems.length === 0 && (
                <p className="small text-muted mb-0">Panier vide. Ajoutez des pièces depuis le catalogue.</p>
              )}
            </aside>
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label">Paiement initial</label>
          <input
            className="form-control"
            type="number"
            min="0"
            value={initialPayment}
            onChange={(event) => setInitialPayment(event.target.value)}
          />
        </div>

        <div className="col-md-8">
          <label className="form-label">Notes</label>
          <input
            className="form-control"
            type="text"
            placeholder="Ex: taches à traiter, urgence, etc."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <div className="col-12 bill-preview">
          <span>Pièces: {totalPieces}</span>
          <span>Total: {formatCurrency(totalAmount)}</span>
          <span>Reste: {formatCurrency(remaining)}</span>
        </div>

        <div className="col-12 d-grid d-md-flex justify-content-md-end">
          <button className="btn btn-primary px-4" type="submit" disabled={submitting || cartItems.length === 0}>
            {submitting ? 'Enregistrement...' : 'Enregistrer le dépôt'}
          </button>
        </div>
      </form>
    </section>
  );
}
