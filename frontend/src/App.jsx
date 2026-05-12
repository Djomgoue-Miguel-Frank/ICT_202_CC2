import { useEffect, useState } from 'react';
import {
  addOrderPayment,
  createOrder,
  fetchDashboard,
  fetchOrders,
  fetchProfile,
  fetchPricing,
  updateOrderStatus
} from './api';
import DashboardCards from './components/DashboardCards';
import OrderForm from './components/OrderForm';
import OrdersTable from './components/OrdersTable';
import PricingTable from './components/PricingTable';
import StockPanel from './components/StockPanel';

export default function App() {
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);
  const [stats, setStats] = useState(null);

  const [paymentInputs, setPaymentInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [message, setMessage] = useState(null);

  async function loadInitialData() {
    setLoading(true);
    setMessage(null);

    try {
      const [profileData, pricingData, ordersData, dashboardData] = await Promise.all([
        fetchProfile(),
        fetchPricing(),
        fetchOrders(),
        fetchDashboard()
      ]);

      setProfile(profileData.profile || null);
      setCategories(pricingData.categories || []);
      setOrders(ordersData.orders || []);
      setStats(dashboardData.stats || null);
      setStock(dashboardData.stock || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function refreshOrdersAndDashboard() {
    const [ordersData, dashboardData] = await Promise.all([fetchOrders(), fetchDashboard()]);
    setOrders(ordersData.orders || []);
    setStats(dashboardData.stats || null);
    setStock(dashboardData.stock || []);
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  async function handleCreateOrder(payload) {
    setSubmitting(true);
    setMessage(null);

    try {
      await createOrder(payload);
      await refreshOrdersAndDashboard();
      setMessage({ type: 'success', text: 'Dépôt enregistré avec succès.' });
      return true;
    } catch (error) {
      setMessage({ type: 'danger', text: error.message });
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(orderId, status) {
    setUpdatingOrderId(orderId);
    setMessage(null);

    try {
      await updateOrderStatus(orderId, status);
      await refreshOrdersAndDashboard();
      setMessage({ type: 'success', text: `Statut de la commande #${orderId} mis à jour.` });
    } catch (error) {
      setMessage({ type: 'danger', text: error.message });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleAddPayment(orderId) {
    const rawAmount = paymentInputs[orderId];
    const amount = Number(rawAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ type: 'danger', text: 'Saisissez un montant valide pour le paiement.' });
      return;
    }

    setUpdatingOrderId(orderId);
    setMessage(null);

    try {
      await addOrderPayment(orderId, amount);
      setPaymentInputs((prev) => ({ ...prev, [orderId]: '' }));
      await refreshOrdersAndDashboard();
      setMessage({ type: 'success', text: `Paiement ajouté sur la commande #${orderId}.` });
    } catch (error) {
      setMessage({ type: 'danger', text: error.message });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function handlePaymentInputChange(orderId, value) {
    setPaymentInputs((prev) => ({
      ...prev,
      [orderId]: value
    }));
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="kicker">{profile?.shopName || 'Pressing Flow'}</p>
        <h1>Gestion de pressing: dépôt, lavage, livraison et paiement</h1>
        <p className="hero-subtitle">
          {profile?.tagline ||
            'Application simple pour enregistrer les habits, calculer les tarifs automatiquement, suivre le stock en atelier et vérifier les paiements.'}
        </p>
        <div className="owner-bar">
          <span className="owner-title">Propriétaires:</span>
          {(profile?.owners || []).map((owner) => (
            <span className="owner-chip" key={owner}>
              {owner}
            </span>
          ))}
          {profile?.phone && <span className="owner-chip">{profile.phone}</span>}
          {profile?.address && <span className="owner-chip">{profile.address}</span>}
        </div>
      </header>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {loading ? (
        <div className="panel">
          <p className="mb-0">Chargement des données...</p>
        </div>
      ) : (
        <>
          <DashboardCards stats={stats} />

          <div className="content-grid">
            <OrderForm categories={categories} onSubmit={handleCreateOrder} submitting={submitting} />
            <PricingTable categories={categories} />
          </div>

          <OrdersTable
            orders={orders}
            onStatusChange={handleStatusChange}
            onAddPayment={handleAddPayment}
            paymentInputs={paymentInputs}
            onPaymentInputChange={handlePaymentInputChange}
            updatingOrderId={updatingOrderId}
          />

          <StockPanel stock={stock} />
        </>
      )}
    </div>
  );
}
