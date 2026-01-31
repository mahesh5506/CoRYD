import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { rideAPI, notificationAPI, paymentAPI } from "../../api/axiosAPI";
import LocationPicker from "../../components/Common/LocationPicker";
import PassengerCard from "../../components/Ride/PassengerCard";
import NotificationList from "../../components/Notifications/NotificationList";
import IncomingRideRequest from "../../components/Ride/IncomingRideRequest";
import ActiveDriverRideCard from "../../components/Ride/ActiveDriverRideCard";
import { initiatePayment, convertToPaise } from "../../utils/razorpayUtils";
import {
  LogOut,
  Bell,
  Plus,
  Play,
  CheckCircle,
  Users,
  Sofa,
  TrendingUp,
} from "lucide-react";
import { RIDE_STATUS, PASSENGER_STATUS } from "../../utils/constants";

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropLocation, setDropLocation] = useState(null);
  const [route, setRoute] = useState("");
  const [totalSeats, setTotalSeats] = useState(4);
  const [currentRide, setCurrentRide] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [processingPayment, setProcessingPayment] = useState(null);

  // Polling for updates
  useEffect(() => {
    if (currentRide) {
      const interval = setInterval(() => {
        fetchRideDetails();
        fetchPassengers();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentRide]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await notificationAPI.getUnreadNotifications(user.id);
        const notifs = res.data || [];
        setNotifications(notifs);
        setUnreadCount(notifs.length);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [user.id]);

  // Fetch driver earnings
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await paymentAPI.getPaymentsForDriver(user.id);
        const payments = res.data || [];
        const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        setEarnings(total);
      } catch (err) {
        console.error("Error fetching earnings:", err);
      }
    };

    fetchEarnings();
    const interval = setInterval(fetchEarnings, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [user.id]);

  const fetchRideDetails = async () => {
    if (!currentRide?.id) return;
    try {
      const res = await rideAPI.getRideById(currentRide.id);
      setCurrentRide(res.data.ride);
    } catch (err) {
      console.error("Error fetching ride:", err);
    }
  };

  const fetchPassengers = async () => {
    if (!currentRide?.id) return;
    try {
      const res = await rideAPI.getRidePassengers(currentRide.id);
      setPassengers(res.data.allPassengers || []);
    } catch (err) {
      console.error("Error fetching passengers:", err);
    }
  };

  const handleCreateRide = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (!pickupLocation || !dropLocation) {
        setError("Please select pickup and drop locations");
        setLoading(false);
        return;
      }

      const rideData = {
        driverId: user.id,
        pickupLocation: pickupLocation.name,
        pickupLatitude: pickupLocation.lat,
        pickupLongitude: pickupLocation.lng,
        dropLocation: dropLocation.name,
        dropLatitude: dropLocation.lat,
        dropLongitude: dropLocation.lng,
        route: route || `${pickupLocation.name} → ${dropLocation.name}`,
        totalSeats: totalSeats,
      };

      const res = await rideAPI.createRide(rideData);
      const ride = res.data;

      setCurrentRide(ride);
      
      // Immediately fetch passengers after ride creation
      try {
        const passRes = await rideAPI.getRidePassengers(ride.id);
        setPassengers(passRes.data.allPassengers || []);
      } catch (err) {
        console.error("Error fetching passengers:", err);
      }
      
      setSuccess(
        `✅ Ride created! Distance: ${ride.distanceInKm?.toFixed(2)} km, Duration: ${ride.estimatedDurationMinutes} min`,
      );

      // Reset form
      setTimeout(() => {
        setPickupLocation(null);
        setDropLocation(null);
        setRoute("");
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create ride");
    } finally {
      setLoading(false);
    }
  };

  const handleStartRide = async () => {
    setLoading(true);
    try {
      const res = await rideAPI.updateRideStatus(
        currentRide.id,
        RIDE_STATUS.IN_PROGRESS,
      );
      setCurrentRide(res.data.ride);
      setSuccess("🚗 Ride started!");
    } catch (err) {
      setError("Failed to start ride");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!window.confirm("Complete ride? All passengers will be auto-dropped."))
      return;
    setLoading(true);
    try {
      const res = await rideAPI.updateRideStatus(
        currentRide.id,
        RIDE_STATUS.COMPLETED,
      );
      setCurrentRide(res.data.ride);
      setPassengers([]);
      setSuccess("✅ Ride completed! All passengers dropped.");
      setTimeout(() => {
        setCurrentRide(null);
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError("Failed to complete ride");
    } finally {
      setLoading(false);
    }
  };

  const handleBoardPassenger = async (passengerId) => {
    setLoading(true);
    try {
      const res = await rideAPI.boardPassenger(passengerId);
      setSuccess("✅ Passenger boarded!");
      fetchPassengers();
    } catch (err) {
      setError("Failed to board passenger");
    } finally {
      setLoading(false);
    }
  };

  const handleDropPassenger = async (passengerId) => {
    setLoading(true);
    setProcessingPayment(passengerId);
    try {
      // First, drop the passenger
      const res = await rideAPI.dropPassenger(passengerId);
      
      const droppedPassenger = passengers.find(p => p.id === passengerId);
      
      if (droppedPassenger && droppedPassenger.fareAmount > 0) {
        // Initiate payment for the passenger
        try {
          const paymentOrderRes = await paymentAPI.createPaymentOrder({
            rideId: currentRide.id,
            riderId: droppedPassenger.userId,
            driverId: user.id,
            amount: droppedPassenger.fareAmount,
            description: `Payment for ride from ${currentRide.pickupLocation} to ${currentRide.dropLocation}`,
          });

          if (paymentOrderRes.data?.orderId) {
            // Trigger Razorpay payment
            await initiatePayment({
              orderId: paymentOrderRes.data.orderId,
              amount: convertToPaise(droppedPassenger.fareAmount),
              currency: "INR",
              description: `CoRYD Ride Payment - ${currentRide.route}`,
              passengerName: droppedPassenger.riderName || "Passenger",
              passengerEmail: droppedPassenger.riderEmail || "passenger@coryid.com",
              passengerPhone: droppedPassenger.riderPhone || user.phone,
              onSuccess: async (response) => {
                setSuccess(`💳 Payment successful! ₹${droppedPassenger.fareAmount.toFixed(2)} received from ${droppedPassenger.riderName}`);
                setProcessingPayment(null);
                fetchPassengers();
                // Fetch updated earnings
                const earningsRes = await paymentAPI.getPaymentsForDriver(user.id);
                const payments = earningsRes.data || [];
                const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
                setEarnings(total);
              },
              onError: (errorMsg) => {
                console.error("Payment failed:", errorMsg);
                setError(`Payment failed: ${errorMsg}. Passenger dropped but payment incomplete.`);
                setProcessingPayment(null);
                fetchPassengers();
              },
            });
          } else {
            setSuccess("🎉 Passenger dropped! (Payment processing)");
            setProcessingPayment(null);
            fetchPassengers();
          }
        } catch (paymentErr) {
          console.error("Payment order creation failed:", paymentErr);
          setSuccess("🎉 Passenger dropped! (Payment will be processed separately)");
          setProcessingPayment(null);
          fetchPassengers();
        }
      } else {
        setSuccess("🎉 Passenger dropped! Seat freed!");
        setProcessingPayment(null);
        fetchPassengers();
      }
    } catch (err) {
      setError("Failed to drop passenger");
      setProcessingPayment(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const currentPassengers = passengers.filter(
    (p) => p.status === PASSENGER_STATUS.BOARDED,
  );
  const matchedPassengers = passengers.filter(
    (p) => p.status === PASSENGER_STATUS.MATCHED,
  );
  const droppedPassengers = passengers.filter(
    (p) => p.status === PASSENGER_STATUS.DROPPED,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">
              🚗 CoRYD - Driver Dashboard
            </h1>
            <p className="text-gray-600">{user?.name}</p>
          </div>
          <div className="flex gap-4 items-center">
            {/* Earnings Display */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-green-100 px-4 py-2 rounded-lg border border-green-300">
              <TrendingUp size={24} className="text-green-600" />
              <div>
                <p className="text-xs text-gray-600 font-semibold">TODAY'S EARNINGS</p>
                <p className="text-2xl font-bold text-green-600">₹{earnings.toFixed(2)}</p>
              </div>
            </div>
            <div className="relative">
              <Bell className="w-6 h-6 cursor-pointer text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate("/driver/profile")}
              className="px-4 py-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600"
            >
              👤 Profile
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 btn-secondary px-3 py-2"
            >
              <LogOut size={20} /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Notifications */}
      <NotificationList />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded mb-4 border border-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 p-4 rounded mb-4 border border-green-200">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Create/Current Ride */}
          <div className="lg:col-span-2 space-y-6">
            {!currentRide ? (
              // Create Ride Form
              <div className="card">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Plus size={24} /> Create New Ride
                </h2>

                <form onSubmit={handleCreateRide} className="space-y-4">
                  <LocationPicker
                    label="Pickup Location"
                    value={pickupLocation?.name || ""}
                    onSelect={setPickupLocation}
                  />

                  <LocationPicker
                    label="Drop Location"
                    value={dropLocation?.name || ""}
                    onSelect={setDropLocation}
                  />

                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Route Description
                    </label>
                    <input
                      type="text"
                      value={route}
                      onChange={(e) => setRoute(e.target.value)}
                      placeholder="e.g., Via Baner, Aundh"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Total Seats
                    </label>
                    <select
                      value={totalSeats}
                      onChange={(e) => setTotalSeats(parseInt(e.target.value))}
                      className="input-field"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} seats
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-success py-3 text-lg disabled:opacity-50"
                  >
                    🟢 Go Online
                  </button>
                </form>
              </div>
            ) : (
              // Current Ride Info
              <div className="card border-2 border-blue-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-blue-600">
                      Active Ride
                    </h2>
                    <p className="text-gray-600">ID: {currentRide.id}</p>
                  </div>
                  <span className="badge badge-blue">{currentRide.status}</span>
                </div>

                <div className="bg-blue-50 p-4 rounded mb-4">
                  <p className="text-lg font-bold">{currentRide.route}</p>
                  <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                    <div>📏 {currentRide.distanceInKm?.toFixed(2)} km</div>
                    <div>⏱️ {currentRide.estimatedDurationMinutes} min</div>
                    <div>💰 ₹{(currentRide.totalFare || 0).toFixed(2)}</div>
                    <div className="flex items-center gap-1">
                      <Sofa size={16} /> {currentRide.availableSeats}/
                      {currentRide.totalSeats}
                    </div>
                  </div>
                </div>

                {currentRide.status === RIDE_STATUS.WAITING && (
                  <button
                    onClick={handleStartRide}
                    disabled={loading}
                    className="w-full btn-primary py-2 mb-2 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Play size={20} /> Start Ride
                  </button>
                )}

                {currentRide.status === RIDE_STATUS.IN_PROGRESS && (
                  <button
                    onClick={handleCompleteRide}
                    disabled={loading}
                    className="w-full btn-danger py-2 mb-2 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} /> Complete Ride
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Passengers & Stats */}
          <div className="space-y-6">
            {currentRide && (
              <>
                {/* Stats */}
                <div className="space-y-2">
                  <div className="card bg-green-50 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-bold">
                        Currently Boarded
                      </span>
                      <span className="text-3xl font-bold text-green-600">
                        {currentPassengers.length}
                      </span>
                    </div>
                  </div>

                  <div className="card bg-blue-50 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-bold">
                        Available Seats
                      </span>
                      <span className="text-3xl font-bold text-blue-600">
                        {currentRide.availableSeats}/{currentRide.totalSeats}
                      </span>
                    </div>
                  </div>

                  <div className="card bg-orange-50 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-bold">
                        Total Passengers
                      </span>
                      <span className="text-3xl font-bold text-orange-600">
                        {passengers.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Passengers List */}
                <div className="card">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                    <Users size={20} /> Passengers ({passengers.length})
                  </h3>

                  {matchedPassengers.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-bold text-yellow-700 mb-2">
                        Matched - Waiting for Pickup
                      </h4>
                      <div className="space-y-2">
                        {matchedPassengers.map((p) => (
                          <PassengerCard
                            key={p.id}
                            passenger={p}
                            onBoard={handleBoardPassenger}
                            onDrop={handleDropPassenger}
                            isDrive={true}
                            isProcessing={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {currentPassengers.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-bold text-green-700 mb-2">
                        Boarded - In Ride
                      </h4>
                      <div className="space-y-2">
                        {currentPassengers.map((p) => (
                          <PassengerCard
                            key={p.id}
                            passenger={p}
                            onBoard={handleBoardPassenger}
                            onDrop={handleDropPassenger}
                            isDrive={true}
                            isProcessing={processingPayment === p.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {droppedPassengers.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-700 mb-2">
                        Dropped - Completed
                      </h4>
                      <div className="space-y-2 opacity-60">
                        {droppedPassengers.map((p) => (
                          <PassengerCard
                            key={p.id}
                            passenger={p}
                            isDrive={true}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {passengers.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      Waiting for passengers...
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
