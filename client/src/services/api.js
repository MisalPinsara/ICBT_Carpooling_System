const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

export const api = {
  async request(path, options = {}) {
    const token = localStorage.getItem("icbtToken");
    const response = await fetch(apiUrl(path), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || "Request failed.");
      error.details = data.errors || {};
      throw error;
    }
    return data;
  },
  login(payload) {
    return this.request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
  },
  register(payload) {
    return this.request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
  },
  me() {
    return this.request("/api/me");
  },
  dashboard() {
    return this.request("/api/dashboard");
  },
  updateProfile(payload) {
    return this.request("/api/profile", { method: "PUT", body: JSON.stringify(payload) });
  },
  createRide(payload) {
    return this.request("/api/ride-offers", { method: "POST", body: JSON.stringify(payload) });
  },
  rideOffer(id) {
    return this.request(`/api/ride-offers/${id}`);
  },
  activeRideOffers() {
    return this.request("/api/ride-offers/active");
  },
  rideDraft() {
    return this.request("/api/ride-offers/draft");
  },
  // ── Sprint 2 ────────────────────────────────────────────────────────────────
  searchRides(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v && v.trim()))
    ).toString();
    return this.request(`/api/ride-offers/search${qs ? `?${qs}` : ""}`);
  },
  publicRideOffer(id) {
    return this.request(`/api/ride-offers/public/${id}`);
  },
  joinRequest(rideOfferId, requestNote = "") {
    return this.request("/api/join-requests", {
      method: "POST",
      body: JSON.stringify({ rideOfferId, requestNote })
    });
  },
  myJoinRequests() {
    return this.request("/api/join-requests/mine");
  },
  getJoinRequest(id) {
    return this.request(`/api/join-requests/${id}`);
  },
  // ── Sprint 3 ────────────────────────────────────────────────────────────────
  receivedJoinRequests() {
    return this.request("/api/join-requests/received");
  },
  acceptedPassengers(rideOfferId) {
    return this.request(`/api/ride-offers/${rideOfferId}/accepted-passengers`);
  },
  decideJoinRequest(requestId, status, decisionNote = "") {
    return this.request(`/api/join-requests/${requestId}/decision`, {
      method: "PATCH",
      body: JSON.stringify({ status, decisionNote })
    });
  },
  cancelJoinRequest(requestId, reason = "") {
    return this.request(`/api/join-requests/${requestId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  },
  // ── Sprint 4 ────────────────────────────────────────────────────────────────
  changePassword(payload) {
    return this.request("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateRideOffer(id, payload) {
    return this.request(`/api/ride-offers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  cancelRideOffer(id) {
    return this.request(`/api/ride-offers/${id}/cancel`, {
      method: "POST"
    });
  },
  leaveRide(requestId) {
    return this.request(`/api/join-requests/${requestId}/leave`, {
      method: "POST"
    });
  },
  sendMessage(payload) {
    return this.request("/api/messages", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getMessages(rideOfferId, withUserId = "") {
    const qs = new URLSearchParams({
      rideOfferId,
      ...(withUserId ? { withUserId } : {})
    }).toString();
    return this.request(`/api/messages?${qs}`);
  },
  getConversations() {
    return this.request("/api/messages/conversations");
  },
  getJourneys() {
    return this.request("/api/journeys");
  }
};


