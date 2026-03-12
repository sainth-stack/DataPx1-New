import Logo from "../../assets/images/logo3.png";
import loginbg from "../../assets/svg/loginbg1.png";
import eye from "../../assets/svg/eye-fill.svg";
import eye2 from "../../assets/svg/eye-slash.svg";
import { useState, useEffect } from "react";
import { LoadingIndicator } from "../../components/loader";
import './styles.css'
import axios from 'axios'
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../const";
import sessionManager from "../../utils/sessionManager";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Paper, InputAdornment } from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { OtpPopup } from "../../components/OTPPopup";
import { logAmplitudeEvent, setAmplitudeUserId } from '../../utils';

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const [toggle2, setToggle2] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved email on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const fetchRoles = async (roles) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/roles`);
      const permissions = [];
  
      response?.data?.roles?.forEach((item) => {
        const normalizedItemRole = item.role.toLowerCase();
        const normalizedRoles = roles.map(role => role.toLowerCase());
  
        if (normalizedRoles.includes(normalizedItemRole)) {
          permissions.push(...item.permissions);
        }
      });
  
      localStorage.setItem('permissions', JSON.stringify(permissions));
      
      // Check for application permissions and redirect accordingly
      const appPermissions = [
        'home_Read',
        'data_analysis_Read',
        'visualizations_Read',
        'missing_value_treatment_Read',
        'ai_models_Read',
        'kpi_Read',
      ];
      const adminPaths = [
        { path: '/tenants', prefix: 'tenant_' },
        { path: '/organizations', prefix: 'organization_' },
        { path: '/users', prefix: 'users_' },
        { path: '/roles', prefix: 'roles_' },
      ];
      
      const hasAppPermission = permissions.some(p => appPermissions.includes(p));
      if (!hasAppPermission) {
        const adminPath = adminPaths.find(ap => permissions.some(p => p.startsWith(ap.prefix)));
        if (adminPath) {
          navigate(adminPath.path);
        } else {
          navigate('/access-denied');
        }
        return permissions;
      }
      navigate('/data-source');
      setLoading(false);
      return permissions;
    } catch (error) {
      console.error('Error fetching roles:', error);
      setLoading(false);
      return [];
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    
    logAmplitudeEvent('Login Attempt', { email: trimmedEmail });
    
    const formData = new URLSearchParams();
    formData.append('email', trimmedEmail);
    formData.append('password', trimmedPassword);

    try {
      const response = await axios.post(`${API_URL}/login`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });
      
      const userData = response.data?.user;
      
      console.log('Login Response:', response.data); // Debug: Check what we get from API
      
      // Check for first-time login (last_login is null or empty)
      if (!response.data?.user?.last_login) {
        navigate(`/reset-password?email=${encodeURIComponent(response.data?.user?.email)}&user_id=${encodeURIComponent(response.data?.user?.id)}&first_time=true`);
        return;
      }
      
      // Log successful login
      logAmplitudeEvent('Login Success', { 
        email: trimmedEmail, 
        first_time: false,
        user_id: userData?.id,
        organization: userData?.organization?.name,
        role: userData?.role
      });
      
      // Store user data
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', userData?.username);
      localStorage.setItem('userName', userData?.username);
      localStorage.setItem('logo', userData?.organization?.organization_logo);
      
      // Store tenant information
      const tenantData = {
        tenant_id: userData?.tenant_id || 'default-tenant',
        tenant_name: userData?.tenant_name || 'Default Tenant',
        tenant_type: userData?.tenant_type || 'default',
        tenant_timeout: userData?.tenant_timeout || 30
      };
      localStorage.setItem('tenant', JSON.stringify(tenantData));
      
      // Set session timeout
      const timeoutMinutes = tenantData.tenant_timeout;
      const sessionExpiryTime = Date.now() + (timeoutMinutes * 60 * 1000);
      localStorage.setItem('sessionExpiryTime', sessionExpiryTime.toString());
      
      // Initialize session management
      try {
        sessionManager.initializeSessionTimeout();
        await sessionManager.createSession(userData);
      } catch (error) {
        console.error('Error initializing session manager:', error);
      }
      
      // Get file name
      if (userData?.id) {
        try {
          const res = await axios.get(`${API_URL}/get_file_name`, {
            headers: { 'X-User-ID': userData.id }
          });
          if (res.data?.file_name) {
            localStorage.setItem('fileName', res.data.file_name);
          }
        } catch (err) {
          console.error('Error fetching file name:', err);
        }
      }
      
      // Handle remember me functionality
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', trimmedEmail);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Fetch roles and navigate
      await fetchRoles(userData?.role);
      
    } catch (err) {
      logAmplitudeEvent('Login Failure', { 
        email: trimmedEmail, 
        error: err?.response?.data?.message || err?.message || 'Unknown error',
        status_code: err?.response?.status 
      });
      alert("Login failed. Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetClick = () => {
    logAmplitudeEvent('Reset Password Clicked');
    setShowResetModal(true);
  };

  const handleSendReset = async () => {
    setResetLoading(true);
    
    logAmplitudeEvent('Reset Password Requested', { email: resetEmail });
    
    try {
      const formData = new FormData();
      formData.append('email', resetEmail);
      await axios.post(`${API_URL}/send_otp`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setShowResetModal(false);
      setShowOtpModal(true);
      
      logAmplitudeEvent('OTP Sent Successfully', { email: resetEmail });
      
    } catch (err) {
      logAmplitudeEvent('OTP Send Failed', { 
        email: resetEmail, 
        error: err?.response?.data?.message || err?.message 
      });
      toast.error('Failed to send OTP');
    } finally {
      setResetLoading(false);
    }
  };

  const handleOtpSuccess = async () => {
    logAmplitudeEvent('OTP Verified Successfully', { email: resetEmail });
    setShowOtpModal(false);
    navigate(`/reset-password?email=${encodeURIComponent(resetEmail)}`);
  };

  return (
    <div className="container-fluid row m-0 p-0 vh-100">
      <div className="col-md-6 col-xs-12 col-sm-12 text-center pt-lg-5 mt-lg-5">
        <div className="pt-5">
          <img className="logo1" src={Logo} alt="Logo" width={100} height={100}/>
        </div>
        <div className="row mt-3">
          <div className="col-md-9 col-lg-9 col-sm-12 col-xs-12 mx-auto">

            <h2 className="mb-5">Login</h2>

            <form onSubmit={handleLogin} className="pr-lg-5 pl-lg-5">
              <div className="form-group2 d-flex flex-column" style={{ textAlign: "start" }}>
                <label className="label2 fs13">Email*</label>
                <input
                  style={{ borderRadius: "40px" }}
                  type="email"
                  className="form-control border"
                  id="email"
                  name="email"
                  autoComplete="off"
                  value={email}
                  required
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // If user changes email and remember me is off, clear saved email
                    if (!rememberMe) {
                      localStorage.removeItem('rememberedEmail');
                    }
                  }}
                />
              </div>

              <div className="form-group2 d-flex flex-column mt-3" style={{ textAlign: "start" }}>
                <label className="label2 fs13">Password*</label>
                <input
                  style={{ borderRadius: "40px" }}
                  type={toggle2 ? "text" : "password"}
                  className="form-control border"
                  id="password"
                  name="password"
                  value={password}
                  maxLength={16}
                  minLength={6}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="relative">
                  <img
                    className="eye3"
                    src={toggle2 ? eye2 : eye}
                    onClick={() => setToggle2(!toggle2)}
                    alt="Toggle Password"
                  />
                </div>
              </div>
              
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => {
                      setRememberMe(e.target.checked);
                      // If unchecking remember me, clear saved email immediately
                      if (!e.target.checked) {
                        localStorage.removeItem('rememberedEmail');
                      }
                    }}
                  />
                  <label className="form-check-label fs-12" htmlFor="rememberMe">
                    Remember me
                  </label>
                </div>
                <span 
                  className="fs-12 cursor-pointer text-primary" 
                  style={{textDecoration:'underline', cursor:"pointer"}} 
                  onClick={handleResetClick}
                >
                  Forgot Password?
                </span>
              </div>
              
              <button
                className="font-weight-bold text-uppercase w-100 text-white border-0 login2"
                style={{
                  backgroundColor: "#466657",
                  borderRadius: "40px",
                  height: "40px",
                }}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    Logging in... <LoadingIndicator size={"1"} />
                  </>
                ) : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <div className="col-md-6 p-0 m-0 bg-biscuit text-center pt-4 pb-4 d-none d-lg-block">
        <h5 className="text-green font-weight-bold mt-2" style={{fontWeight:700,fontSize:'28px'}}>
          WELCOME TO DATAPX1
        </h5>
        <div className="d-flex justify-content-center">
          <div className="col-md-10" style={{borderRadius:'30px'}}>
            <img className="img-fluid p-3" src={loginbg} alt="Login Background" style={{borderRadius:'30px'}}/>
          </div>
        </div>
      </div>
      
      <div style={{position:'fixed',bottom:20,width:'100%',textAlign:'center',color:'black',fontSize:'12px',fontWeight:'bold'}}>
        © All Rights Reserved, AI-PRIORI {new Date().getFullYear()}
      </div>
      
      {/* Reset Password Modal */}
      <Dialog open={showResetModal} onClose={() => setShowResetModal(false)} maxWidth="xs" fullWidth PaperProps={{
        style: { borderRadius: 20, boxShadow: '0 8px 32px rgba(60,60,60,0.18)' }
      }}>
        <Paper elevation={0} style={{ borderRadius: 20, background: '#f8fafc' }}>
          <DialogTitle style={{textAlign:'center', fontWeight:700, fontSize:22, letterSpacing:0.5, paddingBottom:0}}>
            Reset Password
          </DialogTitle>
          <DialogContent style={{paddingTop:8, paddingBottom:0}}>
            <Box mb={2} color="#555" fontSize={15} textAlign="center">
              Enter your email address and we'll send you a link to reset your password.
            </Box>
            <TextField
              autoFocus
              margin="dense"
              label="Email Address"
              type="email"
              fullWidth
              variant="filled"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              disabled={resetLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon style={{ color: '#466657' }} />
                  </InputAdornment>
                ),
                style: { borderRadius: 12, background: '#fff' }
              }}
              InputLabelProps={{ style: { fontWeight: 500, color: '#466657' } }}
            />
          </DialogContent>
          <DialogActions style={{justifyContent:'space-between', padding:'20px 28px 24px 28px'}}>
            <Button 
              onClick={() => setShowResetModal(false)} 
              disabled={resetLoading} 
              style={{borderRadius:40, minWidth:100, fontWeight:600, color:'#466657', background:'#e8eaf6'}}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendReset} 
              disabled={!resetEmail || resetLoading} 
              variant="contained" 
              style={{background:'#466657', color:'#fff', borderRadius:40, minWidth:140, fontWeight:600, boxShadow:'0 2px 8px rgba(70,102,87,0.08)'}}
            >
              {resetLoading ? (
                <span style={{display:'flex',alignItems:'center'}}>
                  <span className="spinner-border spinner-border-sm" style={{marginRight:8}}></span>
                  Sending...
                </span>
              ) : 'Send Link'}
            </Button>
          </DialogActions>
        </Paper>
      </Dialog>
      
      {showOtpModal && (
        <OtpPopup
          email={resetEmail}
          onClose={() => setShowOtpModal(false)}
          onSuccess={handleOtpSuccess}
        />
      )}
    </div>
  );
};