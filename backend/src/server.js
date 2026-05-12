const express = require('express');
const cors = require('cors');
const { db, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

initDb();

app.use(cors());
app.use(express.json());

function computePaymentStatus(totalAmount, paidAmount) {
  if (paidAmount <= 0) {
    return 'impaye';
  }
  if (paidAmount >= totalAmount) {
    return 'paye';
  }
  return 'partiel';
}

function getOrderById(orderId) {
  const order = db
    .prepare(
      `
      SELECT
        o.id,
        o.deposit_date AS depositDate,
        o.pickup_date AS pickupDate,
        o.status,
        o.total_amount AS totalAmount,
        o.paid_amount AS paidAmount,
        o.payment_status AS paymentStatus,
        o.notes,
        o.created_at AS createdAt,
        c.id AS customerId,
        c.full_name AS customerName,
        c.phone AS customerPhone
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
      `
    )
    .get(orderId);

  if (!order) {
    return null;
  }

  const items = db
    .prepare(
      `
      SELECT
        oi.id,
        oi.quantity,
        oi.unit_price AS unitPrice,
        oi.line_total AS lineTotal,
        gt.id AS garmentTypeId,
        gt.name AS garmentType,
        gc.name AS categoryName
      FROM order_items oi
      JOIN garment_types gt ON gt.id = oi.garment_type_id
      JOIN garment_categories gc ON gc.id = gt.category_id
      WHERE oi.order_id = ?
      ORDER BY gc.name, gt.name
      `
    )
    .all(orderId);

  const payments = db
    .prepare(
      `
      SELECT
        id,
        amount,
        payment_method AS paymentMethod,
        paid_at AS paidAt,
        note
      FROM payments
      WHERE order_id = ?
      ORDER BY paid_at DESC
      `
    )
    .all(orderId);

  return {
    ...order,
    remainingAmount: Math.max(order.totalAmount - order.paidAmount, 0),
    items,
    payments
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'API pressing active' });
});

app.get('/api/profile', (_req, res) => {
  const row = db
    .prepare(
      `
      SELECT
        shop_name AS shopName,
        tagline,
        owners_json AS ownersJson,
        phone,
        address
      FROM business_profile
      WHERE id = 1
      `
    )
    .get();

  if (!row) {
    return res.status(404).json({ message: 'Profil de boutique introuvable.' });
  }

  let owners = [];
  try {
    owners = JSON.parse(row.ownersJson);
  } catch {
    owners = [];
  }

  return res.json({
    profile: {
      shopName: row.shopName,
      tagline: row.tagline,
      owners: Array.isArray(owners) ? owners : [],
      phone: row.phone,
      address: row.address
    }
  });
});

app.get('/api/pricing', (_req, res) => {
  const rows = db
    .prepare(
      `
      SELECT
        gc.id AS categoryId,
        gc.name AS categoryName,
        gc.description AS categoryDescription,
        gt.id AS garmentTypeId,
        gt.name AS garmentType,
        gt.unit_price AS unitPrice
      FROM garment_types gt
      JOIN garment_categories gc ON gc.id = gt.category_id
      ORDER BY gc.name, gt.name
      `
    )
    .all();

  const categories = [];
  const byCategoryId = new Map();

  for (const row of rows) {
    if (!byCategoryId.has(row.categoryId)) {
      const category = {
        id: row.categoryId,
        name: row.categoryName,
        description: row.categoryDescription,
        items: []
      };
      byCategoryId.set(row.categoryId, category);
      categories.push(category);
    }

    byCategoryId.get(row.categoryId).items.push({
      id: row.garmentTypeId,
      name: row.garmentType,
      unitPrice: row.unitPrice
    });
  }

  res.json({ categories });
});

app.get('/api/dashboard', (_req, res) => {
  const stats = db
    .prepare(
      `
      SELECT
        COUNT(*) AS totalOrders,
        COALESCE(SUM(total_amount), 0) AS totalAmount,
        COALESCE(SUM(paid_amount), 0) AS totalPaid,
        COALESCE(SUM(total_amount - paid_amount), 0) AS totalRemaining,
        SUM(CASE WHEN status = 'en_attente' THEN 1 ELSE 0 END) AS waitingOrders,
        SUM(CASE WHEN status = 'lave' THEN 1 ELSE 0 END) AS washedOrders,
        SUM(CASE WHEN status = 'livre' THEN 1 ELSE 0 END) AS deliveredOrders
      FROM orders
      `
    )
    .get();

  const stock = db
    .prepare(
      `
      SELECT
        gt.id,
        gt.name,
        gc.name AS category,
        COALESCE(
          SUM(
            CASE
              WHEN o.status IS NULL OR o.status != 'livre' THEN oi.quantity
              ELSE 0
            END
          ),
          0
        ) AS inShopPieces
      FROM garment_types gt
      JOIN garment_categories gc ON gc.id = gt.category_id
      LEFT JOIN order_items oi ON oi.garment_type_id = gt.id
      LEFT JOIN orders o ON o.id = oi.order_id
      GROUP BY gt.id
      ORDER BY gc.name, gt.name
      `
    )
    .all();

  res.json({ stats, stock });
});

