import Logo from "../../assets/images/logo3.png";
import loginbg from "../../assets/svg/loginbg1.png";
import eye from "../../assets/svg/eye-fill.svg";
import eye2 from "../../assets/svg/eye-slash.svg";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import './styles.css';
import { Button, TextField, InputAdornment, IconButton, Paper, Box, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import axios from "axios";
import { API_URL } from "../../const";
import { logAmplitudeEvent } from '../../utils';

export const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const email = params.get("email");
  const user_id = params.get("user_id");
  const firstTime = params.get("first_time") === 'true';


  const handleReset = async (e) => {
    e.preventDefault();
    logAmplitudeEvent('Reset Password Attempt', { email, firstTime });
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('password', password);
      await axios.post(`${API_URL}/users/${user_id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (firstTime) {
        toast.success("Password set successfully! Please login with your new password.");
      } else {
        toast.success("Password reset successfully!");
      }
      navigate('/login');
      logAmplitudeEvent('Reset Password Success', { email, firstTime });
    } catch (err) {
      toast.error("Failed to reset password");
      logAmplitudeEvent('Reset Password Failure', { email, firstTime, error: err?.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(120deg, #f8fafc 60%, #e8eaf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={4} sx={{ borderRadius: 5, p: { xs: 2, sm: 4 }, maxWidth: 420, width: '100%', mx: 2 }}>
        <Box textAlign="center" mb={2}>
          <img className="logo1" src={Logo} alt="Logo" width={80} height={80} style={{marginBottom:8}}/>
          <Typography variant="h5" fontWeight={700} mb={1} color="#466657">
            {firstTime ? 'Set Your Password' : 'Reset Password'}
          </Typography>
          <Typography variant="body2" color="#555" mb={2}>
            {firstTime ? 'Welcome! Please set your password to activate your account.' : 'Enter your new password below.'}
          </Typography>
        </Box>
        <form onSubmit={handleReset}>
          <TextField
            label="New Password"
            type={showPassword ? "text" : "password"}
            variant="filled"
            fullWidth
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            inputProps={{ minLength: 8, maxLength: 16, style: { borderRadius: 12 } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(v => !v)} edge="end">
                    <img src={showPassword ? eye2 : eye} alt="toggle" style={{width:22}} />
                  </IconButton>
                </InputAdornment>
              ),
              style: { background: '#fff', borderRadius: 12 }
            }}
            InputLabelProps={{ style: { fontWeight: 500, color: '#466657' } }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Confirm Password"
            type={showConfirm ? "text" : "password"}
            variant="filled"
            fullWidth
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            inputProps={{ minLength: 8, maxLength: 16, style: { borderRadius: 12 } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirm(v => !v)} edge="end">
                    <img src={showConfirm ? eye2 : eye} alt="toggle" style={{width:22}} />
                  </IconButton>
                </InputAdornment>
              ),
              style: { background: '#fff', borderRadius: 12 }
            }}
            InputLabelProps={{ style: { fontWeight: 500, color: '#466657' } }}
            sx={{ mb: 3 }}
          />
          <Button
            className="font-weight-bold text-uppercase w-100 text-white border-0 login2"
            style={{ backgroundColor: "#466657", borderRadius: "40px", height: "44px", fontWeight:600, fontSize:16, boxShadow:'0 2px 8px rgba(70,102,87,0.08)' }}
            type={loading ? "button" : "submit"}
            disabled={loading}
            variant="contained"
          >
            {loading ? <span style={{display:'flex',alignItems:'center',justifyContent:'center'}}><span className="spinner-border spinner-border-sm" style={{marginRight:8}}></span>Resetting...</span> : "Reset Password"}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}; 