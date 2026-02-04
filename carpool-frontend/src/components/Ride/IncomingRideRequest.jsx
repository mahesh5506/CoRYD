import { MapPin, Users, DollarSign, Clock, Phone, Star } from "lucide-react";

export default function IncomingRideRequest({ ride, onAccept, onReject, loading }) {
  // Use the same robust calculation as rider side's available rides
  const calculateDistanceFromRide = () => {
    if (!ride) {
      console.log("calculateDistance: no ride object");
      return "5.0";
    }
    
    console.log("Full ride object received:", ride);
    console.log("Checking for coordinates:", {
      pickupLatitude: ride.pickupLatitude,
      pickupLongitude: ride.pickupLongitude,
      dropLatitude: ride.dropLatitude,
      dropLongitude: ride.dropLongitude,
      pickupLocation: ride.pickupLocation,
      dropLocation: ride.dropLocation
    });
    
    // Format 1: pickupLatitude, pickupLongitude, dropLatitude, dropLongitude (direct fields)
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
      console.log("Distance calculated (Format 1 - direct fields):", distance);
      return distance > 0 ? distance : "5.0";
    }
    
    // Format 2: pickupLocation.lat, dropLocation.lat (nested objects)
    if (ride.pickupLocation?.lat !== undefined && ride.dropLocation?.lat !== undefined) {
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
      console.log("Distance calculated (Format 2 - nested objects):", distance);
      return distance > 0 ? distance : "5.0";
    }
    
    // Format 3: Check if ride object has pickup/drop as strings with stored coordinates
    console.log("Checking for stored ride coordinates in other fields...");
    
    // If no coordinates found anywhere, return default
    console.log("No coordinates found anywhere, returning default 5.0");
    return "5.0";
  };

  // Use the provided distance/fare from the request if available (sent by Rider)
  // Otherwise fallback to calculation
  const distance = ride?.distance || ride?.roadDistance || calculateDistanceFromRide();
  const estimatedFare = ride?.fare || (30 + parseFloat(distance) * 10).toFixed(0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-bounce">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">🚗 New Ride Request!</h2>
          <div className="h-1 w-12 bg-blue-600 rounded"></div>
        </div>

        {/* Rider Info */}
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {ride?.riderName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{ride?.riderName}</p>
                <div className="flex items-center gap-1">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-gray-600">{ride?.riderRating || "N/A"}</span>
                </div>
              </div>
            </div>
            <Phone size={18} className="text-blue-600 cursor-pointer hover:text-blue-800" />
          </div>
        </div>

        {/* Route Details */}
        <div className="space-y-3 mb-6">
          <div className="flex gap-3">
            <MapPin size={20} className="text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase">Pickup</p>
              <p className="text-sm font-semibold text-gray-800">{ride?.pickupLocation?.name || ride?.pickupLocation}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <MapPin size={20} className="text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase">Drop</p>
              <p className="text-sm font-semibold text-gray-800">{ride?.dropLocation?.name || ride?.dropLocation}</p>
            </div>
          </div>
        </div>

        {/* Fare & Distance */}
        <div className="grid grid-cols-3 gap-3 mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Distance</p>
            <p className="text-lg font-bold text-gray-800">{distance} km</p>
          </div>
          <div className="text-center border-l border-r border-gray-200">
            <p className="text-xs text-gray-500 uppercase mb-1">Est. Fare</p>
            <p className="text-lg font-bold text-green-600">₹{estimatedFare}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Seats Req.</p>
            <p className="text-lg font-bold text-blue-600">{ride?.seatsRequested || 1}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              console.log("Decline button clicked");
              onReject();
            }}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 transition"
          >
            Decline
          </button>
          <button
            onClick={() => {
              console.log("Accept button clicked with distance:", distance, "fare:", estimatedFare);
              onAccept(distance, estimatedFare);
            }}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading ? "Accepting..." : "✓ Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
