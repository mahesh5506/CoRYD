import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// User Service APIs
export const userAPI = {
  register: (data) => api.post("/users/register", data),
  login: (data) => api.post("/users/login", data),
  getUserById: (userId) => api.get(`/users/${userId}`),
};

// Ride Service APIs
export const rideAPI = {
  // Driver endpoints
  createRide: (data) => api.post("/rides/create", data),
  getRideById: (rideId) => api.get(`/rides/${rideId}`),
  updateRideStatus: (rideId, status) =>
    api.put(`/rides/${rideId}/status`, null, { params: { status } }),
  getActiveRides: () => api.get("/rides/active"),
  getRidesByDriver: (driverId) => api.get(`/rides/driver/${driverId}`),
  // CRITICAL: Add cache-busting timestamp to ensure fresh data across multiple clients
  getAvailableRides: (riderId) => 
    api.get("/rides/available", { 
      params: { 
        riderId,
        // Cache buster: force fresh data on every request
        _t: Date.now()
      },
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    }),
  getRidePassengers: (rideId) => api.get(`/rides/${rideId}/passengers`),
  getCurrentPassengers: (rideId) =>
    api.get(`/rides/${rideId}/current-passengers`),

  // Rider endpoints
  createRideRequest: (data) => api.post("/rides/request", data),
  getPendingRequests: (rideId) => api.get(`/rides/${rideId}/requests`),
  getRiderRequests: (riderId) => api.get(`/rides/request/rider/${riderId}`),
  getRiderActiveRequests: (riderId) => api.get(`/rides/request/rider/${riderId}/active`),
  getRideHistory: (riderId) => api.get(`/rides/rider/history/${riderId}`),
  acceptRequest: (requestId, activeRideId) => api.post(`/rides/request/${requestId}/accept` + (activeRideId ? `?activeRideId=${activeRideId}` : '')),
  rejectRequest: (requestId) => api.post(`/rides/request/${requestId}/reject`),

  // Passenger management
  addPassenger: (rideId, data) =>
    api.post(`/rides/${rideId}/add-passenger`, data),
  boardPassenger: (passengerId) =>
    api.put(`/rides/passenger/${passengerId}/board`),
  dropPassenger: (passengerId) =>
    api.put(`/rides/passenger/${passengerId}/drop`),
  getPassengerById: (passengerId) => api.get(`/rides/passenger/${passengerId}`),
};

// Notification Service APIs
export const notificationAPI = {
  getUnreadNotifications: (userId) =>
    api.get(`/notifications/user/${userId}/unread`),
  markAsRead: (notificationId) =>
    api.put(`/notifications/${notificationId}/read`),
};

// Matching Service APIs
export const matchAPI = {
  getDriverMatches: (driverId) => api.get(`/matching/driver/${driverId}`),
  acceptMatch: (matchId) => api.put(`/matching/${matchId}/accept`),
};

// Payment Service APIs
export const paymentAPI = {
  submitRating: (data) => api.post("/payments/rating", data),
  getUserRating: (userId) => api.get(`/payments/rating/${userId}`),
  processPayment: (data) => api.post("/payments/process", data),
  getPaymentStatus: (paymentId) => api.get(`/payments/${paymentId}`),
  getPaymentsForUser: (userId) => api.get(`/payments/user/${userId}`),
  getPaymentsForDriver: (driverId) => api.get(`/payments/driver/${driverId}`),
  createPaymentOrder: (data) => api.post("/payments/order", data),
  verifyPayment: (data) => api.post("/payments/verify", data),
};

// Additional Ride APIs
export const additionalRideAPI = {
  getAvailableRides: () => api.get("/rides/available"),
  getActiveRides: (driverId) => api.get(`/rides/driver/${driverId}`),
  getRidePassengers: (rideId) => api.get(`/rides/${rideId}/passengers`),
  boardPassenger: (passengerId) =>
    api.put(`/rides/passenger/${passengerId}/board`),
  dropPassenger: (passengerId) =>
    api.put(`/rides/passenger/${passengerId}/drop`),
};

// User Service APIs (additional)
export const additionalUserAPI = {
  getUser: (id) => api.get(`/users/${id}`),
};

export default api;
