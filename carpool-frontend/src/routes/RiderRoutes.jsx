import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../components/Common/ProtectedRoute";
import RiderNavbar from "../components/Navbar/RiderNavbar";

import RiderDashboard from "../pages/rider/RiderDashboard";
import RiderDashboardNew from "../pages/rider/RiderDashboardNew";
import RiderHome from "../pages/rider/RiderHome";
import RiderActiveRide from "../pages/rider/RiderActiveRide";
import RiderRideDetails from "../pages/rider/RiderRideDetails";
import RiderRides from "../pages/rider/RiderRides";
import RiderPayments from "../pages/rider/RiderPayments";
import RiderProfile from "../pages/rider/RiderProfile";
import RideCompletionPayment from "../pages/rider/RideCompletionPayment";

export default function RiderRoutes() {
  return (
    <ProtectedRoute role="RIDER">
      {/* Using new dashboard directly, removing navbar */}

      <Routes>
        <Route index element={<RiderDashboardNew />} />
        <Route path="dashboard" element={<RiderDashboardNew />} />
        <Route path="request" element={<RiderHome />} />
        <Route path="active-ride" element={<RiderActiveRide />} />
        <Route path="rides" element={<RiderRides />} />
        <Route path="rides/:rideId" element={<RiderRideDetails />} />
        <Route path="payment/:rideId" element={<RideCompletionPayment />} />
        <Route path="payments" element={<RiderPayments />} />
        <Route path="profile" element={<RiderProfile />} />

        <Route path="*" element={<Navigate to="/rider" />} />
      </Routes>
    </ProtectedRoute>
  );
}
