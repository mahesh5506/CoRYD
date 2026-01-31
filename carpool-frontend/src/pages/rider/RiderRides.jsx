import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { rideAPI } from "../../api/axiosAPI";
import { Link, useNavigate } from "react-router-dom";
import Loader from "../../components/Common/Loader";
import ErrorMessage from "../../components/Common/ErrorMessage";
import { ArrowLeft, MapPin, Calendar, User, CheckCircle, Clock, XCircle } from "lucide-react";

export default function RiderRides() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    if (!user) return;

    const fetchRides = async () => {
      try {
        setLoading(true);
        // Switch to Ride History to show user's own rides
        const res = await rideAPI.getRideHistory(user.id);
        const historyData = res.data?.history || [];
        setRides(historyData);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch rides");
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, [user]);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  const filteredRides =
    filterStatus === "ALL"
      ? rides
      : rides.filter((r) => {
          if (filterStatus === "COMPLETED") {
             return r.status === "COMPLETED" || r.status === "DROPPED";
          }
          if (filterStatus === "ACTIVE") {
             return r.status === "MATCHED" || r.status === "BOARDED" || r.status === "IN_PROGRESS";
          }
          return r.status === filterStatus;
      });

  const getStatusColor = (status) => {
    switch (status) {
      case "MATCHED":
      case "BOARDED":
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "COMPLETED":
      case "DROPPED":
        return "bg-green-100 text-green-800 border-green-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "COMPLETED":
      case "DROPPED":
        return <CheckCircle size={16} />;
      case "CANCELLED":
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate("/rider/dashboard")}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-700"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Your Ride History</h1>
            <p className="text-gray-500">View your past and upcoming trips</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-xl shadow-sm border border-gray-100 w-fit">
          {["ALL", "ACTIVE", "COMPLETED", "CANCELLED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                filterStatus === status
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-transparent text-gray-600 hover:bg-gray-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Ride List */}
        <div className="space-y-4">
          {filteredRides.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock size={32} className="text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-600">No rides found</p>
              <p className="text-gray-400 text-sm mt-1">
                {filterStatus === "ALL" 
                  ? "You haven't booked any rides yet." 
                  : `No ${filterStatus.toLowerCase()} rides found.`}
              </p>
            </div>
          ) : (
            filteredRides.map((ride) => (
              <div
                key={ride.id}
                className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 transform hover:-translate-y-1"
              >
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    
                    {/* Role & Date */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${getStatusColor(ride.status)}`}>
                          {getStatusIcon(ride.status)}
                          {ride.status}
                        </span>
                        <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                          <Calendar size={12} />
                          {ride.completedAt || "Date not available"}
                        </span>
                      </div>

                      {/* Locations */}
                      <div className="space-y-4 relative pl-4 border-l-2 border-indigo-100 ml-1">
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm" />
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Pickup</p>
                          <p className="text-gray-800 font-bold text-lg leading-tight">{ride.pickupLocation}</p>
                        </div>
                        <div className="relative">
                           <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm" />
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Drop</p>
                          <p className="text-gray-800 font-bold text-lg leading-tight">{ride.dropLocation}</p>
                        </div>
                      </div>
                    </div>

                    {/* Driver & Details */}
                    <div className="flex flex-col justify-between items-end min-w-[150px] border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                      <div className="text-right">
                         <div className="flex items-center justify-end gap-2 mb-1">
                            <span className="text-sm text-gray-500">Driver</span>
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                              {ride.driverName ? ride.driverName.charAt(0).toUpperCase() : "D"}
                            </div>
                         </div>
                         <p className="font-bold text-gray-800">{ride.driverName || "Unknown"}</p>
                      </div>

                      <div className="mt-4 w-full"> 
                         <div className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                            <span>Total Seats</span>
                             <span className="font-bold">{ride.totalSeats}</span>
                         </div>
                      </div>
                    </div>
                  </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
