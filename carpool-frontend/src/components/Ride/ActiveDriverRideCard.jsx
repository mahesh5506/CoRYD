import { MapPin, Clock, Users, DollarSign, CheckCircle, Truck } from "lucide-react";

export default function ActiveDriverRideCard({ ride, passengers, onBoardPassenger, onDropPassenger, onCompleteRide, loading, processingPayment }) {
  const matchedPassengers = passengers.filter(p => p.status === "MATCHED");
  const boardedPassengers = passengers.filter(p => p.status === "BOARDED");
  const droppedPassengers = passengers.filter(p => p.status === "DROPPED");

  console.log("🎯 ActiveDriverRideCard - Passengers breakdown:", {
    total: passengers.length,
    matched: matchedPassengers.length,
    boarded: boardedPassengers.length,
    dropped: droppedPassengers.length,
    allPassengers: passengers.map(p => ({id: p.id, status: p.status, name: p.riderName}))
  });

  const calculateDistance = (pickup, drop) => {
    if (!pickup || !drop) return 0;
    const R = 6371;
    const dLat = ((drop.lat - pickup.lat) * Math.PI) / 180;
    const dLon = ((drop.lng - pickup.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pickup.lat * Math.PI) / 180) *
        Math.cos((drop.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 mb-4 border-2 border-blue-200">
      {/* Route Header */}
      <div className="mb-6 pb-4 border-b-2 border-blue-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Truck size={24} className="text-blue-600" />
              <h3 className="text-xl font-bold text-gray-800">Active Ride</h3>
            </div>
            <p className="text-sm text-gray-600">Status: <span className="font-semibold text-green-600">🟢 IN PROGRESS</span></p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">₹{ride?.totalEarnings || 0}</p>
            <p className="text-xs text-gray-600">Total earnings</p>
          </div>
        </div>

        {/* Route Details */}
        <div className="space-y-2">
          <div className="flex gap-3">
            <MapPin size={18} className="text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase">From</p>
              <p className="font-semibold text-gray-800">{ride?.pickupLocation?.name || ride?.pickupLocation || "Unknown"}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <MapPin size={18} className="text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase">To</p>
              <p className="font-semibold text-gray-800">{ride?.dropLocation?.name || ride?.dropLocation || "Unknown"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Passenger Sections */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Matched Passengers */}
        <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-400">
          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-yellow-100 text-yellow-600 rounded-full w-6 h-6 flex items-center justify-center text-sm">
              {matchedPassengers.length}
            </span>
            Waiting for Pickup
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {matchedPassengers.length > 0 ? (
              matchedPassengers.map((passenger) => (
                <div key={passenger.id} className="bg-yellow-50 rounded p-3 border border-yellow-200">
                  <p className="font-semibold text-gray-800 text-sm">{passenger.riderName}</p>
                  <p className="text-xs text-gray-600 mb-2">{passenger.boardingLocation}</p>
                  <button
                    onClick={() => onBoardPassenger(passenger.id)}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-yellow-500 text-white rounded font-semibold text-sm hover:bg-yellow-600 disabled:opacity-50 transition"
                  >
                    Board Passenger
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic">No passengers waiting</p>
            )}
          </div>
        </div>

        {/* Boarded Passengers */}
        <div className="bg-white rounded-lg p-4 border-l-4 border-green-400">
          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-sm">
              {boardedPassengers.length}
            </span>
            In Ride
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {boardedPassengers.length > 0 ? (
              boardedPassengers.map((passenger) => (
                <div key={passenger.id} className="bg-green-50 rounded p-3 border border-green-200">
                  <p className="font-semibold text-gray-800 text-sm">{passenger.riderName}</p>
                  <p className="text-xs text-gray-600 mb-2">{passenger.dropLocation}</p>
                  <button
                    onClick={() => onDropPassenger(passenger.id)}
                    disabled={loading || processingPayment === passenger.id}
                    className={`w-full px-3 py-2 rounded font-semibold text-sm transition ${processingPayment === passenger.id ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600 disabled:opacity-50'}`}
                  >
                    {processingPayment === passenger.id ? '💳 Processing...' : 'Drop Off Passenger'}
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic">No passengers boarded yet</p>
            )}
          </div>
        </div>

        {/* Dropped Passengers */}
        <div className="bg-white rounded-lg p-4 border-l-4 border-gray-400">
          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-gray-100 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-sm">
              {droppedPassengers.length}
            </span>
            Completed
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {droppedPassengers.length > 0 ? (
              droppedPassengers.map((passenger) => (
                <div key={passenger.id} className="bg-gray-50 rounded p-3 border border-gray-200">
                  <p className="font-semibold text-gray-800 text-sm">{passenger.riderName}</p>
                  <p className="text-xs text-gray-600 mb-1">✓ Dropped off</p>
                  <p className="text-xs font-semibold text-green-600">Earned: ₹{passenger.fareAmount}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic">No completed rides yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Complete Ride Button */}
      {boardedPassengers.length === 0 && matchedPassengers.length === 0 && droppedPassengers.length > 0 && (
        <button
          onClick={onCompleteRide}
          disabled={loading}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          <CheckCircle size={24} />
          End Ride & Collect Payment
        </button>
      )}
    </div>
  );
}
