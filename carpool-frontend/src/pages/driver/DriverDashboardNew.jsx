import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { rideAPI, notificationAPI, paymentAPI } from "../../api/axiosAPI";
import LocationPicker from "../../components/Common/LocationPicker";
import IncomingRideRequest from "../../components/Ride/IncomingRideRequest";
import ActiveDriverRideCard from "../../components/Ride/ActiveDriverRideCard";
import { initiatePayment, convertToPaise } from "../../utils/razorpayUtils";
import { LogOut, Bell, Plus, Loader, TrendingUp, X } from "lucide-react";
import { RIDE_STATUS, PASSENGER_STATUS } from "../../utils/constants";

export default function DriverDashboardNew() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropLocation, setDropLocation] = useState(null);
  const [totalSeats, setTotalSeats] = useState(4);
  const [currentRide, setCurrentRide] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [incomingRideRequest, setIncomingRideRequest] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [processedRequestIds, setProcessedRequestIds] = useState(new Set()); // Track viewed/processed requests
  const [earnings, setEarnings] = useState(0);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrAmount, setQrAmount] = useState(0);
  const [sessionEarnings, setSessionEarnings] = useState(0);
  const [rideHistory, setRideHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [passengerFares, setPassengerFares] = useState({}); // Store {passengerId: {distance, fare}} for each accepted passenger
  const [currentRideDistance, setCurrentRideDistance] = useState("5.0"); // Store actual distance for current ride
  const [currentRideFare, setCurrentRideFare] = useState(100); // Store actual fare for current ride

  // Calculate distance based on pickup and drop coordinates (Haversine formula)
  const calculateDistance = (pickupLoc, dropLoc) => {
    // Handle case where pickupLoc and dropLoc are objects with lat/lng
    if (!pickupLoc || !dropLoc) return "5.0";
    
    let pickupLat, pickupLng, dropLat, dropLng;
    
    // If they have .lat and .lng properties
    if (pickupLoc.lat !== undefined && pickupLoc.lng !== undefined) {
      pickupLat = pickupLoc.lat;
      pickupLng = pickupLoc.lng;
      dropLat = dropLoc.lat;
      dropLng = dropLoc.lng;
    }
    
    // If coordinates are missing, return default
    if (pickupLat === undefined || pickupLng === undefined || dropLat === undefined || dropLng === undefined) {
      return "5.0";
    }
    
    const R = 6371; // Earth radius in km
    const dLat = ((dropLat - pickupLat) * Math.PI) / 180;
    const dLon = ((dropLng - pickupLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pickupLat * Math.PI) / 180) *
        Math.cos((dropLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = (R * c).toFixed(1);
    return distance > 0 ? distance : "5.0";
  };

  // Calculate fare: Base ₹30 + ₹10 per km
  const calculateFare = (distance) => {
    const basePrice = 30;
    const pricePerKm = 10;
    return (basePrice + parseFloat(distance) * pricePerKm).toFixed(0);
  };

  // Location coordinate mapping - Maps location names to coordinates
  const locationCoordinates = {
    "baner": { lat: 18.5604, lng: 73.7997 },
    "hinjewadi": { lat: 18.5910, lng: 73.8663 },
    "hinjewadi phase 1": { lat: 18.5910, lng: 73.8663 },
    "hinjewadi phase 2": { lat: 18.5890, lng: 73.8700 },
    "wakad": { lat: 18.5890, lng: 73.9050 },
    "viman nagar": { lat: 18.5657, lng: 73.9124 },
    "koregaon park": { lat: 18.5304, lng: 73.8567 },
    "kothrud": { lat: 18.5089, lng: 73.8197 },
    "katraj": { lat: 18.4679, lng: 73.8844 },
    "hadapsar": { lat: 18.5244, lng: 73.9525 },
    "pune airport": { lat: 18.5797, lng: 73.9199 },
    "camp": { lat: 18.5204, lng: 73.8567 },
    "fc road": { lat: 18.5243, lng: 73.8392 }
  };

  // Get coordinates for a location by name
  const getLocationCoordinates = (locationName) => {
    if (!locationName) return null;
    const normalized = locationName.toLowerCase().trim();
    
    // Direct match
    if (locationCoordinates[normalized]) {
      return locationCoordinates[normalized];
    }
    
    // Partial match
    for (const [key, coords] of Object.entries(locationCoordinates)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return coords;
      }
    }
    
    return null;
  };

  // Debug: Log user data
  useEffect(() => {
    console.log("Current user:", user);
  }, [user]);

  // Polling for ride updates
  useEffect(() => {
    if (currentRide?.id) {
      const interval = setInterval(() => {
        if (typeof fetchCurrentRide === 'function') {
          fetchCurrentRide();
        } else {
             // Fallback or ignore if function not available in this scope
             console.log("Fetching ride updates...");
        }
        fetchPassengers();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentRide?.id]);

  const [endpointNotFound, setEndpointNotFound] = useState(false); // Track if endpoint doesn't exist

  // Polling for incoming ride requests
  useEffect(() => {
    const checkIncomingRequests = async () => {
      if (!currentRide?.id || endpointNotFound) {
        console.log("Skipping check - currentRide.id:", currentRide?.id, "endpointNotFound:", endpointNotFound);
        return;
      }
      
      try {
        console.log("Checking for incoming requests for ride:", currentRide.id);
        const res = await rideAPI.getPendingRequests(currentRide.id);
        console.log("Raw API response:", res);
        
        // Handle various response formats from backend
        let requests = [];
        if (Array.isArray(res.data)) {
          requests = res.data;
        } else if (res.data?.requests && Array.isArray(res.data.requests)) {
          requests = res.data.requests;
        } else if (res.data?.data && Array.isArray(res.data.data)) {
          requests = res.data.data;
        } else if (res.data) {
          requests = Array.isArray(res.data) ? res.data : [];
        }
        
        console.log("Parsed requests array:", requests);
        console.log("Requests count:", requests.length, "Processed IDs:", Array.from(processedRequestIds));
        
        // Find first unprocessed request
        let firstUnprocessedRequest = null;
        if (Array.isArray(requests) && requests.length > 0) {
          for (const req of requests) {
            console.log("Checking request ID:", req.id, "Already processed?", processedRequestIds.has(req.id));
            if (!processedRequestIds.has(req.id)) {
              firstUnprocessedRequest = req;
              console.log("Found unprocessed request:", req.id);
              break;
            }
          }
        }
        
        // Show the first unprocessed request if any and modal is not already showing
        if (firstUnprocessedRequest) {
          console.log("Creating modal for request:", firstUnprocessedRequest);
          const firstRequest = firstUnprocessedRequest;
          
          // Try to get coordinates from RideRequest
          let pickupLat = firstRequest.pickupLatitude;
          let pickupLng = firstRequest.pickupLongitude;
          let dropLat = firstRequest.dropLatitude;
          let dropLng = firstRequest.dropLongitude;
          
          // If not in RideRequest, try to look up from location names
          if (pickupLat === undefined || pickupLng === undefined) {
            const pickupCoords = getLocationCoordinates(firstRequest.pickupLocation || firstRequest.pickup);
            if (pickupCoords) {
              pickupLat = pickupCoords.lat;
              pickupLng = pickupCoords.lng;
            }
          }
          
          if (dropLat === undefined || dropLng === undefined) {
            const dropCoords = getLocationCoordinates(firstRequest.dropLocation || firstRequest.drop);
            if (dropCoords) {
              dropLat = dropCoords.lat;
              dropLng = dropCoords.lng;
            }
          }
          
          // Fallback to default coordinates if still not found
          if (pickupLat === undefined) pickupLat = 18.5204;
          if (pickupLng === undefined) pickupLng = 73.8567;
          if (dropLat === undefined) dropLat = 18.5383;
          if (dropLng === undefined) dropLng = 73.8701;
          
          console.log("Final coordinates for popup - from request or location lookup:", {
            pickupLocation: firstRequest.pickupLocation || firstRequest.pickup,
            pickup: { lat: pickupLat, lng: pickupLng },
            dropLocation: firstRequest.dropLocation || firstRequest.drop,
            drop: { lat: dropLat, lng: dropLng }
          });
          
          const newRequest = {
            id: firstRequest.id,
            riderId: firstRequest.riderId,
            riderName: firstRequest.riderName || "Rider",
            pickupLatitude: pickupLat,
            pickupLongitude: pickupLng,
            dropLatitude: dropLat,
            dropLongitude: dropLng,
            pickupLocation: {
              name: firstRequest.pickupLocation || firstRequest.pickup,
              lat: pickupLat,
              lng: pickupLng,
            },
            dropLocation: {
              name: firstRequest.dropLocation || firstRequest.drop,
              lat: dropLat,
              lng: dropLng,
            },
            status: firstRequest.status,
            // Pass the calculated distance and fare from Rider side
            distance: firstRequest.distance,
            fare: firstRequest.fare,
          };
          
          // Show the request modal - DON'T mark as processed yet
          // User will mark it as processed when they accept/reject
          setIncomingRideRequest(newRequest);
          console.log("Modal state updated with request:", firstRequest.id);
        } else {
          console.log("No new unprocessed request to show.");
        }
      } catch (err) {
        // If endpoint doesn't exist (404), stop trying
        if (err.response?.status === 404) {
          console.warn("Pending requests endpoint not available (404) - stopping polls");
          setEndpointNotFound(true);
        } else {
          console.error("Error checking requests:", err.message, err.response?.status);
        }
      }
    };

    // Check immediately on ride creation, then poll
    if (currentRide?.id && !endpointNotFound) {
      console.log("Starting polling for ride:", currentRide.id);
      checkIncomingRequests();
      const interval = setInterval(checkIncomingRequests, 3000);
      return () => clearInterval(interval);
    }
  }, [currentRide?.id, endpointNotFound]);

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
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user.id]);

  // Fetch driver earnings (Calculated from completed rides today)
  useEffect(() => {
    const fetchEarnings = async () => {
      if (!user?.id) return;
      try {
        // We use ride history to calculate earnings to ensure consistency
        const res = await rideAPI.getRidesByDriver(user.id);
        const rides = res.data.rides || [];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayRides = rides.filter(ride => {
            if (ride.status !== 'COMPLETED') return false;
            if (!ride.completedAt) return false;
            const rideDate = new Date(ride.completedAt);
            return rideDate >= today;
        });

        const todayTotal = todayRides.reduce((sum, ride) => {
            const rideEarnings = ride.passengers?.reduce((pSum, p) => pSum + (p.fareAmount || 0), 0) || 0;
            return sum + rideEarnings;
        }, 0);
        
        setEarnings(todayTotal);
      } catch (err) {
        console.error("Error fetching earnings:", err);
      }
    };

    fetchEarnings();
    const interval = setInterval(fetchEarnings, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [user.id]);

  // Fetch ride history for driver
  useEffect(() => {
    const fetchRideHistory = async () => {
      if (!user?.id) return;
      try {
        const res = await rideAPI.getRidesByDriver(user.id);
        const rides = res.data.rides || [];
        
        // Map backend rides to history format
        const historyData = rides.map(ride => {
            // Calculate total earnings for this ride if not provided
            // This is an estimation if backend doesn't store total earnings on ride entity directly
            // Adjust based on your actual Ride entity structure
            let total = 0;
            if (ride.status === 'COMPLETED') {
                // If backend provides it, use it. Otherwise 0 or estimate.
                // Assuming backend Ride entity might not have totalEarnings field populated sum
            }
            
            return {
                id: ride.id,
                pickupLocation: ride.pickupLocation, // It's a string in DB
                dropLocation: ride.dropLocation,     // It's a string in DB
                passengerCount: ride.passengers ? ride.passengers.length : 0,
                distance: ride.distanceInKm || "5.0",
                farePerPassenger: "100", // Default or calculate
                totalEarnings: ride.passengers?.reduce((sum, p) => sum + (p.fareAmount || 0), 0) || 0,
                completedAt: ride.completedAt ? new Date(ride.completedAt).toLocaleString() : "N/A",
                status: ride.status
            };
        });
        
        // Filter for completed rides only for history tab
        setRideHistory(historyData.filter(r => r.status === 'COMPLETED').reverse());
      } catch (err) {
        console.error("Error fetching ride history:", err);
      }
    };

    fetchRideHistory();
    // Refresh history occasionally
    const interval = setInterval(fetchRideHistory, 30000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleDropPassenger = async (passengerId) => {
    setLoading(true);
    setProcessingPayment(passengerId);
    try {
      console.log("🔵 Dropping passenger (Driver side):", passengerId);
      
      // Drop the passenger first
      const res = await rideAPI.dropPassenger(passengerId);
      console.log("✅ Drop response:", res.data);
      
      // USE API RESPONSE DATA
      const droppedPassenger = res.data.passenger;
      
      if (droppedPassenger) {
        const storedFare = passengerFares[passengerId];
        const fareToUse = storedFare?.fare || droppedPassenger.fareAmount || res.data.fareAmount || 100;
        
        console.log("💰 Payment pending from Rider. Fare: ₹" + fareToUse);
        
        // We update session earnings visually, assuming rider WILL pay
        setSessionEarnings(prev => prev + parseFloat(fareToUse));
        
        setSuccess(`✅ Passenger dropped! Notification sent to rider for payment of ₹${parseFloat(fareToUse).toFixed(2)}`);
        
        // Show QR Code for payment
        setQrAmount(fareToUse);
        setShowQRModal(true);

        setProcessingPayment(null);
        fetchPassengers(); 
        
        // We don't initiate payment here anymore. 
        // The Rider will see "Proceed to Payment" on their screen.
        // Once they pay, the backend will update the payment records.
      } else {
         console.error("Dropped passenger data missing in response");
         setError("Passenger dropped but data missing");
         setProcessingPayment(null);
         fetchPassengers();
      }
    } catch (err) {
      console.error("Failed to drop passenger:", err);
      setError("Failed to drop passenger: " + (err.response?.data?.message || err.message));
      setProcessingPayment(null);
      fetchPassengers(); 
    } finally {
      setLoading(false);
    }
  };



  const fetchCurrentRide = async () => {
    if (!currentRide?.id) return;
    try {
      const response = await rideAPI.getRideById(currentRide.id);
      if (response.data && response.data.ride) {
        // Update current ride with fresh data from backend (including availableSeats)
        setCurrentRide(prev => ({
          ...prev,
          ...response.data.ride
        }));
      }
    } catch (err) {
      console.error("Error fetching current ride:", err);
      // Optional: Handle 404 if ride was cancelled externally
      if (err.response && err.response.status === 404) {
          // Maybe set endpointNotFound? Or just ignore transient errors
      }
    }
  };

  const fetchPassengers = async () => {
    if (!currentRide?.id) return;
    try {
      const res = await rideAPI.getRidePassengers(currentRide.id);
      const allPassengers = res.data.allPassengers || [];
      console.log("📋 Passengers fetched for ride", currentRide.id, ":", {
        total: allPassengers.length,
        matched: allPassengers.filter(p => p.status === PASSENGER_STATUS.MATCHED).length,
        boarded: allPassengers.filter(p => p.status === PASSENGER_STATUS.BOARDED).length,
        dropped: allPassengers.filter(p => p.status === PASSENGER_STATUS.DROPPED).length,
        passengers: allPassengers
      });
      setPassengers(allPassengers);
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
      if (!user || !user.id) {
        setError("User not logged in properly. Please reload the page.");
        setLoading(false);
        return;
      }

      if (!pickupLocation || !dropLocation) {
        setError("Please select pickup and drop locations");
        setLoading(false);
        return;
      }

      const rideData = {
        driverId: parseInt(user.id),
        pickupLocation: pickupLocation.name,
        pickupLatitude: pickupLocation.lat,
        pickupLongitude: pickupLocation.lng,
        dropLocation: dropLocation.name,
        dropLatitude: dropLocation.lat,
        dropLongitude: dropLocation.lng,
        route: `${pickupLocation.name} → ${dropLocation.name}`,
        totalSeats: parseInt(totalSeats),
      };

      console.log("Creating ride with data:", rideData);
      console.log("User ID:", user.id, "Type:", typeof user.id);
      const res = await rideAPI.createRide(rideData);
      const ride = res.data;

      setCurrentRide(ride);
      
      // Reset state for new ride
      setIncomingRideRequest(null); // Clear any old popup
      // DON'T reset processedRequestIds - keep old request IDs so they never show again
      
      // Immediately fetch passengers after ride creation
      try {
        const passRes = await rideAPI.getRidePassengers(ride.id);
        setPassengers(passRes.data.allPassengers || []);
        console.log("Passengers fetched after ride creation:", passRes.data.allPassengers);
      } catch (err) {
        console.error("Error fetching passengers after ride creation:", err);
      }
      
      setSuccess("✅ Ride created! Waiting for riders to book...");

      // Reset form
      setTimeout(() => {
        setPickupLocation(null);
        setDropLocation(null);
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error("Error creating ride:", err);
      console.error("Backend response:", err.response?.data);
      console.error("Error details:", {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to create ride";
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRideRequest = async (popupDistance, popupFare) => {
    if (!incomingRideRequest?.id) {
      setError("No ride request to accept");
      return;
    }

    setLoading(true);
    const acceptedRequestId = incomingRideRequest.id;
    
    try {
      const distanceNum = parseFloat(popupDistance) || 5.0;
      const fareNum = parseFloat(popupFare) || 100;
      
      console.log("Accepting ride request:", acceptedRequestId);
      console.log("Popup distance (parsed):", distanceNum, "Popup fare (parsed):", fareNum);
      
      // Accept the ride request (converts RideRequest to RidePassenger)
      // Pass currentRide.id to ensure passenger is added to THIS active ride, not an old one
      const res = await rideAPI.acceptRequest(acceptedRequestId, currentRide?.id);
      
      console.log("Request accepted response:", res.data);
      
      // Store the popup distance and fare with the passenger ID for later use
      if (res.data && res.data.id) {
        const passengerId = res.data.id;
        console.log("Storing fare for passenger ID:", passengerId, {distance: distanceNum, fare: fareNum});
        
        setPassengerFares(prev => {
          const updated = {
            ...prev,
            [passengerId]: {
              distance: distanceNum,
              fare: fareNum
            }
          };
          console.log("Updated passenger fares:", updated);
          return updated;
        });
        
        // Also store the ride-level distance and fare for history
        setCurrentRideDistance(distanceNum);
        setCurrentRideFare(fareNum);
      } else {
        console.warn("Response doesn't have passenger ID:", res.data);
      }
      
      // IMPORTANT: Clear the modal FIRST, mark as processed SECOND
      setIncomingRideRequest(null);
      setProcessedRequestIds(prev => new Set([...prev, acceptedRequestId]));
      setSuccess(`✅ Ride request accepted! (Distance: ${distanceNum}km, Fare: ₹${fareNum})`);
      
      // NOTE: DO NOT change ride status to IN_PROGRESS here
      // Keep ride in WAITING status so other riders can continue to book available seats
      // Only change to IN_PROGRESS when driver clicks START RIDE button
      
      // Refresh passengers list immediately and again after a short delay to ensure update
      await fetchPassengers();
      
      // Fetch again after a short delay to catch any backend delays
      setTimeout(async () => {
        await fetchPassengers();
      }, 500);
    } catch (err) {
      console.error("Error accepting request:", err);
      setError("Failed to accept ride request");
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



  const handleCompleteRide = async () => {
    if (
      !window.confirm(
        "Complete ride? Make sure all passengers have been dropped off."
      )
    )
      return;
    setLoading(true);
    try {
      console.log("Completing ride. Passenger fares:", passengerFares);
      console.log("Current passengers:", passengers);
      console.log("Current ride distance:", currentRideDistance, "fare:", currentRideFare);
      
      // Calculate total earnings from stored passenger fares
      let actualTotalEarnings = 0;
      let rideDistance = currentRideDistance || "5.0";
      let rideFare = currentRideFare || 100;
      
      // Use stored fares for each passenger
      if (passengers.length > 0) {
        passengers.forEach(p => {
          const storedFare = passengerFares[p.id];
          console.log(`Passenger ${p.id} - stored fare:`, storedFare);
          
          if (storedFare?.fare) {
            actualTotalEarnings += parseFloat(storedFare.fare);
            // Use first passenger's distance as reference for the ride
            if (!rideDistance || rideDistance === "5.0") {
              rideDistance = storedFare.distance || "5.0";
              rideFare = storedFare.fare || 100;
            }
          } else {
            // Fallback if no stored fare
            console.log(`No stored fare for passenger ${p.id}, using ${p.fareAmount || 0}`);
            actualTotalEarnings += (p.fareAmount || 0);
          }
        });
      }
      
      console.log("Final earnings calculation:", {
        actualTotalEarnings,
        rideDistance,
        rideFare,
        passengerCount: passengers.length
      });
      
      await rideAPI.updateRideStatus(
        currentRide.id,
        RIDE_STATUS.COMPLETED
      );
      
      // Add completed ride to history (prevent duplicates)
      const completedRide = {
        id: currentRide.id,
        pickupLocation: currentRide.pickupLocation?.name || 'Unknown',
        dropLocation: currentRide.dropLocation?.name || 'Unknown',
        passengerCount: passengers.length,
        distance: rideDistance,
        farePerPassenger: rideFare,
        totalEarnings: Math.round(actualTotalEarnings),
        completedAt: new Date().toLocaleString(),
        status: 'COMPLETED'
      };
      
      console.log("Completed ride object:", completedRide);
      
      // Only add to history if not already present (prevent duplicates)
      setRideHistory(prev => {
        const rideExists = prev.some(ride => ride.id === completedRide.id);
        if (rideExists) {
          console.log("⚠️ Ride " + completedRide.id + " already in history, not adding duplicate");
          return prev;
        }
        return [completedRide, ...prev];
      });
      
      // Update earnings
      setEarnings(prev => prev + Math.round(actualTotalEarnings));
      
      setCurrentRide(null);
      setPassengers([]);
      setPassengerFares({}); // Clear stored fares for this ride
      setIncomingRideRequest(null); // Clear old popup when ride completes
      // Keep processedRequestIds so old requests never show again
      setSuccess(`🎉 Ride completed! Total earnings: ₹${Math.round(actualTotalEarnings)} (${passengers.length} passengers)`);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError("Failed to complete ride");
    } finally {
      setLoading(false);
    }
  };

  // Simulate incoming ride request (for demo)
  const handleSimulateIncomingRequest = () => {
    setIncomingRideRequest({
      id: Math.random(),
      riderName: "John Doe",
      riderRating: "4.8",
      pickupLocation: pickupLocation,
      dropLocation: dropLocation,
      availableSeats: 2,
    });
  };

  const handleMarkRead = async (id) => {
      try {
          await notificationAPI.markAsRead(id);
          setNotifications(prev => prev.filter(n => n.id !== id));
          setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
          console.error("Failed to mark read", err);
      }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navbar */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-blue-600">🚗 CoRYD - Driver Dashboard</h1>
            <div className="flex items-center gap-4">
              {/* Earnings Display */}
              <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-green-100 px-4 py-2 rounded-lg border border-green-300">
                <TrendingUp size={24} className="text-green-600" />
                <div>
                  <p className="text-xs text-gray-600 font-semibold">TODAY'S EARNINGS</p>
                  <p className="text-lg font-bold text-green-600">₹{earnings.toFixed(2)}</p>
                </div>
              </div>
              <div className="relative">
                <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-gray-600 hover:text-blue-600 focus:outline-none"
                >
                    <Bell size={24} />
                    {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                        {unreadCount}
                    </span>
                    )}
                </button>
                
                {/* Notification Dropdown */}
                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden text-left">
                    <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Notifications</h3>
                        <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700">×</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No new notifications</div>
                        ) : (
                        notifications.map(n => (
                            <div key={n.id} className="p-3 border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer" onClick={() => handleMarkRead(n.id)}>
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
                onClick={() => navigate("/driver/profile")}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600"
              >
                👤 Profile
              </button>
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

          {/* Payment & Earnings Info Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-200">
            {/* Current Ride Info */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold uppercase">Current Ride Status</p>
              <p className="text-lg font-bold text-blue-600">
                {currentRide ? "🚗 Active" : "⏸️ Waiting"}
              </p>
            </div>

            {/* Total Passengers */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-3 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold uppercase">Passengers</p>
              <p className="text-lg font-bold text-yellow-600">
                {currentRide ? passengers.length : 0}
              </p>
            </div>

            {/* Session Earnings */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold uppercase">Session Earnings</p>
              <p className="text-lg font-bold text-green-600">
                ₹{sessionEarnings.toFixed(2)}
              </p>
            </div>

            {/* Total Wallet Balance */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold uppercase">Wallet Balance</p>
              <p className="text-lg font-bold text-purple-600">
                ₹2,450
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

        {/* Incoming Ride Request Modal */}
        {incomingRideRequest && !processedRequestIds.has(incomingRideRequest?.id) && (
          <IncomingRideRequest
            ride={incomingRideRequest}
            onAccept={handleAcceptRideRequest}
            onReject={() => {
              console.log("Rejecting request:", incomingRideRequest?.id);
              // Mark as processed so we don't show it again
              setProcessedRequestIds(prev => new Set([...prev, incomingRideRequest?.id]));
              // Close the modal by clearing the state
              setIncomingRideRequest(null);
            }}
            loading={loading}
          />
        )}

        {/* Main Layout */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Create/View Rides */}
          <div className="md:col-span-1">
            {!currentRide ? (
              // Create New Ride Form
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-20">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Plus size={24} />
                  Create New Ride
                </h2>

                <form onSubmit={handleCreateRide} className="space-y-4">
                  {/* Pickup Location */}
                  <LocationPicker
                    label="Pickup Location"
                    value={pickupLocation?.name || ""}
                    onSelect={setPickupLocation}
                    required={true}
                  />

                  {/* Drop Location */}
                  <LocationPicker
                    label="Drop Location"
                    value={dropLocation?.name || ""}
                    onSelect={setDropLocation}
                    required={true}
                  />

                  {/* Total Seats */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Available Seats
                    </label>
                    <select
                      value={totalSeats}
                      onChange={(e) => setTotalSeats(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {[1, 2, 3, 4, 5].map((num) => (
                        <option key={num} value={num}>
                          {num} Seat{num > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Ride Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        Create Ride
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              // Current Ride Stats
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-20">
                {console.log("🚗 Ride Active - Passengers:", passengers.length, "| Matched:", passengers.filter((p) => p.status === PASSENGER_STATUS.MATCHED).length)}
                <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Ride Stats</h2>

                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border-l-4 border-yellow-500">
                    <p className="text-xs text-gray-600 uppercase mb-1">Waiting for Pickup</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {passengers.filter((p) => p.status === PASSENGER_STATUS.MATCHED).length}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-l-4 border-green-500">
                    <p className="text-xs text-gray-600 uppercase mb-1">In Ride</p>
                    <p className="text-3xl font-bold text-green-600">
                      {passengers.filter((p) => p.status === PASSENGER_STATUS.BOARDED).length}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-xs text-gray-600 uppercase mb-1">Total Earnings</p>
                    <p className="text-3xl font-bold text-blue-600">
                      ₹{passengers.filter((p) => p.status === PASSENGER_STATUS.DROPPED).length * 100}
                    </p>
                  </div>

                  <button
                    onClick={() => setCurrentRide(null)}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Create Another Ride
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Active Ride / Ride History */}
          <div className="md:col-span-2">
            {/* Tab Navigation */}
            <div className="flex gap-4 mb-6 border-b border-gray-300">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-3 font-semibold transition ${
                  activeTab === 'active'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                🚗 Active Ride
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-3 font-semibold transition ${
                  activeTab === 'history'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📋 Ride History ({rideHistory.length})
              </button>
            </div>

            {/* Active Ride Tab */}
            {activeTab === 'active' && (
              <>
                {currentRide ? (
                  <>
                    <ActiveDriverRideCard
                      ride={currentRide}
                      passengers={passengers}
                      onBoardPassenger={handleBoardPassenger}
                      onDropPassenger={handleDropPassenger}
                      onCompleteRide={handleCompleteRide}
                      loading={loading}
                      processingPayment={processingPayment}
                    />

                    {/* Demo: Simulate Incoming Request */}
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-yellow-800 mb-2">🧪 Demo Controls</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSimulateIncomingRequest}
                          className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 text-sm"
                        >
                          📨 Simulate Rider Request
                        </button>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <div className={`w-2 h-2 rounded-full ${currentRide && !endpointNotFound ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          Polling: {currentRide && !endpointNotFound ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                    <div className="text-6xl mb-4">🚗</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No Active Ride</h2>
                    <p className="text-gray-600">Create a new ride to start earning!</p>
                  </div>
                )}
              </>
            )}

            {/* Ride History Tab */}
            {activeTab === 'history' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Ride History</h2>
                
                {rideHistory.length > 0 ? (
                  <div className="space-y-4">
                    {rideHistory.map((ride, index) => (
                      <div
                        key={ride.id || index}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-600">📍 {ride.pickupLocation}</p>
                            <p className="text-sm font-semibold text-gray-600">📍 {ride.dropLocation}</p>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            {ride.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 text-center border-t pt-3">
                          <div>
                            <p className="text-xs text-gray-500 uppercase mb-1">Passengers</p>
                            <p className="text-lg font-bold text-gray-800">{ride.passengerCount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase mb-1">Distance</p>
                            <p className="text-lg font-bold text-blue-600">{ride.distance} km</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase mb-1">Fare/Person</p>
                            <p className="text-lg font-bold text-orange-600">₹{ride.farePerPassenger}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase mb-1">Total Earnings</p>
                            <p className="text-lg font-bold text-green-600">₹{ride.totalEarnings}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 text-center mt-2">
                          {ride.completedAt}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-xl text-gray-500">No completed rides yet</p>
                    <p className="text-sm text-gray-400 mt-2">Complete rides to see them in your history</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      
      {/* Payment QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Receive Payment</h3>
              <button 
                onClick={() => setShowQRModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            
            <div className="text-center">
              <p className="text-gray-600 mb-2">Show this QR code to the passenger</p>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 inline-block mb-4">
                <img 
                  src="/payment-qr.jpg" 
                  alt="Payment QR" 
                  className="w-48 h-48 object-contain mix-blend-multiply"
                />
              </div>
              
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl font-bold text-lg mb-6">
                Collect ₹{parseFloat(qrAmount).toFixed(2)}
              </div>
              
              <button
                onClick={() => setShowQRModal(false)}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition shadow-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