app.get('/api/orders', (req, res) => {
  const status = req.query.status;
  const paymentStatus = req.query.paymentStatus;

  const whereParts = [];
  const params = [];

  if (status) {
    whereParts.push('o.status = ?');
    params.push(status);
  }

  if (paymentStatus) {
    whereParts.push('o.payment_status = ?');
    params.push(paymentStatus);
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  const orders = db
    .prepare(
      `
      SELECT
        o.id,
        c.full_name AS customerName,
        c.phone AS customerPhone,
        o.deposit_date AS depositDate,
        o.pickup_date AS pickupDate,
        o.status,
        o.total_amount AS totalAmount,
        o.paid_amount AS paidAmount,
        o.payment_status AS paymentStatus,
        o.notes,
        o.created_at AS createdAt,
        COALESCE(SUM(oi.quantity), 0) AS totalPieces
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      ${whereSql}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      `
    )
    .all(...params)
    .map((order) => ({
      ...order,
      remainingAmount: Math.max(order.totalAmount - order.paidAmount, 0)
    }));

  res.json({ orders });
});

app.get('/api/orders/:id', (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ message: 'Identifiant de commande invalide.' });
  }

  const order = getOrderById(orderId);
  if (!order) {
    return res.status(404).json({ message: 'Commande introuvable.' });
  }

  return res.json({ order });
});

