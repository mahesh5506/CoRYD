import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { userAPI } from "../../api/axiosAPI";
import { Mail, Lock } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      const res = await userAPI.login({ email, password });

      const { user, token } = res.data;
      login(user, token);

      // Navigate to home route - AppRoutes will redirect to appropriate dashboard
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">🚗 CoRYD</h1>
          <p className="text-gray-600">Share rides, share costs</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200">
              {error}
            </div>
          )}

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
            <label className="block text-gray-700 font-bold mb-2">Password</label>
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
              <Lock className="text-gray-400 mr-2" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 font-bold hover:underline">
              Register here
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center mb-4">Demo Credentials:</p>
          <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded">
            <p><strong>Driver:</strong> driver@test.com / password</p>
            <p><strong>Rider:</strong> rider@test.com / password</p>
          </div>
        </div>
      </div>
    </div>
  );
}
