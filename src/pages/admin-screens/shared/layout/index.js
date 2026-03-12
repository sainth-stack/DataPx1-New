import React, { useState } from "react";
import Sidebar from "./Sidebar";
import './style.css'
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom"
import Navbar from '../../../../components/Navbar'
export function AdminScrenLayout(props) {
  const isAuthenticated = () => {
    const accessToken = localStorage.getItem("userName")
    return accessToken ? true :false
  }
  const [showModel, setShowModel] = useState(false);
const location = useLocation()
  return (
    <div className="row p-0 m-0">
      <React.Fragment>
      { isAuthenticated() ? <div className="col-lg-12 col-md-12 col-sm-12 col-xs-12 p-0 m-0">
          {/* Top Navbar */}
          <Navbar />
          {/* Main content */}
          <div className="d-flex justify-content-between" >
            <div className={""}>
              <Sidebar />
            </div>
            <div className="p-0 w-100 main-content">
            <Outlet />
    </div>
          </div>
  </div> : (
          <Navigate to="/login" replace />
        )}
      </React.Fragment>
    </div>
  );
}
