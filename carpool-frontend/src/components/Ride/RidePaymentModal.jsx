import { DollarSign, MapPin, Clock, CreditCard, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function RidePaymentModal({ ride, passenger, totalFare, onPaymentComplete, loading }) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("card");

  const distance = ((30 + parseFloat(totalFare - 30) / 10).toFixed(1));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-8 text-white">
          <div className="flex items-center justify-center gap-3 mb-2">
            <CheckCircle size={32} />
            <h2 className="text-2xl font-bold">Trip Completed!</h2>
          </div>
          <p className="text-center text-green-100">Let's settle the payment</p>
        </div>

        <div className="p-6">
          {/* Trip Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-gray-800 mb-3">Trip Summary</h3>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <MapPin size={18} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase">From</p>
                    <p className="font-semibold text-gray-800">{ride?.pickupLocation?.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <MapPin size={18} className="text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase">To</p>
                    <p className="font-semibold text-gray-800">{ride?.dropLocation?.name}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Distance</span>
                <span className="font-semibold text-gray-800">~{distance} km</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Driver</span>
                <span className="font-semibold text-gray-800">{ride?.driverName}</span>
              </div>
            </div>
          </div>

          {/* Fare Breakdown */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-gray-800 mb-3">Fare Breakdown</h3>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Fare</span>
                <span className="text-gray-800">₹30</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Distance Charge ({distance} km)</span>
                <span className="text-gray-800">₹{(parseFloat(distance) * 10).toFixed(0)}</span>
              </div>
            </div>

            <div className="border-t border-blue-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800">Total Amount</span>
                <span className="text-2xl font-bold text-green-600">₹{totalFare}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3">Payment Method</h3>

            <div className="space-y-2">
              {[
                { id: "card", label: "💳 Credit/Debit Card", icon: CreditCard },
                { id: "wallet", label: "💰 Digital Wallet", icon: DollarSign },
                { id: "upi", label: "📱 UPI", icon: DollarSign },
              ].map((method) => (
                <label key={method.id} className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition" style={{
                  borderColor: selectedPaymentMethod === method.id ? "#059669" : "#e5e7eb",
                  backgroundColor: selectedPaymentMethod === method.id ? "#ecfdf5" : "#ffffff",
                }}>
                  <input
                    type="radio"
                    name="payment"
                    value={method.id}
                    checked={selectedPaymentMethod === method.id}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="ml-3 font-semibold text-gray-800">{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onPaymentComplete(selectedPaymentMethod, totalFare)}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? "Processing..." : `Pay ₹${totalFare}`}
            </button>
          </div>

          {/* Security Note */}
          <p className="text-xs text-gray-500 text-center mt-4">
            🔒 Your payment is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
