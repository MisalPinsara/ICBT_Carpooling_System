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
  }
};

