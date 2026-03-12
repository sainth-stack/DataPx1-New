// components/OtpPopup.js
import { useState } from "react";
import { 
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  TextField,
  Typography,
  styled,
  Paper
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../const";
import Logo from "../assets/images/logo3.png";

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    padding: theme.spacing(4),
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
    maxWidth: '450px',
    width: '100%'
  }
}));

const SubmitButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  padding: '12px 0',
  fontWeight: '600',
  textTransform: 'none',
  fontSize: '16px',
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none'
  }
}));

export const OtpPopup = ({ email, onClose, onSuccess, loading }) => {
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setOtpLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/otp_verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: email,
          otp: otp
        })
      });

      const data = await response.json();

      if (response.ok && (data.status === true || data.status === 'success')) {
        // OTP verification successful
        // Navigate to reset-password with email and user_id
        if (data.user_id && data.user_email) {
          navigate(`/reset-password?email=${encodeURIComponent(data.user_email)}&user_id=${encodeURIComponent(data.user_id)}`);
        } else if (data.email && data.user_id) {
          navigate(`/reset-password?email=${encodeURIComponent(data.email)}&user_id=${encodeURIComponent(data.user_id)}`);
        } else if (email) {
          navigate(`/reset-password?email=${encodeURIComponent(email)}`);
        }
        // If onSuccess is used elsewhere, you can keep it optionally:
        // if (onSuccess) onSuccess();
      } else {
        setError(data.message || "OTP verification failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("OTP verification error:", err);
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <Box sx={{ position: 'fixed', zIndex: 1300, top: 0, left: 0, width: '100vw', height: '100vh', background: 'linear-gradient(120deg, #f8fafc 60%, #e8eaf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={4} sx={{ borderRadius: 5, p: { xs: 2, sm: 4 }, maxWidth: 420, width: '100%', mx: 2 }}>
        <Box textAlign="center" mb={2}>
          <img className="logo1" src={Logo} alt="Logo" width={80} height={80} style={{marginBottom:8}}/>
          <Typography variant="h5" fontWeight={700} mb={1} color="#466657">Verify Your Email</Typography>
          <Typography variant="body2" color="#555" mb={2}>
            We've sent a 6-digit code to <strong>{email}</strong>
          </Typography>
        </Box>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Enter OTP"
            variant="filled"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            required
            inputProps={{ maxLength: 6, style: { borderRadius: 12 } }}
            disabled={otpLoading}
            fullWidth
            InputProps={{
              style: { background: '#fff', borderRadius: 12 }
            }}
            InputLabelProps={{ style: { fontWeight: 500, color: '#466657' } }}
            sx={{ mb: 2 }}
          />
          {error && (
            <Typography color="error" variant="body2" mb={2}>
              {error}
            </Typography>
          )}
          <Button
            className="font-weight-bold text-uppercase w-100 text-white border-0 login2"
            style={{ backgroundColor: "#466657", borderRadius: "40px", height: "44px", fontWeight:600, fontSize:16, boxShadow:'0 2px 8px rgba(70,102,87,0.08)' }}
            type={otpLoading ? "button" : "submit"}
            disabled={otpLoading}
            variant="contained"
            sx={{ mb: 2 }}
          >
            {otpLoading ? <span style={{display:'flex',alignItems:'center',justifyContent:'center'}}><span className="spinner-border spinner-border-sm" style={{marginRight:8}}></span>Verifying...</span> : "Verify OTP"}
          </Button>
        </form>
        <Typography variant="body2" color="text.secondary" align="center">
          Didn't receive code? <Button variant="text" color="primary" sx={{ textTransform: 'none' }}>Resend</Button>
        </Typography>
      </Paper>
    </Box>
  );
};