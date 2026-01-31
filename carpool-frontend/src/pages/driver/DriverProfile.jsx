import React, { useEffect, useState } from "react";
import { additionalUserAPI } from "../../api/axiosAPI";
import Loader from "../../components/Common/Loader";
import ErrorMessage from "../../components/Common/ErrorMessage";
import { User, Mail, Phone, Car, Calendar, Star, LogOut, ShieldCheck, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DriverProfile() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await additionalUserAPI.getUser(user.id);
        setProfile(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user.id]);

  const handleLogout = () => {
      localStorage.clear();
      window.location.href = "/login";
  };

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;
  if (!profile) return <p className="text-center text-gray-500 mt-10">Profile not found</p>;

  // Default rating if null (for new drivers)
  const rating = profile.rating || 0;
  const ratingCount = profile.ratingCount || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex justify-center py-10">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-blue-600 px-6 py-8 text-center relative">
            <div className="absolute top-4 left-4 bg-blue-500 p-2 rounded-full cursor-pointer hover:bg-blue-400 transition" onClick={() => navigate("/driver/dashboard")} title="Back to Dashboard">
                <ArrowLeft size={20} className="text-white" />
            </div>

            <div className="absolute top-4 right-4 bg-blue-500 p-2 rounded-full cursor-pointer hover:bg-blue-400 transition" onClick={handleLogout} title="Logout">
                <LogOut size={20} className="text-white" />
            </div>

            <div className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center text-4xl shadow-lg border-4 border-blue-200 mb-4">
               {profile.name ? profile.name.charAt(0).toUpperCase() : "D"}
            </div>
            
            <h2 className="text-2xl font-bold text-white tracking-wide">{profile.name}</h2>
            <div className="flex items-center justify-center gap-2 mt-1 text-blue-100 bg-blue-700/50 inline-block px-4 py-1 rounded-full mx-auto">
               <ShieldCheck size={16} />
               <span className="text-sm font-medium uppercase tracking-wider">{profile.role || "Driver"}</span>
            </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 border-b border-gray-100">
             <div className="p-6 text-center border-r border-gray-100 hover:bg-gray-50 transition">
                <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                    <Star size={24} fill="currentColor" />
                    <span className="text-2xl font-bold text-gray-800">{rating.toFixed(1)}</span>
                </div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    {ratingCount} Reviews
                </p>
             </div>
             
             <div className="p-6 text-center hover:bg-gray-50 transition">
                <div className="text-2xl font-bold text-gray-800 mb-1">
                    {profile.vehicleNumber ? "verified" : "N/A"}
                </div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Vehicle Status
                </p>
             </div>
        </div>

        {/* Details Section */}
        <div className="p-6 space-y-6">
            
            <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <Mail size={20} />
                </div>
                <div>
                    <label className="text-xs text-gray-400 font-bold uppercase">Email Address</label>
                    <p className="text-gray-700 font-medium">{profile.email}</p>
                </div>
            </div>

            <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <Phone size={20} />
                </div>
                <div>
                    <label className="text-xs text-gray-400 font-bold uppercase">Phone Number</label>
                    <p className="text-gray-700 font-medium">{profile.phone || "Not provided"}</p>
                </div>
            </div>

            {profile.role === "DRIVER" && (
                <>
                <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                        <Car size={20} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase">Vehicle Details</label>
                        <p className="text-gray-700 font-medium">
                            {profile.vehicleNumber || "No Vehicle"}
                            {profile.vehicleCapacity && <span className="text-gray-400 ml-2">({profile.vehicleCapacity} seats)</span>}
                        </p>
                    </div>
                </div>
                </>
            )}

            <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                    <Calendar size={20} />
                </div>
                <div>
                    <label className="text-xs text-gray-400 font-bold uppercase">Member Since</label>
                    <p className="text-gray-700 font-medium">
                        {new Date(profile.createdAt || new Date()).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
}
