/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useRef } from "react";
// import "./styles.scss";
// import userprofile from '../../assets/images/userprofile.png'
import { useNavigate } from "react-router-dom";
import Logo from '../../../../../assets/images/logo3.png'
import { AiTwotoneCalendar } from 'react-icons/ai'
import { useLocation } from "react-router-dom";
import sessionManager from "../../../../../utils/sessionManager";
function Navbar() {
  const navigate = useNavigate()
  const [name, setName] = useState("Dashboard")
  const handleLogout = () => {
    sessionManager.logout();
  }
  let location = useLocation();
  useEffect(() => {
    if (location.pathname == '/productivity') {
      setName("Productivity")
    } else if (location.pathname == '/resilience') {
      setName("Resilience")
    } else if (location.pathname == '/sustainability') {
      setName("Sustainability")
    } else if (location.pathname == '/reports' || location.pathname=='/review-report') {
      setName("Reports")
    } else {
      setName("KProcess")
    }
  }, [location.pathname])


  return (
    <>
      <nav class="navbar navbar-expand-lg  navbar-light bg-white shadow-sm sticky-top bg-white-fixed" style={{zIndex:100}}>
        <div class="collapse navbar-collapse" style={{ marginLeft: '0px',paddingLeft:'40px'}} id="navbarNav">
          <img
            src={Logo}
            style={{ width: '70px',height:'70px' }}
            id="logo_RL"
          />
        </div>

        <div className="position-absolute w-100 d-flex justify-content-center" style={{ pointerEvents: 'none' }}>
          <h2 style={{fontSize:'30px',fontWeight:'bold'}} className="m-0">DataPX1</h2>
        </div>

        <div class="nav-item ms-1 dropdown d-flex align-items-center mr-0 pr-0" style={{ color: 'black' }}>
          <a
            className="nav-link dropdown-toggle p-0 m-0 pe-5"
            href="/#"
            id="navbarDropdown"
            role="button"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
            style={{ textDecoration: 'none', color: 'black' }}
          >
            <span className="ml-2 fs14 text-dark" title={"Admin"}>
              {localStorage.getItem("userName") || "admin"}
            </span>
            <i class="bi bi-caret-down-fill"></i>
          </a>
          <div class="dropdown-menu" aria-labelledby="navbarDropdown" style={{ position: "absolute", left: "-60px", top: "30px" }}>
            <span class="dropdown-item">Action</span>
            <span class="dropdown-item" onClick={() => handleLogout()}>Logout</span>
          </div>
        </div>
      </nav>
    </>

  );

}
export default Navbar;