app.post('/api/orders', (req, res) => {
  const { customerName, customerPhone, depositDate, pickupDate, notes, items, initialPayment, paymentMethod } = req.body;

  if (!customerName || !String(customerName).trim()) {
    return res.status(400).json({ message: 'Le nom du client est obligatoire.' });
  }

  if (!customerPhone || !String(customerPhone).trim()) {
    return res.status(400).json({ message: 'Le telephone du client est obligatoire.' });
  }

  if (!pickupDate || !String(pickupDate).trim()) {
    return res.status(400).json({ message: 'La date de retrait est obligatoire.' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const cleanDepositDate = depositDate && String(depositDate).trim()
    ? String(depositDate).trim()
    : new Date().toISOString().slice(0, 10);
  const cleanPickupDate = String(pickupDate).trim();

  if (!dateRegex.test(cleanDepositDate) || !dateRegex.test(cleanPickupDate)) {
    return res.status(400).json({ message: 'Format de date invalide. Utilisez AAAA-MM-JJ.' });
  }

  if (cleanPickupDate < cleanDepositDate) {
    return res.status(400).json({ message: 'La date de retrait doit être après la date de dépôt.' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Ajoutez au moins un type de vetement.' });
  }

  const cleanItems = [];
  for (const rawItem of items) {
    const garmentTypeId = Number(rawItem.garmentTypeId);
    const quantity = Number(rawItem.quantity);

    if (!Number.isInteger(garmentTypeId) || garmentTypeId <= 0) {
      return res.status(400).json({ message: 'Type de vetement invalide.' });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Quantite invalide.' });
    }

    cleanItems.push({ garmentTypeId, quantity });
  }

  const parsedInitialPayment = initialPayment === undefined || initialPayment === null || initialPayment === ''
    ? 0
    : Number(initialPayment);

  if (!Number.isFinite(parsedInitialPayment) || parsedInitialPayment < 0) {
    return res.status(400).json({ message: 'Montant initial invalide.' });
  }

  const insertCustomer = db.prepare(
    'INSERT INTO customers (full_name, phone) VALUES (?, ?)'
  );
  const findCustomerByPhone = db.prepare(
    'SELECT id FROM customers WHERE phone = ?'
  );
  const updateCustomer = db.prepare(
    'UPDATE customers SET full_name = ? WHERE id = ?'
  );

  const findType = db.prepare(
    'SELECT id, unit_price AS unitPrice FROM garment_types WHERE id = ?'
  );

  const insertOrder = db.prepare(
    `
    INSERT INTO orders (
      customer_id,
      deposit_date,
      pickup_date,
      status,
      total_amount,
      paid_amount,
      payment_status,
      notes
    ) VALUES (?, ?, ?, 'en_attente', ?, ?, ?, ?)
    `
  );

  const insertItem = db.prepare(
    `
    INSERT INTO order_items (
      order_id,
      garment_type_id,
      quantity,
      unit_price,
      line_total
    ) VALUES (?, ?, ?, ?, ?)
    `
  );

  const insertPayment = db.prepare(
    `
    INSERT INTO payments (
      order_id,
      amount,
      payment_method,
      paid_at,
      note
    ) VALUES (?, ?, ?, ?, ?)
    `
  );

  try {
    const orderId = db.transaction(() => {
      let customerId;
      const existingCustomer = findCustomerByPhone.get(String(customerPhone).trim());

      if (existingCustomer) {
        customerId = existingCustomer.id;
        updateCustomer.run(String(customerName).trim(), customerId);
      } else {
        customerId = insertCustomer.run(String(customerName).trim(), String(customerPhone).trim()).lastInsertRowid;
      }

      let totalAmount = 0;
      const resolvedItems = [];

      for (const item of cleanItems) {
        const type = findType.get(item.garmentTypeId);
        if (!type) {
          throw new Error(`Type de vetement introuvable: ${item.garmentTypeId}`);
        }

        const lineTotal = type.unitPrice * item.quantity;
        totalAmount += lineTotal;
        resolvedItems.push({
          garmentTypeId: item.garmentTypeId,
          quantity: item.quantity,
          unitPrice: type.unitPrice,
          lineTotal
        });
      }

      const paidAmount = Math.round(parsedInitialPayment);
      const paymentStatus = computePaymentStatus(totalAmount, paidAmount);

      const orderResult = insertOrder.run(
        customerId,
        cleanDepositDate,
        cleanPickupDate,
        totalAmount,
        paidAmount,
        paymentStatus,
        notes ? String(notes).trim() : null
      );

      const newOrderId = orderResult.lastInsertRowid;

      for (const item of resolvedItems) {
        insertItem.run(
          newOrderId,
          item.garmentTypeId,
          item.quantity,
          item.unitPrice,
          item.lineTotal
        );
      }

      if (paidAmount > 0) {
        insertPayment.run(
          newOrderId,
          paidAmount,
          paymentMethod ? String(paymentMethod).trim() : 'cash',
          new Date().toISOString(),
          'Paiement initial'
        );
      }

      return newOrderId;
    })();

    const order = getOrderById(orderId);
    return res.status(201).json({ message: 'Commande creee avec succes.', order });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Creation impossible.' });
  }
});

app.patch('/api/orders/:id/status', (req, res) => {
  const orderId = Number(req.params.id);
  const { status } = req.body;

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ message: 'Identifiant de commande invalide.' });
  }

  const allowed = new Set(['en_attente', 'lave', 'livre']);
  if (!allowed.has(status)) {
    return res.status(400).json({ message: 'Statut invalide.' });
  }

  const result = db
    .prepare('UPDATE orders SET status = ? WHERE id = ?')
    .run(status, orderId);

  if (result.changes === 0) {
    return res.status(404).json({ message: 'Commande introuvable.' });
  }

  const order = getOrderById(orderId);
  return res.json({ message: 'Statut mis a jour.', order });
});

app.post('/api/orders/:id/payments', (req, res) => {
  const orderId = Number(req.params.id);
  const { amount, paymentMethod, note } = req.body;

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ message: 'Identifiant de commande invalide.' });
  }

  const paymentAmount = Number(amount);
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ message: 'Montant de paiement invalide.' });
  }

  const order = db
    .prepare('SELECT id, total_amount AS totalAmount, paid_amount AS paidAmount FROM orders WHERE id = ?')
    .get(orderId);

  if (!order) {
    return res.status(404).json({ message: 'Commande introuvable.' });
  }

  const roundedPaymentAmount = Math.round(paymentAmount);

  db.transaction(() => {
    db.prepare(
      `
      INSERT INTO payments (order_id, amount, payment_method, paid_at, note)
      VALUES (?, ?, ?, ?, ?)
      `
    ).run(
      orderId,
      roundedPaymentAmount,
      paymentMethod ? String(paymentMethod).trim() : 'cash',
      new Date().toISOString(),
      note ? String(note).trim() : null
    );

    const newPaidAmount = order.paidAmount + roundedPaymentAmount;
    const newPaymentStatus = computePaymentStatus(order.totalAmount, newPaidAmount);

    db.prepare(
      `
      UPDATE orders
      SET paid_amount = ?, payment_status = ?
      WHERE id = ?
      `
    ).run(newPaidAmount, newPaymentStatus, orderId);
  })();

  const updatedOrder = getOrderById(orderId);
  return res.status(201).json({ message: 'Paiement enregistre.', order: updatedOrder });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Pressing API demarree sur http://localhost:${PORT}`);
});
