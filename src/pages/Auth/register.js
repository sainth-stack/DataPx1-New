import Logo from "../../assets/images/logo3.png";

import loginbg from "../../assets/svg/loginbg1.png";
import eye from "../../assets/svg/eye-fill.svg";
import eye2 from "../../assets/svg/eye-slash.svg";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LoadingIndicator } from "../../components/loader";
import { useNavigate } from "react-router-dom";
import './styles.css'
import axios from 'axios'
import { OtpPopup } from "../../components/OTPPopup";
import { API_URL } from "../../const";
import { logAmplitudeEvent } from '../../utils';


export const Register = () => {
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [toggle2, setToggle2] = useState(false);
  const [userName, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState('');
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [registerData, setRegisterData] = useState(null);
  const navigate = useNavigate();

  const Register = (event) => {
    event.preventDefault();
    logAmplitudeEvent('Registration Attempt', { email });
    setLoading(true);
    
    const formData = new URLSearchParams();
    formData.append('username', userName);
    formData.append('password', password);
    formData.append('email', email);
    formData.append('first_name', userName); // Using username as first_name
    formData.append('last_name', userName);  // Using username as last_name
    formData.append('roles', ["register"]);  // Using username as last_name
formData.append('organization',"7f0bd951-43c6-4f2f-9608-f34a8086dd0d")
    axios.post(`${API_URL}/create_user`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })
    .then((response) => {
      setLoading(false);
      setRegisterData(response.data);
      logAmplitudeEvent('Registration Success', { email });
      setShowOtpPopup(true);
      logAmplitudeEvent('OTP Popup Shown', { email });
    })
    .catch((err) => {
      setLoading(false);
      alert("Registration failed. Please try again.");
      logAmplitudeEvent('Registration Failure', { email, error: err?.message || 'Unknown error' });
    });
  };


  return (
    <div className="container-fluid row m-0 p-0 vh-100">
      <div className="col-md-6 col-xs-12 col-sm-12 text-center pt-lg-5 mt-lg-5">
        <div className="">
          <img className="logo1" src={Logo} alt="Logo" width={100} height={100}/>
        </div>
        <div className="row mt-3">
          <div className="col-md-9 col-lg-9 col-sm-12 col-xs-12 mx-auto">
            <h2 className="mb-5">Register</h2>

            <form onSubmit={Register} className="pr-lg-5 pl-lg-5">
              <div className="form-group2 d-flex flex-column" style={{ textAlign: "start" }}>
                <label className="label2 fs13">Preferred Name*</label>
                <input
                  style={{ borderRadius: "40px" }}
                  type="text"
                  className="form-control border"
                  id="username"
                  name="username"
                  autoComplete="off"
                  value={userName}
                  required
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  minLength={8}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="relative">
                  <img
                    className="eye3"
                    src={toggle2 ? eye2 : eye}
                    onClick={() => { setToggle2(!toggle2) }}
                    alt="Logo"
                  />
                </div>
              </div>

              <button
                className="font-weight-bold text-uppercase w-100 text-white border-0 login2"
                style={{
                  backgroundColor: "#466657",
                  borderRadius: "40px",
                  height: "40px",
                }}
                type={loading ? "button" : "submit"}
                disabled={loading}
              >
                {loading ? "Registering..." : 'Register'} {loading ? <LoadingIndicator size={"1"} /> : null}
              </button>
            </form>
            <div className="mt-3">Already Have An Account?</div>
            <Link to="/login" className="text-decoration-none login1">
              <span>Login</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="col-md-6 p-0 m-0 bg-biscuit text-center pt-4 pb-4 d-none d-lg-block">
      <h5 className="text-green font-weight-bold mt-2" style={{fontWeight:700,fontSize:'28px'}}>WELCOME TO DATAPX1</h5>
      {/* <h3 className="mt-3">Your Digital Growth Partner <br /> For Manufacturing</h3> */}
        <div className="d-flex justify-content-center">
          <div className="col-md-10">
            <img className="img-fluid p-3" src={loginbg} alt="Logo" />
          </div>
        </div>
      </div>

      {showOtpPopup && (
        <OtpPopup
          email={email}
          onClose={() => setShowOtpPopup(false)}
          loading={otpLoading}
        />
      )}
    </div>
  );
};