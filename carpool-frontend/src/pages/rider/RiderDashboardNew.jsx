import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { rideAPI, paymentAPI, notificationAPI } from "../../api/axiosAPI";
import LocationPicker from "../../components/Common/LocationPicker";
import RiderActiveRideStatus from "../../components/Ride/RiderActiveRideStatus";
import RidePaymentModal from "../../components/Ride/RidePaymentModal";
import { LogOut, Search, Loader, MapPin, DollarSign, Car, Star, Users, CreditCard, User, Bell } from "lucide-react";
import { RIDE_STATUS, PASSENGER_STATUS } from "../../utils/constants";

export default function RiderDashboardNew() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropLocation, setDropLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // API Key from Backend Config (hardcoded for frontend use as requested)
  const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU0ZTBjMzc0MTc5NDQzNmZhMTk5OTAwYTBiYmJmMzRjIiwiaCI6Im11cm11cjY0In0=";

  const [activeTab, setActiveTab] = useState("available"); // available, active, payments, profile, history
  const [searchRoadDistance, setSearchRoadDistance] = useState(null); // Valid road distance from API

  const [availableRides, setAvailableRides] = useState([]);
  const [myRide, setMyRide] = useState(null);
  
  const [searching, setSearching] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [totalFare, setTotalFare] = useState(0);
  const [availableLocations, setAvailableLocations] = useState({ pickups: [], drops: [] });
  const [driverRequests, setDriverRequests] = useState([]);
  const [rideHistory, setRideHistory] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [walletBalance, setWalletBalance] = useState(5000); // Initialize with 5000
  
  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // ... (rest of state)

  // Helper to fetch Real Road Distance
  const fetchRoadDistance = async (fromLat, fromLng, toLat, toLng) => {
    try {
      console.log(`🗺️ Fetching road distance: ${fromLat},${fromLng} -> ${toLat},${toLng}`);
      const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${fromLng},${fromLat}&end=${toLng},${toLat}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': ORS_API_KEY,
          'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const meters = data.features?.[0]?.properties?.summary?.distance;
        if (meters) {
          const km = (meters / 1000).toFixed(1);
          console.log("✅ Road Distance Found:", km, "km");
          return km;
        }
      }
    } catch (error) {
       console.error("❌ Failed to fetch road distance:", error);
    }
    return null;
  };

  // ... (existing code)

  // Calculate distance - handles multiple API response formats
  const calculateDistanceFromRide = (ride) => {
    if (!ride) return "5.0";
    
    // Format 1: ride has pickupLatitude, pickupLongitude, dropLatitude, dropLongitude (from backend API)
    if (ride.pickupLatitude !== undefined && ride.pickupLongitude !== undefined && 
        ride.dropLatitude !== undefined && ride.dropLongitude !== undefined) {
      const R = 6371;
      const dLat = ((ride.dropLatitude - ride.pickupLatitude) * Math.PI) / 180;
      const dLon = ((ride.dropLongitude - ride.pickupLongitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((ride.pickupLatitude * Math.PI) / 180) *
          Math.cos((ride.dropLatitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = (R * c).toFixed(1);
      return distance > 0 ? distance : "5.0";
    }
    
    // Format 2: ride has pickupLocation and dropLocation as objects
    if (ride.pickupLocation?.lat && ride.dropLocation?.lat) {
      const R = 6371;
      const dLat = ((ride.dropLocation.lat - ride.pickupLocation.lat) * Math.PI) / 180;
      const dLon = ((ride.dropLocation.lng - ride.pickupLocation.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((ride.pickupLocation.lat * Math.PI) / 180) *
          Math.cos((ride.dropLocation.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = (R * c).toFixed(1);
      return distance > 0 ? distance : "5.0";
    }
    
    return "5.0";
  };

  // Fetch available locations from all active rides
  useEffect(() => {
    const fetchAvailableLocations = async () => {
      try {
        // Use new endpoint that filters out already-requested rides
        const res = await rideAPI.getAvailableRides(user.id);
        const rides = res.data.rides || [];

        // Extract unique pickup and drop locations
        const pickups = new Set();
        const drops = new Set();

        rides.forEach((ride) => {
          if (ride.pickup) pickups.add(ride.pickup);
          if (ride.drop) drops.add(ride.drop);
          if (ride.pickupLocation?.name) pickups.add(ride.pickupLocation.name);
          if (ride.dropLocation?.name) drops.add(ride.dropLocation.name);
        });

        setAvailableLocations({
          pickups: Array.from(pickups).sort(),
          drops: Array.from(drops).sort(),
        });

        // Also extract all unique drivers (driver requests for this rider)
        const uniqueDrivers = new Map();
        rides.forEach((ride) => {
          if (!uniqueDrivers.has(ride.driverId)) {
            uniqueDrivers.set(ride.driverId, {
              id: ride.driverId,
              name: ride.driverName || `Driver ${ride.driverId}`,
              rating: ride.rating || 4.5,
              reviews: ride.reviews || 100,
              vehicleType: ride.vehicleType || "Car",
              vehicleColor: ride.vehicleColor || "White",
              phone: ride.driverPhone || "+91-9876543210",
              rideId: ride.id,
              pickupLocation: (ride.pickupLocation?.name || ride.pickupLocation || ride.pickup || "Unknown"),
              dropLocation: (ride.dropLocation?.name || ride.dropLocation || ride.drop || "Unknown"),
              pickupLatitude: ride.pickupLatitude || ride.pickupLocation?.lat,
              pickupLongitude: ride.pickupLongitude || ride.pickupLocation?.lng,
              dropLatitude: ride.dropLatitude || ride.dropLocation?.lat,
              dropLongitude: ride.dropLongitude || ride.dropLocation?.lng,
              fare: ride.estimatedFare || ride.farePerSeat || 100,
              seats: ride.availableSeats || 0
            });
          }
        });

        setDriverRequests(Array.from(uniqueDrivers.values()));
      } catch (err) {
        console.error("Error fetching available locations:", err);
      }
    };

    fetchAvailableLocations();
    const interval = setInterval(fetchAvailableLocations, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [user.id]);

  // Load user's active ride and watch for completion
  useEffect(() => {
    const loadUserRide = async () => {
      try {
        // 1. Check ride history for any active status (MATCHED, BOARDED, DROPPED)
        const historyRes = await rideAPI.getRideHistory(user.id);
        let history = historyRes.data?.history || [];
        
        // CRITICAL: Sort by ID descending to ensure we look at the LATEST ride first.
        // Otherwise 'find' might pick an old DROPPED ride.
        history.sort((a, b) => b.id - a.id);
        
        const activeEntry = history.find(r => 
          r.status === 'MATCHED' || 
          r.status === 'BOARDED' || 
          r.status === 'DROPPED'
        );

        if (activeEntry && activeEntry.id) {
            // 2. Fetch full ride details
            const rideRes = await rideAPI.getRideById(activeEntry.id);
            const fullRide = rideRes.data?.ride;
            const passengers = rideRes.data?.passengers || [];
            
            if (fullRide) {
                fullRide.passengers = passengers;
                const myPassenger = passengers.find(p => p.riderId === parseInt(user.id));
                
                if (myPassenger) {
                    const userRide = {
                        ...fullRide,
                        passenger: myPassenger
                    };
                    
                    // Check if ride was just completed (DROPPED)
                    if (myPassenger.status === 'DROPPED') {
                        // CRITICAL: Only show (and redirect) if we witness a transition from BOARDED.
                        // If it's already DROPPED when we load (e.g. navigation back), verify if we handled it.
                        // User requested to REMOVE dropped rides from this page.
                        
                        if (myRide && myRide.passenger?.status === 'BOARDED') {
                            // This is a fresh completion event -> Update UI and Redirect
                             setMyRide(userRide);
                             const actualDistance = myPassenger.distance || "5.0";
                             const actualFare = myPassenger.fareAmount || 100;
                             
                             setTotalFare(actualFare);
                             setSuccess("🎉 You have reached your destination!");
                             
                             const completedRide = {
                                 id: userRide.id,
                                 driverName: userRide.driver?.name || "Unknown Driver",
                                 pickupLocation: userRide.pickupLocation?.name || "Unknown",
                                 dropLocation: userRide.dropLocation?.name || "Unknown",
                                 fare: actualFare,
                                 distance: actualDistance,
                                 completedAt: new Date().toLocaleString(),
                                 status: 'COMPLETED'
                             };
                             setRideHistory(prev => [completedRide, ...prev]);
                             
                             setTimeout(() => {
                                navigate(`/rider/payment/${userRide.id}`, {
                                  state: { rideId: userRide.id }
                                });
                             }, 1000);
                        } else {
                            // Already dropped and not transitioning -> Hide it.
                            setMyRide(null);
                        }
                    } else {
                        // MATCHED or BOARDED -> Show it
                        // Avoid unnecessary re-renders
                        if (JSON.stringify(myRide) !== JSON.stringify(userRide)) {
                             setMyRide(userRide);
                        }
                    }
                }
            }
        } else {
             // No active ride found
             if (myRide && myRide.status !== 'COMPLETED') {
                 // Only clear if we really lost the ride (not just network blip), but for now keep it safe
             }
        }
      } catch (err) {
        console.error("Error loading user ride:", err);
      }
    };

    loadUserRide();
    const interval = setInterval(loadUserRide, 3000);
    return () => clearInterval(interval);
  }, [user.id, myRide]);

  // Fetch ride history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) return;
      try {
        const res = await rideAPI.getRideHistory(user.id);
        const history = res.data.history || [];
        setRideHistory(history);
      } catch (err) {
        console.error("Error fetching ride history:", err);
      }
    };

    fetchHistory();
  }, [user.id, activeTab]); 

  const handleSearchRides = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSearching(true);
    setLoading(true);
    setSearchRoadDistance(null); // Reset

    try {
      if (!pickupLocation || !dropLocation) {
        setError("Please select both pickup and drop locations");
        setSearching(false);
        setLoading(false);
        return;
      }
      
      // 1. Fetch Exact Road Distance for the Rider's Trip
      const roadDist = await fetchRoadDistance(
          pickupLocation.lat, pickupLocation.lng,
          dropLocation.lat, dropLocation.lng
      );
      if (roadDist) setSearchRoadDistance(roadDist);

      console.log("🔍 SEARCHING FOR RIDES - Pickup:", pickupLocation.name, "Drop:", dropLocation.name);
      console.log("⏰ Cache Buster Timestamp:", Date.now());

      // CRITICAL: Add cache-busting parameter to force fresh data from backend
      const res = await rideAPI.getAvailableRides(user.id);
      const rides = res.data.rides || [];

      console.log("📋 Total rides from backend:", rides.length);
      console.log("📊 BACKEND RIDES DETAILS:");
      rides.forEach(r => {
        console.log("   Ride " + r.id + ": " + r.pickupLocation + " → " + r.dropLocation + 
          " | Seats: " + r.availableSeats + "/" + r.totalSeats + 
          " | Status: " + r.status + 
          " | Passengers: " + JSON.stringify(r.passengers?.map(p => ({id: p.userId, status: p.status}))));
      });

      // Filter rides that EXACTLY match the searched pickup and drop locations
      const matchingRides = rides.filter((ride) => {

        // Get ride locations
        const ridePickup = ride.pickupLocation ? ride.pickupLocation.toLowerCase().trim() : "";
        const rideDrop = ride.dropLocation ? ride.dropLocation.toLowerCase().trim() : "";
        
        // Get search locations
        const searchPickup = pickupLocation.name.toLowerCase().trim();
        const searchDrop = dropLocation.name.toLowerCase().trim();

        console.log("🔎 Checking ride ID " + ride.id + ":", {
          rideRoute: ridePickup + " → " + rideDrop,
          searchRoute: searchPickup + " → " + searchDrop,
          matches: ridePickup === searchPickup && rideDrop === searchDrop
        });

        // ✅ FLEXIBLE LOCATION MATCHING for Intermediate Drops/Pickups
        // Match if:
        // 1. Pickup matches (Rider starts at ride source, drops off early) - e.g. Hinjewadi -> Baner (on Hinjewadi -> Viman Nagar)
        // 2. Drop matches (Rider joins mid-way, drops at ride dest) - e.g. Baner -> Viman Nagar (on Hinjewadi -> Viman Nagar)
        // 3. Exact match (Standard)
        const isMatch = (ridePickup === searchPickup) || (rideDrop === searchDrop);

        if (!isMatch) {
          console.log("❌ Ride " + ride.id + ": Location mismatch (Neither Pickup nor Drop matches)");
          return false;
        }

        // ✅ Check if ride has available seats
        // SHOW ALL RIDES - even if full. Let riders request them.
        // Driver will accept only up to capacity.
        // if (!ride.availableSeats || ride.availableSeats <= 0) {
        //   console.log("❌ Ride " + ride.id + ": No available seats");
        //   return false;
        // }

        // ✅ Check if ride is WAITING (active/recent) OR IN_PROGRESS (started but has seats)
        if (ride.status !== "WAITING" && ride.status !== "IN_PROGRESS") {
          console.log("❌ Ride " + ride.id + ": Status is " + ride.status + ", not WAITING/IN_PROGRESS (old or completed ride - HIDDEN)");
          return false;
        }

        // ✅ CRITICAL: Only filter out for THIS user if they're already booked
        // Other riders SHOULD see the ride even if others have booked it
        const userIsPassenger = ride.passengers?.some((p) => {
          const passengerId = p.userId || p.riderId;
          const matches = passengerId === user.id || passengerId === parseInt(user.id);
          if (matches) {
            console.log("   User found as passenger: " + passengerId + " vs " + user.id);
          }
          return matches;
        });
        
        if (userIsPassenger) {
          console.log("❌ Ride " + ride.id + ": THIS USER already booked (cannot book twice)");
          return false;
        }

        console.log("✅ Ride " + ride.id + ": MATCH! Available seats: " + ride.availableSeats + "/" + ride.totalSeats);
        return true;
      });

      console.log("\n✅ FINAL RESULT: Found " + matchingRides.length + " matching rides");
      matchingRides.forEach(r => console.log("   ✅ Ride " + r.id + ": " + r.pickupLocation + " → " + r.dropLocation));

      if (matchingRides.length === 0) {
        console.log("❌ No matching rides found");
        setAvailableRides([]);
        setError("❌ No rides available for " + pickupLocation.name + " → " + dropLocation.name + ". Try different locations or check back later.");
        setLoading(false);
        setSearching(false);
        return;
      }

      setAvailableRides(matchingRides);
      setSuccess(`✅ Found ${matchingRides.length} ride(s) from ${pickupLocation.name} to ${dropLocation.name}!`);

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error("Search error:", err);
      setError(err.response?.data?.message || "Failed to search rides");
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  // Auto-refresh search results every 3 seconds if rides are found
  // This allows riders to see updated seat counts in real-time as other riders book
  useEffect(() => {
    if (availableRides.length === 0) return; // Don't auto-refresh if no rides shown
    
    const autoRefreshSearch = async () => {
      try {
        if (!pickupLocation || !dropLocation) return;
        
        console.log("🔄 Auto-refreshing search results...");
        
        // Fetch fresh data from backend
        const res = await rideAPI.getAvailableRides(user.id);
        const rides = res.data.rides || [];
        
        // Re-apply filters
        const updatedRides = rides.filter((ride) => {
          const ridePickup = ride.pickupLocation ? ride.pickupLocation.toLowerCase().trim() : "";
          const rideDrop = ride.dropLocation ? ride.dropLocation.toLowerCase().trim() : "";
          const searchPickup = pickupLocation.name.toLowerCase().trim();
          const searchDrop = dropLocation.name.toLowerCase().trim();
          
          // Relaxed match for auto-refresh too
          const isMatch = (ridePickup === searchPickup) || (rideDrop === searchDrop);
          if (!isMatch) return false;
          if (ride.status !== "WAITING" && ride.status !== "IN_PROGRESS") return false;
          
          const userIsPassenger = ride.passengers?.some((p) => {
            const passengerId = p.userId || p.riderId;
            return passengerId === user.id || passengerId === parseInt(user.id);
          });
          
          return !userIsPassenger;
        });
        
        console.log("🔄 Auto-refresh result: " + updatedRides.length + " rides (was " + availableRides.length + ")");
        
        // Update available seats for existing rides
        setAvailableRides(updatedRides);
      } catch (err) {
        console.error("Auto-refresh error:", err);
      }
    };
    
    // Auto-refresh every 3 seconds while showing search results
    const refreshInterval = setInterval(autoRefreshSearch, 3000);
    return () => clearInterval(refreshInterval);
  }, [availableRides.length, pickupLocation, dropLocation, user.id]);

  const handleBookRide = async (rideId, overrideDetails = null) => {
    setLoading(true);
    try {
      // Determine locations from override OR state
      const pName = overrideDetails?.pickupLocation || pickupLocation?.name;
      const dName = overrideDetails?.dropLocation || dropLocation?.name;
      const pLat = overrideDetails?.pickupLatitude || pickupLocation?.lat;
      const pLng = overrideDetails?.pickupLongitude || pickupLocation?.lng;
      const dLat = overrideDetails?.dropLatitude || dropLocation?.lat;
      const dLng = overrideDetails?.dropLongitude || dropLocation?.lng;

      if (!pName || !dName) {
        setError("Please select pickup and drop locations");
        setLoading(false);
        return;
      }

      // Calculate accurate distance and fare for the request
      let finalDistance = "5.0";
      if (searchRoadDistance) {
        finalDistance = searchRoadDistance;
      } else if (pLat && dLat) {
         // Fallback calculation same as UI
         const R = 6371;
         const dLatRad = ((dLat - pLat) * Math.PI) / 180;
         const dLonRad = ((dLng - pLng) * Math.PI) / 180;
         const a =
           Math.sin(dLatRad / 2) * Math.sin(dLatRad / 2) +
           Math.cos((pLat * Math.PI) / 180) *
             Math.cos((dLat * Math.PI) / 180) *
             Math.sin(dLonRad / 2) *
             Math.sin(dLonRad / 2);
         const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
         finalDistance = (R * c * 1.5).toFixed(1);
      }
      
      const finalFare = (30 + parseFloat(finalDistance) * 10).toFixed(0);

      // Create ride request data - include coordinates
      const requestData = {
        riderId: parseInt(user.id),
        pickupLocation: pName,
        dropLocation: dName,
        pickupLatitude: pLat,
        pickupLongitude: pLng,
        dropLatitude: dLat,
        dropLongitude: dLng,
        // Critical: Send the specific Ride ID we are booking!
        matchedRideId: rideId,
        // Send calculated values so Driver sees exactly what Rider saw
        distance: finalDistance,
        fare: finalFare
      };

      console.log("📤 Sending Booking Request:", requestData);
      const res = await rideAPI.createRideRequest(requestData);

      if (res.status === 200 || res.status === 201) {
        setSuccess("✅ Booking confirmed! Waiting for driver approval.");
        
        // Clear locations
        setPickupLocation(null);
        setDropLocation(null);
        
        // Refresh available rides immediately to show updated seat count
        const refreshRes = await rideAPI.getAvailableRides(user.id);
        const freshRides = refreshRes.data.rides || [];
        setAvailableRides(freshRides); // Force update UI

        setTimeout(() => {
          setSuccess("");
          setActiveTab("active"); // Switch to Active Rides tab
        }, 1500);
      }
    } catch (err) {
      console.error("Booking error:", err);
      setError(err.response?.data?.message || "Failed to book ride");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = async (paymentMethod, amount) => {
    setLoading(true);
    try {
      if (!myRide || !myRide.id) {
        setError("Ride information missing. Cannot process payment.");
        setLoading(false);
        return;
      }

      // Build payment payload with all required fields
      const paymentPayload = {
        rideId: myRide.id,
        riderId: user.id,
        driverId: myRide.driverId,
        amount: parseFloat(amount),
        method: paymentMethod.toUpperCase(),
      };

      console.log("🔄 Processing payment via Payment Service:", paymentPayload);
      
      // Call Payment Service to record payment
      const response = await paymentAPI.processPayment(paymentPayload);
      console.log("✅ Payment recorded:", response.data);

      // Get the actual fare and distance from the passenger data if available
      const passengerData = myRide.passenger || {};
      let actualDistance = passengerData.distance;
      
      // If no stored distance, calculate from coordinates
      if (!actualDistance) {
        if (myRide.pickupLatitude && myRide.dropLatitude) {
          // Use separate lat fields from API
          const R = 6371;
          const dLat = ((myRide.dropLatitude - myRide.pickupLatitude) * Math.PI) / 180;
          const dLon = ((myRide.dropLongitude - myRide.pickupLongitude) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((myRide.pickupLatitude * Math.PI) / 180) *
              Math.cos((myRide.dropLatitude * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          actualDistance = (R * c).toFixed(1);
        } else if (myRide.pickupLocation?.lat && myRide.dropLocation?.lat) {
          actualDistance = calculateDistance(myRide.pickupLocation, myRide.dropLocation);
        } else {
          actualDistance = "5.0";
        }
      }
      
      const actualFare = passengerData.fareAmount || parseFloat(amount);

      // Add to payment history
      const paymentRecord = {
        id: response.data?.id || Date.now(),
        pickupLocation: myRide.pickupLocation?.name || 'Unknown',
        dropLocation: myRide.dropLocation?.name || 'Unknown',
        distance: actualDistance,
        fare: actualFare,
        method: paymentMethod,
        status: 'COMPLETED',
        timestamp: new Date().toLocaleString(),
        driverName: myRide.driver?.name || 'Unknown Driver'
      };
      
      setPaymentHistory(prev => [paymentRecord, ...prev]);
      
      // Deduct from wallet balance
      setWalletBalance(prev => Math.max(0, prev - parseFloat(amount)));

      // Clear UI state
      setShowPaymentModal(false);
      setMyRide(null);
      setPickupLocation(null);
      setDropLocation(null);

      setSuccess("✅ Payment completed! Thank you for using Carpool.");
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error("❌ Payment processing error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Payment processing failed";
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  // Poll for notifications
  useEffect(() => {
    if (!user?.id) return;
    const fetchNotifications = async () => {
        try {
            const res = await notificationAPI.getUnreadNotifications(user.id);
            setNotifications(res.data || []);
        } catch (err) {
            // silent
        }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleMarkRead = async (id) => {
      try {
          await notificationAPI.markAsRead(id);
          setNotifications(prev => prev.filter(n => n.id !== id));
      } catch (err) {
          console.error("Failed to mark read", err);
      }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Navbar */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-green-600">🚕 Rider Dashboard</h1>
            
            <div className="flex items-center gap-3">
                {/* Notification Bell */}
                <div className="relative">
                    <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 relative"
                    >
                    <Bell size={20} className="text-gray-700" />
                    {notifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                        {notifications.length}
                        </span>
                    )}
                    </button>
                    
                    {/* Dropdown */}
                    {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                        <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Notifications</h3>
                        <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700">×</button>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">No new notifications</div>
                        ) : (
                            notifications.map(n => (
                            <div key={n.id} className="p-3 border-b border-gray-50 hover:bg-green-50 transition cursor-pointer" onClick={() => handleMarkRead(n.id)}>
                                <p className="text-sm text-gray-800 font-semibold">{n.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                            </div>
                            ))
                        )}
                        </div>
                    </div>
                    )}
                </div>

                <button
                onClick={() => {
                    logout();
                    navigate("/login");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                <LogOut size={18} />
                Logout
                </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 pb-3 border-b-2 border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab("available")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                activeTab === "available"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Car size={18} />
              Available Rides
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                activeTab === "active"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Users size={18} />
              Active Rides
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                activeTab === "history"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              📋 History ({rideHistory.length})
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                activeTab === "payments"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <CreditCard size={18} />
              Payments
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                activeTab === "profile"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <User size={18} />
              Profile
            </button>
          </div>

          {/* Payment & Wallet Info Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
            {/* Ride Status */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold uppercase">Ride Status</p>
              <p className="text-lg font-bold text-green-600">
                {myRide ? "🚗 On Trip" : "✅ Ready"}
              </p>
            </div>

            {/* Current Fare */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold uppercase">Current Fare</p>
              <p className="text-lg font-bold text-blue-600">
                ₹{myRide && showPaymentModal ? totalFare : "0"}
              </p>
            </div>

            {/* Total Spent */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold uppercase">Total Spent</p>
              <p className="text-lg font-bold text-orange-600">
                ₹{paymentHistory.reduce((sum, p) => sum + p.fare, 0)}
              </p>
            </div>

            {/* Wallet Balance */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold uppercase">Wallet Balance</p>
              <p className="text-lg font-bold text-purple-600">
                ₹{walletBalance.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
            <span>⚠️</span>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg flex items-center gap-2">
            <span>✅</span>
            {success}
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <RidePaymentModal
            ride={myRide}
            passenger={myRide?.passenger}
            totalFare={totalFare}
            onPaymentComplete={handlePaymentComplete}
            loading={loading}
          />
        )}

        {/* Main Layout - Tab Content - Fixed */}
        {activeTab === "available" ? (
          // Search for Rides
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column - Search Form */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-20">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Search size={24} />
                  Find a Ride
                </h2>

                <form onSubmit={handleSearchRides} className="space-y-4">
                  {/* Pickup Location */}
                  <LocationPicker
                    label="📍 Pickup Location"
                    value={pickupLocation?.name || ""}
                    onSelect={setPickupLocation}
                    required={true}
                  />

                  {/* Drop Location */}
                  <LocationPicker
                    label="📍 Drop Location"
                    value={dropLocation?.name || ""}
                    onSelect={setDropLocation}
                    required={true}
                  />

                  {/* Find Routes Button */}
                  <button
                    type="submit"
                    disabled={searching || loading}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {searching ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search size={20} />
                        Find Routes
                      </>
                    )}
                  </button>

                  {/* Available Locations */}
                  {availableLocations.pickups.length > 0 && (
                    <div className="mt-6 pt-6 border-t-2 border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">📍 Available Pickup Locations:</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {availableLocations.pickups.map((location) => (
                          <button
                            key={`pickup-${location}`}
                            onClick={() => setPickupLocation({ name: location, lat: 0, lng: 0 })}
                            className={`px-3 py-1 rounded-full text-sm font-semibold transition ${
                              pickupLocation?.name === location
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {location}
                          </button>
                        ))}
                      </div>

                      <p className="text-sm font-semibold text-gray-700 mb-3">🏁 Available Drop Locations:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableLocations.drops.map((location) => (
                          <button
                            key={`drop-${location}`}
                            onClick={() => setDropLocation({ name: location, lat: 0, lng: 0 })}
                            className={`px-3 py-1 rounded-full text-sm font-semibold transition ${
                              dropLocation?.name === location
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {location}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Right Column - Available Rides */}
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Available Routes</h2>

              {availableRides.length > 0 ? (
                <div className="space-y-4">
                  {availableRides.map((ride) => {
                    
                    // CORRECT FARE LOGIC: Use the RIDER'S requested locations, not the Driver's full route
                    // If pickupLocation (state) is set, use that. Otherwise fallback to ride's location.
                    let calcPickup = pickupLocation;
                    let calcDrop = dropLocation;
                    
                    let distanceVal = 5.0; // Default
                    
                    if (calcPickup?.name && calcDrop?.name) {
                       // Calculate distance for the RIDER'S journey
                       const R = 6371;
                       const pLat = calcPickup.lat || ride.pickupLatitude;
                       const pLng = calcPickup.lng || ride.pickupLongitude;
                       const dLatLoc = calcDrop.lat || ride.dropLatitude;
                       const dLngLoc = calcDrop.lng || ride.dropLongitude;
                       
                       const dLat = ((dLatLoc - pLat) * Math.PI) / 180;
                       const dLon = ((dLngLoc - pLng) * Math.PI) / 180;
                       
                       // CORRECT FARE LOGIC: Use the RIDER'S requested locations
                       // If we have a fetched Road Distance, use that!
                       if (searchRoadDistance) {
                           distanceVal = searchRoadDistance;
                       } else if (pickupLocation?.name && dropLocation?.name) {
                          const a =
                            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                            Math.cos((pLat * Math.PI) / 180) *
                              Math.cos((dLatLoc * Math.PI) / 180) *
                              Math.sin(dLon / 2) *
                              Math.sin(dLon / 2);
                          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                          
                          // Multiply by 1.5 as fallback approximation
                          distanceVal = (R * c * 1.5).toFixed(1);
                       } else {
                          // Fallback to ride total distance
                          distanceVal = parseFloat(calculateDistanceFromRide(ride)) || 5.0;
                       }
                    } else {
                       distanceVal = parseFloat(calculateDistanceFromRide(ride)) || 5.0;
                    }

                    const distance = parseFloat(distanceVal) || 5.0;
                    const fare = isNaN(distance) ? "100" : (30 + distance * 10).toFixed(0);
                    const availableSeats = Math.max(0, (ride.totalSeats || 4) - (ride.passengers?.length || 0));

                    return (
                      <div
                        key={ride.id}
                        className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition border-l-4 border-green-600"
                      >
                        {/* Header - Route and Fare */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                              {/* Show RIDER'S requested route if searching, else Driver's route */}
                              📍 {(pickupLocation && dropLocation) ? `${pickupLocation.name} → ${dropLocation.name}` : (ride.pickup || ride.pickupLocation?.name)}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {searchRoadDistance ? "Road Distance: " : "Est. Road Dist: "} 
                              {isNaN(distance) ? "5.0" : distance} km
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-green-600">₹{isNaN(fare) ? "100" : fare}</p>
                            <p className="text-xs text-gray-600">Time: {isNaN(distance) ? "8" : Math.ceil(distance / 40 * 60)} min</p>
                          </div>
                        </div>

                        {/* Driver Information */}
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg mb-4 border-l-4 border-blue-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Driver</p>
                              <p className="text-lg font-bold text-gray-800">{ride.driverName || "Unknown"}</p>
                              <p className="text-xs text-gray-600 mt-1">Phone: +91-9876543210</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Rating</p>
                              <p className="text-2xl font-bold text-yellow-600">⭐ {ride.rating || "4.8"}</p>
                              <p className="text-xs text-gray-600">({ride.reviews || "120"} reviews)</p>
                            </div>
                          </div>
                        </div>

                        {/* Vehicle & Seats Information */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="bg-purple-50 p-3 rounded-lg border-l-2 border-purple-500">
                            <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Vehicle</p>
                            <p className="text-sm font-bold text-purple-600">{ride.vehicleType || "Swift"}</p>
                            <p className="text-xs text-gray-600">Color: White</p>
                          </div>
                          <div className="bg-yellow-50 p-3 rounded-lg border-l-2 border-yellow-500">
                            <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Available Seats</p>
                            <p className={`text-2xl font-bold ${availableSeats <= 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                              {availableSeats <= 0 ? '❌ FULL' : availableSeats}
                            </p>
                            <p className="text-xs text-gray-600">of {ride.totalSeats}</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg border-l-2 border-green-500">
                            <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Fare Type</p>
                            <p className="text-sm font-bold text-green-600">₹10/km</p>
                            <p className="text-xs text-gray-600">+ ₹30 base</p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg border-l-2 border-blue-500">
                            <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Status</p>
                            <p className="text-sm font-bold text-blue-600">🟢 Active</p>
                            <p className="text-xs text-gray-600">Arriving soon</p>
                          </div>
                        </div>

                        {/* Ride Details */}
                        <div className="bg-gray-50 p-4 rounded-lg mb-4 border-t-2 border-b-2 border-gray-300">
                          <p className="text-xs text-gray-600 uppercase font-semibold mb-3">Ride Details</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">📤 Pickup Time:</span>
                              <span className="font-semibold">10:30 AM</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">📍 Pickup Location:</span>
                              <span className="font-semibold">{ride.pickup || ride.pickupLocation?.name || "Not specified"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">🏁 Drop Location:</span>
                              <span className="font-semibold">{ride.drop || ride.dropLocation?.name || "Not specified"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">👥 Other Passengers:</span>
                              <span className="font-semibold">{Math.max(0, (ride.passengers?.length || 1) - 1)} person(s)</span>
                            </div>
                          </div>
                        </div>

                        {/* Features */}
                        <div className="flex gap-2 mb-4 flex-wrap">
                          <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">✓ AC</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">✓ Music</span>
                          <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-semibold">✓ Premium</span>
                          <span className="text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-semibold">✓ Safe Travel</span>
                        </div>

                        {/* Booking Button */}
                          <button
                            onClick={() => handleBookRide(ride.id)}
                            disabled={loading || availableSeats <= 0}
                            className={`w-full py-3 text-lg font-bold rounded-lg shadow-lg transition-transform transform active:scale-95 flex items-center justify-center gap-2 ${
                              availableSeats > 0
                                ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            {loading ? (
                              <>
                                <Loader size={20} className="animate-spin" />
                                Booking...
                              </>
                            ) : availableSeats > 0 ? (
                              <>
                                <Car size={20} />
                                Book Seat
                              </>
                            ) : (
                              "❌ Ride Full"
                            )}
                          </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {searching ? "Searching..." : "No Routes Found"}
                  </h2>
                  <p className="text-gray-600">
                    {searching
                      ? "Finding available routes for you..."
                      : "Select pickup and drop locations, then click 'Find Routes' to see available rides"}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "active" ? (
          // Active Rides Tab - Shows driver requests and active rides
          <div className="space-y-8">
            {/* Onboarding Section - Show driver requests for rider */}
            {/* Driver Requests removed as per user request (Use Available Rides tab to book) */}

            {/* Active Ride Status */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">🚗 Current Ride Status</h2>
              {myRide ? (
                <div className="space-y-6">
                  {/* Show "Waiting for Pickup" when ride status is WAITING or passenger is MATCHED */}
                  {myRide.status === "WAITING" || myRide.passenger?.status === "MATCHED" ? (
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-8 border-l-4 border-blue-600">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800">⏳ Waiting for Pickup</h3>
                          <p className="text-gray-600 mt-2">Driver is on the way to pick you up!</p>
                        </div>
                        <div className="text-5xl">🚗</div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg">
                          <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Pickup</p>
                          <p className="text-lg font-bold text-gray-800">📍 {myRide.pickupLocation}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Drop-off</p>
                          <p className="text-lg font-bold text-gray-800">📍 {myRide.dropLocation}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Driver</p>
                          <p className="text-lg font-bold text-gray-800">👨‍💼 {myRide.driverName}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg text-center">
                          <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Distance</p>
                          <p className="text-2xl font-bold text-blue-600">{calculateDistanceFromRide(myRide)} km</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg text-center">
                          <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Estimated Fare</p>
                          <p className="text-2xl font-bold text-green-600">₹{(30 + parseFloat(calculateDistanceFromRide(myRide)) * 10).toFixed(0)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg text-center">
                          <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Seats</p>
                          <p className="text-2xl font-bold text-purple-600">{myRide.availableSeats}/{myRide.totalSeats}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg text-center">
                          <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Status</p>
                          <p className="text-lg font-bold text-orange-600">🟡 {myRide.status}</p>
                        </div>
                      </div>

                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>💡 Tip:</strong> You can view your driver's location once they accept the ride. Keep your phone handy!
                        </p>
                      </div>
                    </div>
                  ) : myRide.passenger?.status === PASSENGER_STATUS.MATCHED ||
                     myRide.passenger?.status === PASSENGER_STATUS.BOARDED ||
                     myRide.passenger?.status === PASSENGER_STATUS.DROPPED ? (
                    <RiderActiveRideStatus
                      ride={myRide}
                      passenger={myRide.passenger}
                      onProceedToPayment={() => {
                        const distance = calculateDistanceFromRide(myRide);
                        const fare = (30 + parseFloat(distance) * 10).toFixed(0);
                        setTotalFare(fare);
                        setShowPaymentModal(true);
                      }}
                      loading={loading}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-600 text-lg">⏳ Ride status: {myRide.passenger?.status || myRide.status}</p>
                      <p className="text-sm text-gray-500 mt-2">Waiting for driver to accept your request...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">📪 No active rides at the moment</p>
                  <button
                    onClick={() => setActiveTab("available")}
                    className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Find a Ride
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "history" ? (
          // Ride History Tab
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Ride History</h2>
            
            {rideHistory.length > 0 ? (
              <div className="space-y-4">
                {rideHistory.map((ride, index) => (
                  <div
                    key={ride.id || index}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition bg-gradient-to-r from-gray-50 to-white"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <p className="text-lg font-bold text-gray-800">📍 {ride.pickupLocation}</p>
                        <p className="text-sm text-gray-600 mt-1">→ {ride.dropLocation}</p>
                        <p className="text-xs text-gray-500 mt-2">{ride.completedAt}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          ✓ {ride.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3 mt-3">
                      <div className="grid grid-cols-4 gap-3 text-center">
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Driver</p>
                          <p className="text-sm font-bold text-gray-800">{ride.driverName}</p>
                          <p className="text-xs text-yellow-600">⭐ {ride.driverRating}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Distance</p>
                          <p className="text-lg font-bold text-blue-600">{ride.distance} km</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Fare</p>
                          <p className="text-lg font-bold text-green-600">₹{ride.fare}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Payment</p>
                          <p className="text-xs font-bold text-green-600">✓ Completed</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-xl text-gray-500">📭 No ride history yet</p>
                <p className="text-sm text-gray-400 mt-2">Book a ride to see your history here</p>
                <button
                  onClick={() => setActiveTab("available")}
                  className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Find a Ride
                </button>
              </div>
            )}
          </div>
        ) : activeTab === "payments" ? (
          // Payments Tab
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">💳 Payment History</h2>
            
            {paymentHistory.length > 0 ? (
              <div className="space-y-4">
                {paymentHistory.map((payment, index) => (
                  <div
                    key={payment.id || index}
                    className="border-l-4 border-green-600 bg-green-50 p-4 rounded-lg hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-800">{payment.pickupLocation} → {payment.dropLocation}</p>
                        <p className="text-sm text-gray-600">{payment.timestamp}</p>
                        <p className="text-xs text-gray-500 mt-1">Driver: {payment.driverName} | Method: {payment.method}</p>
                        <p className="text-xs text-green-600 mt-1">✓ {payment.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">₹{payment.fare}</p>
                        <p className="text-xs text-gray-600">{payment.distance} km</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-xl text-gray-500">💳 No payments yet</p>
                <p className="text-sm text-gray-400 mt-2">Complete a ride to see payment history here</p>
              </div>
            )}

            {/* Payment Summary */}
            {paymentHistory.length > 0 && (
              <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border-t-4 border-green-600">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">Total Rides</p>
                    <p className="text-3xl font-bold text-green-600">{paymentHistory.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Total Spent</p>
                    <p className="text-3xl font-bold text-green-600">₹{paymentHistory.reduce((sum, p) => sum + p.fare, 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Avg. Ride Cost</p>
                    <p className="text-3xl font-bold text-green-600">₹{(paymentHistory.reduce((sum, p) => sum + p.fare, 0) / paymentHistory.length).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "profile" ? (
          // Profile Tab
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">👤 My Profile</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Profile Info */}
              <div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-l-4 border-blue-600 mb-6">
                  <p className="text-gray-600 text-sm mb-2">Name</p>
                  <p className="text-2xl font-bold text-gray-800">{user?.name || "Alex Kumar"}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border-l-4 border-purple-600 mb-6">
                  <p className="text-gray-600 text-sm mb-2">Email</p>
                  <p className="text-lg font-semibold text-gray-800">{user?.email || "alex@example.com"}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border-l-4 border-green-600 mb-6">
                  <p className="text-gray-600 text-sm mb-2">Rating</p>
                  <p className="text-2xl font-bold text-yellow-600">⭐ 4.8 (48 reviews)</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border-l-4 border-orange-600">
                  <p className="text-gray-600 text-sm mb-2">Member Since</p>
                  <p className="text-lg font-semibold text-gray-800">January 2026</p>
                </div>
              </div>

              {/* Stats */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Ride Statistics</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Total Rides</span>
                    <span className="text-2xl font-bold text-blue-600">12</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Total Distance</span>
                    <span className="text-2xl font-bold text-green-600">123 km</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Total Spent</span>
                    <span className="text-2xl font-bold text-orange-600">₹850</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Favorite Driver</span>
                    <span className="text-lg font-bold text-purple-600">Rajesh K.</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                  <p className="text-gray-700 font-semibold mb-2">Safety Badges</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">✓ Verified Phone</span>
                    <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">✓ Email Verified</span>
                    <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">✓ Safe Rider</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Show active ride status if available
          myRide && myRide.passenger.status !== PASSENGER_STATUS.DROPPED ? (
            <RiderActiveRideStatus
              ride={myRide}
              passenger={myRide.passenger}
              onProceedToPayment={() => {
                const distance = calculateDistance(myRide.pickupLocation, myRide.dropLocation);
                const fare = (30 + parseFloat(distance) * 10).toFixed(0);
                setTotalFare(fare);
                setShowPaymentModal(true);
              }}
              loading={loading}
            />
          ) : null
        )}
      </div>
    </div>
  );
}
