import { MapPin, Clock, Users, DollarSign, AlertCircle, Loader } from "lucide-react";

export default function RiderActiveRideStatus({ ride, passenger, onProceedToPayment, loading }) {
  const calculateDistance = (pLat, pLng, dLat, dLng) => {
    if (!pLat || !pLng || !dLat || !dLng) return "0.0";
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
    return (R * c).toFixed(1);
  };

  const distance = calculateDistance(
      ride?.pickupLatitude, ride?.pickupLongitude,
      ride?.dropLatitude, ride?.dropLongitude
  );
  const fare = (30 + parseFloat(distance) * 10).toFixed(0);

  const getStatusDisplay = () => {
    switch (passenger?.status) {
      case "MATCHED":
        return {
          icon: "🟡",
          title: "Ride Confirmed!",
          description: "Driver is heading to pickup location",
          color: "yellow",
        };
      case "BOARDED":
        return {
          icon: "🟢",
          title: "On Your Way!",
          description: "You are in the ride, heading to destination",
          color: "green",
        };
      case "DROPPED":
        return {
          icon: "✅",
          title: "Ride Completed!",
          description: "You have reached your destination",
          color: "green",
        };
      default:
        return {
          icon: "⏳",
          title: "Processing...",
          description: "Getting ride details",
          color: "blue",
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className={`bg-gradient-to-br from-${statusDisplay.color}-50 to-${statusDisplay.color}-100 rounded-xl shadow-lg p-6 border-2 border-${statusDisplay.color}-200`}>
        <div className="flex items-center gap-4 mb-6">
          <div className="text-4xl animate-pulse">{statusDisplay.icon}</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800">{statusDisplay.title}</h2>
            <p className="text-gray-600">{statusDisplay.description}</p>
          </div>
        </div>

        {/* Driver Info */}
        {passenger?.status !== "DROPPED" && (
          <div className="bg-white rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {ride?.driverName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{ride?.driverName}</p>
                <p className="text-sm text-gray-600">Your Driver</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">
                {ride?.vehiclePlate || "Vehicle Info"}
              </p>
              <p className="text-xs text-gray-600">{ride?.vehicleModel || "N/A"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Journey Timeline */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Journey Details</h3>

        {/* FROM and TO Display */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg mb-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 uppercase font-semibold mb-1">From</p>
              <p className="text-lg font-bold text-gray-800">📍 {ride?.pickupLocation || ride?.pickup || "Pickup Location"}</p>
            </div>
            <div className="px-4 text-gray-400">→</div>
            <div className="flex-1 text-right">
              <p className="text-xs text-gray-600 uppercase font-semibold mb-1">To</p>
              <p className="text-lg font-bold text-gray-800">{ride?.dropLocation || ride?.drop || "Drop Location"} 📍</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4 mb-6">
          {/* Pickup */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-green-600 rounded-full"></div>
              <div className="w-1 h-12 bg-gray-300 mt-2"></div>
            </div>
            <div className="pb-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">Pickup Location</p>
              <p className="font-semibold text-gray-800 text-lg">{ride?.pickupLocation || "Unknown"}</p>
              <p className="text-sm text-gray-600">
                {passenger?.status === "MATCHED" ? "Driver is on the way" : "Picked up"}
              </p>
            </div>
          </div>

          {/* Drop */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full ${passenger?.status === "DROPPED" ? "bg-red-600" : "bg-gray-400"}`}></div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Drop Location</p>
              <p className="font-semibold text-gray-800 text-lg">{ride?.dropLocation || "Unknown"}</p>
              <p className="text-sm text-gray-600">
                {passenger?.status === "DROPPED" ? "You have arrived" : "Heading here"}
              </p>
            </div>
          </div>
        </div>

        {/* Trip Summary */}
        <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Distance</p>
            <p className="text-xl font-bold text-gray-800">{distance} km</p>
          </div>
          <div className="text-center border-l border-r border-gray-300">
            <p className="text-xs text-gray-500 uppercase mb-1">Trip Fare</p>
            <p className="text-xl font-bold text-green-600">₹{fare}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
            <p className="text-lg font-bold text-blue-600">{passenger?.status}</p>
          </div>
        </div>
      </div>

      {/* Payment Prompt */}
      {passenger?.status === "DROPPED" && (
        <div className="bg-green-50 border-l-4 border-green-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-green-800 mb-2">Ride Completed Successfully!</p>
              <p className="text-sm text-green-700 mb-4">
                Please proceed to payment to complete your ride.
              </p>
              <button
                onClick={onProceedToPayment}
                disabled={loading}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign size={20} />
                    Proceed to Payment (₹{fare})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Button - Show for MATCHED status */}
      {passenger?.status === "MATCHED" && (
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-blue-800 mb-2">Driver is on the way!</p>
              <p className="text-sm text-blue-700 mb-4">
                Driver will arrive soon. Get ready at your pickup location.
              </p>
              <button
                onClick={() => alert("Please wait for the driver to confirm your boarding.")}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                ✓ I'm ready to board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
