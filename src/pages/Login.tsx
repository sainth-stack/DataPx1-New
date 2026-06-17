import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import factoryImg from "@/assets/factory-worker.jpg";
import logoSrc from "@/assets/datapx1-logo.png";

function LoginLogo() {
  return (
    <img src={logoSrc} alt="Datapx1" className="object-contain" style={{ height: 90, width: "auto" }} />
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const successMessage = (location.state as { message?: string } | null)?.message;

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const err = await login(email, password);
      if (err) setError(err);
      else navigate("/data-ingestion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen min-h-[100dvh] w-full" style={{ background: "#152030" }}>
      <div
        className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 md:px-16 lg:px-[70px]"
        style={{ background: "#1a2a3a" }}
      >
        <div className="mb-8 flex justify-center">
          <LoginLogo />
        </div>

        <h1 className="mb-6 text-[22px] font-normal text-white/90">Login</h1>

        {successMessage && (
          <div className="mb-4 max-w-[420px] rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 max-w-[420px] rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5 w-full max-w-[420px]">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/70">
              Email<span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-full border bg-white/5 px-5 text-sm text-white placeholder:text-white/30 outline-none transition-colors"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
              onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
              placeholder="Enter your email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/70">
              Password<span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-11 w-full rounded-full border bg-white/5 px-5 pr-12 text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.15)" }}
                onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
                placeholder="Enter your password"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-full text-sm font-bold text-white uppercase transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ backgroundColor: "#2563EB", letterSpacing: "1.5px" }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "#1d4ed8")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2563EB")}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Logging in…
              </>
            ) : (
              "LOGIN"
            )}
          </button>

          <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-medium hover:underline" style={{ color: "#2563EB" }}>
              Register
            </Link>
          </p>
        </form>

        <p className="mt-10 text-xs text-center max-w-[420px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          © All Rights Reserved, AI Priori 2026
        </p>
      </div>

      <div
        className="hidden md:flex w-1/2 flex-col items-center justify-center"
        style={{ background: "#152030", padding: "36px 40px" }}
      >
        <h2 className="mb-6 text-center text-[22px] font-bold uppercase" style={{ color: "#2563EB", letterSpacing: "1px" }}>
          WELCOME TO DATAPX1
        </h2>
        <p className="mb-6 text-center text-sm max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
          Industrial Decision Intelligence — unify ERP, machine telemetry & operations into actionable insight
        </p>
        <img
          src={factoryImg}
          alt="Factory worker with AR panels"
          className="w-full max-w-[520px] rounded-[14px] object-cover"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        />
      </div>
    </div>
  );
}
