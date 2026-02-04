import React from "react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { userAPI } from "../../api/axiosAPI";
import { User, Mail, Phone, Lock, Truck } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("RIDER");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    // --- Validation Logic ---
    if (!name || name.trim().length < 2) {
      setError("Full Name must be at least 2 characters.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid Email address.");
      return;
    }

    // Phone: exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (role === "DRIVER") {
      if (!vehicleNumber || vehicleNumber.trim().length < 5) {
        setError("Please enter a valid Vehicle Number.");
        return;
      }
      // Optional: stricter regex for vehicle number if needed
    }

    try {
      setLoading(true);

      const payload = {
        name,
        email,
        phone,
        password,
        role,
      };

      if (role === "DRIVER") {
        payload.vehicleNumber = vehicleNumber;
        payload.vehicleCapacity = vehicleCapacity;
      }

      console.log("Sending register payload:", payload);
      const res = await userAPI.register(payload);
      const { user, token } = res.data;

      if (!user || !token) {
        throw new Error("Invalid response: missing user or token");
      }

      login(user, token);

      if (user.role === "DRIVER") {
        navigate("/driver-dashboard");
      } else {
        navigate("/rider-dashboard");
      }
    } catch (err) {
      console.log("Register error response:", err.response);
      console.log("Error data:", err.response?.data);
      console.log("Error message:", err.response?.data?.message);
      console.log("Full error:", err);
      setError(
        err.response?.data?.message || err.response?.data?.error || "Registration failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 py-8">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">🚗 Create Account</h1>
          <p className="text-gray-600 mt-2">Join CoRYD Community</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-bold mb-2">Full Name</label>
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
              <User className="text-gray-400 mr-2" size={20} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Email</label>
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
              <Mail className="text-gray-400 mr-2" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Phone</label>
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
              <Phone className="text-gray-400 mr-2" size={20} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input-field"
            >
              <option value="RIDER">👤 Rider</option>
              <option value="DRIVER">🚗 Driver</option>
            </select>
          </div>

          {role === "DRIVER" && (
            <>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Vehicle Number</label>
                <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                  <Truck className="text-gray-400 mr-2" size={20} />
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g., MH02AB1234"
                    className="w-full outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">Vehicle Capacity (Seats)</label>
                <select
                  value={vehicleCapacity}
                  onChange={(e) => setVehicleCapacity(parseInt(e.target.value))}
                  className="input-field"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n} seats</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-gray-700 font-bold mb-2">Password</label>
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
              <Lock className="text-gray-400 mr-2" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min 6 characters)"
                className="w-full outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Confirm Password</label>
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
              <Lock className="text-gray-400 mr-2" size={20} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 font-bold hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
