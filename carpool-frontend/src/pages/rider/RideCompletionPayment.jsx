import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { rideAPI, paymentAPI } from "../../api/axiosAPI";
import { initiatePayment, convertToPaise } from "../../utils/razorpayUtils";
import { MapPin, Clock, Users, DollarSign, ChevronRight, Star } from "lucide-react";

export default function RideCompletionPayment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rideDetails, setRideDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  /* Rating State */
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Get ride ID from navigation state or URL params
  const rideId = location.state?.rideId || new URLSearchParams(location.search).get("rideId");

  useEffect(() => {
    if (rideId) {
      fetchRideDetails();
    }
  }, [rideId]);

  const fetchRideDetails = async () => {
    setLoading(true);
    try {
      const res = await rideAPI.getRideById(rideId);
      setRideDetails(res.data.ride);
      console.log("Ride details fetched:", res.data);
    } catch (err) {
      setError("Failed to load ride details. Please try again.");
      console.error("Error fetching ride:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!rideDetails) return;

    setPaymentProcessing(true);
    try {
      console.log("Find booking matching User ID:", user?.id);
      console.log("Passengers:", rideDetails.passengers);
      
      const myBooking = rideDetails.passengers?.find(p => String(p.riderId) === String(user?.id));
      // Prioritize passenger specific fare: 'fareAmount' is the field in Java entity
      const payFare = parseFloat(myBooking?.fareAmount || myBooking?.fare || rideDetails.fareAmount || rideDetails.estimatedFare || 0);

      const fareAmount = payFare;
      if (fareAmount <= 0) {
        setError("Invalid fare amount");
        setPaymentProcessing(false);
        return;
      }

      console.log("Initiating payment for amount:", fareAmount);
      
      const pickup = myBooking?.boardingLocation || myBooking?.pickupLocation || rideDetails.pickupLocation;
      const drop = myBooking?.dropLocation || rideDetails.dropLocation;
      
        // Initiate Razorpay payment
      const paymentResult = await initiatePayment({
        amount: convertToPaise(fareAmount),
        description: `Ride Payment - ${pickup} to ${drop}`,
        rideId: rideId,
      });

      if (paymentResult?.success) {
        // Payment successful
        try {
          // Update payment status in backend
          await paymentAPI.updatePaymentStatus({
            rideId: rideId,
            status: "COMPLETED",
            amount: fareAmount,
            paymentId: paymentResult.paymentId,
          });

          setSuccess("✅ Payment completed successfully! Please rate now.");
          
          // Show Rating Modal after 1.5 seconds
          setTimeout(() => {
            setShowRatingModal(true);
          }, 1500);
        } catch (err) {
          console.error("Error updating payment status:", err);
          setError("Payment completed but failed to update status. Please contact support.");
        }
      } else {
        setError("Payment cancelled or failed. Please try again.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError("Failed to process payment. Please try again.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full"></div>
          </div>
          <p className="mt-4 text-gray-600 font-semibold">Loading ride details...</p>
        </div>
      </div>
    );
  }

  if (!rideDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ride Not Found</h2>
          <p className="text-gray-600 mb-6">We couldn't find the ride details.</p>
          <button
            onClick={() => navigate("/rider/dashboard")}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Find my specific booking details
  const myBooking = rideDetails.passengers?.find(p => String(p.riderId) === String(user?.id));

  // RidePassenger uses 'boardingLocation', Ride uses 'pickupLocation'
  const displayPickup = myBooking?.boardingLocation || myBooking?.pickupLocation || rideDetails.pickupLocation || "Unknown";
  const displayDrop = myBooking?.dropLocation || rideDetails.dropLocation || "Unknown";
  // Passenger uses 'distanceInKm' and 'fareAmount'
  const distance = myBooking?.distanceInKm || myBooking?.distance || rideDetails.distanceInKm || 0;
  
  let fare = parseFloat(myBooking?.fareAmount || myBooking?.fare || rideDetails.fareAmount || rideDetails.estimatedFare || 0);

  // If backend fare is 0 but distance is present, calculate it manually (Fallback)
  if (fare === 0 && distance > 0) {
      fare = 30 + (distance * 10);
  }
  const driverName = rideDetails.driverName || "Driver";
  const driverRating = rideDetails.driverRating || 4.5;
  const vehicleInfo = `${rideDetails.vehicleColor} ${rideDetails.vehicleType}` || "Car";
  const duration = rideDetails.duration || "25 mins";



  /* Submit Rating */
  const handleSubmitRating = async () => {
    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }
    setLoading(true);
    try {
      await paymentAPI.submitRating({
        rideId: rideId,
        fromUserId: user?.id,
        toUserId: rideDetails.driverId || 0,
        type: "RIDER_TO_DRIVER",
        stars: rating,
        comment: review
      });
      setSuccess("✅ Thank you for your feedback!");
      setTimeout(() => navigate("/rider/dashboard"), 1500);
    } catch (err) {
       console.error("Rating error", err);
       // Navigate anyway if rating fails, not critical
       navigate("/rider/dashboard");
    } finally {
      setLoading(false);
    }
  };

  /* Render Rating View */
  if (showRatingModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
           <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <Star size={40} className="text-yellow-500 fill-yellow-500" />
           </div>
           
           <h2 className="text-2xl font-bold text-gray-800 mb-2">Rate your Driver</h2>
           <p className="text-gray-500 mb-6">How was your ride with {driverName}?</p>
           
           <div className="flex justify-center gap-2 mb-6">
             {[1, 2, 3, 4, 5].map((star) => (
               <button 
                 key={star}
                 onClick={() => setRating(star)}
                 className={`transition-transform hover:scale-110 focus:outline-none ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
               >
                 <Star size={36} fill={rating >= star ? "currentColor" : "none"} />
               </button>
             ))}
           </div>
           
           <textarea
             className="w-full p-3 border border-gray-200 rounded-lg mb-6 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
             rows="3"
             placeholder="Additional comments (optional)..."
             value={review}
             onChange={(e) => setReview(e.target.value)}
           ></textarea>
           
           <button
             onClick={handleSubmitRating}
             disabled={loading}
             className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition"
           >
             {loading ? "Submitting..." : "Submit Rating"}
           </button>
           
           <button
             onClick={() => navigate("/rider/dashboard")}
             className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 font-semibold"
           >
             Skip
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-6">
          <div className="inline-block mb-4 text-5xl animate-bounce">✅</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Ride Completed!</h1>
          <p className="text-gray-600">Please pay & rate your driver to finish.</p>
        </div>

        {/* Error & Success Messages */}
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

        {/* Driver Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Driver Details</h2>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {driverName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-800">{driverName}</p>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">⭐</span>
                  <span className="text-sm text-gray-600">{driverRating}/5.0</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Vehicle</p>
              <p className="font-semibold text-gray-800 text-sm">{vehicleInfo}</p>
            </div>
          </div>
        </div>

        {/* Ride Summary */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Trip Summary</h2>

          {/* Pickup Location */}
          <div className="flex gap-3 mb-4">
            <MapPin size={20} className="text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase font-semibold">Pickup Location</p>
              <p className="text-sm font-semibold text-gray-800">{displayPickup}</p>
            </div>
          </div>

          {/* Drop Location */}
          <div className="flex gap-3 mb-6">
            <MapPin size={20} className="text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase font-semibold">Drop Location</p>
              <p className="text-sm font-semibold text-gray-800">{displayDrop}</p>
            </div>
          </div>

          {/* Trip Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Duration</p>
                <p className="font-bold text-gray-800">{duration}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users size={18} className="text-purple-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Distance</p>
                <p className="font-bold text-gray-800">{distance.toFixed(1)} km</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fare Breakdown */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Fare Details</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-600">Base Fare</span>
              <span className="font-semibold text-gray-800">₹30</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-600">Distance Charges ({distance.toFixed(1)} km)</span>
              <span className="font-semibold text-gray-800">₹{(distance * 10).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 bg-green-50 p-3 rounded-lg">
              <span className="font-bold text-gray-800">Total Amount</span>
              <span className="text-2xl font-bold text-green-600">₹{fare.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Options */}
        <div className="space-y-3 mb-6">
            {!showQR ? (
                <>
                <button
                  onClick={handlePayment}
                  disabled={paymentProcessing}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {paymentProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <DollarSign size={22} />
                      Pay ₹{fare.toFixed(2)} with Razorpay
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">OR</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <button
                  onClick={() => setShowQR(true)}
                  disabled={paymentProcessing}
                  className="w-full px-6 py-4 bg-white border-2 border-blue-500 text-blue-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition flex items-center justify-center gap-2"
                >
                  <img src="/payment-qr.jpg" className="w-6 h-6 object-cover rounded" alt="QR" onError={(e) => {e.target.style.display = 'none';}} />
                   Pay via UPI QR Code
                </button>
                </>
            ) : (
                <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-blue-500 text-center animate-in fade-in zoom-in duration-300">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Scan to Pay ₹{fare.toFixed(2)}</h3>
                    
                    <div className="bg-gray-100 p-4 rounded-lg inline-block mb-4">
                         <img 
                            src="/payment-qr.jpg" 
                            alt="Payment QR Code" 
                            className="w-48 h-48 object-contain mx-auto"
                         />
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-6">
                        Scan with GPay, PhonePe, or Paytm.<br/>
                        Click 'Done' after payment is successful.
                    </p>
                    
                    <div className="flex gap-3">
                        <button
                          onClick={() => setShowQR(false)}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-800 rounded-lg font-bold hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                              // Fast track for QR
                              setSuccess("✅ Payment marked as completed! Please rate now.");
                              setTimeout(() => setShowRatingModal(true), 1500); 
                          }}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                        >
                          Done
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate("/rider/dashboard")}
          disabled={paymentProcessing}
          className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Back to Dashboard
        </button>

        {/* Trust Message */}
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>🔒 Your payment is secure and encrypted</p>
          <p className="mt-2">Powered by Razorpay</p>
        </div>
      </div>
    </div>
  );
}
