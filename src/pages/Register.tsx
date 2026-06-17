import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import factoryImg from "@/assets/factory-worker.jpg";
import logoSrc from "@/assets/datapx1-logo.png";

function AuthField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-white/70">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-11 w-full rounded-full border bg-white/5 px-5 text-sm text-white placeholder:text-white/30 outline-none transition-colors"
      style={{ borderColor: "rgba(255,255,255,0.15)" }}
      onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
      placeholder={placeholder}
    />
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-11 w-full rounded-full border bg-white/5 px-5 pr-12 text-sm text-white placeholder:text-white/30 outline-none transition-colors"
        style={{ borderColor: "rgba(255,255,255,0.15)" }}
        onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
        placeholder={placeholder}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
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
          Please wait…
        </>
      ) : (
        label
      )}
    </button>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"register" | "otp">("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({ username, email, password });
      if (res.message === "User created") {
        setSuccess("Account created! An OTP has been sent to your email.");
        setStep("otp");
      } else if (res.errors) {
        const first = Object.values(res.errors)[0];
        setError(Array.isArray(first) ? String(first[0]) : String(first));
      } else {
        setError(res.message || "Registration failed. Please try again.");
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }).response?.data;
      if (data?.errors) {
        const first = Object.values(data.errors)[0];
        setError(Array.isArray(first) ? String(first[0]) : String(first));
      } else {
        setError(data?.message || "Network error — please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(email, otp.trim());
      if (res.status === "success") {
        navigate("/login", { state: { message: "Account verified! You can now log in." } });
      } else {
        setError(res.message || "Invalid or expired OTP.");
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setSuccess("");
    setResending(true);
    try {
      const res = await authApi.sendOtp(email);
      if (res.status === "success") setSuccess("A new OTP has been sent to your email.");
      else setError(res.message || "Failed to resend OTP.");
    } catch {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen min-h-[100dvh] w-full" style={{ background: "#152030" }}>
      <div
        className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 md:px-16 lg:px-[70px]"
        style={{ background: "#1a2a3a" }}
      >
        <div className="mb-8 flex justify-center">
          <img src={logoSrc} alt="Datapx1" className="object-contain" style={{ height: 90, width: "auto" }} />
        </div>

        {step === "register" ? (
          <>
            <h1 className="mb-6 text-[22px] font-normal text-white/90">Create Account</h1>
            {error && (
              <div className="mb-4 max-w-[420px] rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 max-w-[420px] rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                {success}
              </div>
            )}
            <form onSubmit={handleRegister} className="flex flex-col gap-4 w-full max-w-[420px]">
              <AuthField label="Username" required>
                <TextInput value={username} onChange={setUsername} placeholder="Enter your username" disabled={loading} />
              </AuthField>
              <AuthField label="Email" required>
                <TextInput type="email" value={email} onChange={setEmail} placeholder="Enter your email" disabled={loading} />
              </AuthField>
              <AuthField label="Password" required>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggle={() => setShowPassword((p) => !p)}
                  placeholder="Min. 8 characters"
                  disabled={loading}
                />
              </AuthField>
              <AuthField label="Confirm Password" required>
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirm}
                  onToggle={() => setShowConfirm((p) => !p)}
                  placeholder="Repeat your password"
                  disabled={loading}
                />
              </AuthField>
              <SubmitButton loading={loading} label="REGISTER" />
              <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                Already have an account?{" "}
                <Link to="/login" className="font-medium hover:underline" style={{ color: "#2563EB" }}>
                  Login
                </Link>
              </p>
            </form>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-[22px] font-normal text-white/90">Verify Your Email</h1>
            <p className="mb-6 text-sm max-w-[420px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              An OTP was sent to <span className="text-white/80">{email}</span>. Enter it below to activate your account.
            </p>
            {error && (
              <div className="mb-4 max-w-[420px] rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 max-w-[420px] rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                {success}
              </div>
            )}
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 w-full max-w-[420px]">
              <AuthField label="One-Time Password" required>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    inputMode="numeric"
                    maxLength={10}
                    disabled={loading}
                    className="h-11 w-full rounded-full border bg-white/5 pl-10 pr-5 text-sm text-white placeholder:text-white/30 outline-none tracking-widest transition-colors"
                    style={{ borderColor: "rgba(255,255,255,0.15)" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
                    placeholder="Enter OTP"
                  />
                </div>
              </AuthField>
              <SubmitButton loading={loading} label="VERIFY" />
              <button
                type="button"
                disabled={resending}
                onClick={handleResendOtp}
                className="text-sm text-center hover:underline disabled:opacity-50"
                style={{ color: "#2563EB" }}
              >
                {resending ? "Sending…" : "Resend OTP"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("register");
                  setError("");
                  setSuccess("");
                }}
                className="text-sm text-center hover:underline"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                ← Back to registration
              </button>
            </form>
          </>
        )}

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
