const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Erreur API');
  }

  return data;
}

export function fetchPricing() {
  return request('/pricing');
}

export function fetchProfile() {
  return request('/profile');
}

export function fetchOrders() {
  return request('/orders');
}

export function fetchDashboard() {
  return request('/dashboard');
}

export function createOrder(payload) {
  return request('/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateOrderStatus(orderId, status) {
  return request(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export function addOrderPayment(orderId, amount) {
  return request(`/orders/${orderId}/payments`, {
    method: 'POST',
    body: JSON.stringify({ amount, paymentMethod: 'cash' })
  });
}
