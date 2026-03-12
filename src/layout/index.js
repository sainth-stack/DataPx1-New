import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "./style.css";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { FaRobot } from "react-icons/fa";
import { IconButton } from "@mui/material";
import ChatDataPrep from "./chatdataprep";

export function AdminLayout(props) {
  const isAuthenticated = () => {
    const accessToken = localStorage.getItem("userName");
    return accessToken ? true : false;
  };
  const [showModel, setShowModel] = useState(false);
  const location = useLocation();
  return (
    <div className="row p-0 m-0">
      <React.Fragment>
        {isAuthenticated() ? (
          <div className="col-lg-12 col-md-12 col-sm-12 col-xs-12 p-0 m-0">
            <Navbar />
            <div className="d-flex justify-content-between" >
              <div className={""}>
                <Sidebar />
              </div>
              <div className="p-0 w-100 main-content">
                <Outlet />
                {location.pathname !== "/" && (
                  <IconButton
                    onClick={() => setShowModel(!showModel)}
                    sx={{
                      position: "fixed",
                      bottom: 24,
                      right: 24,
                      backgroundColor: "#1976d2",
                      color: "white",
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      boxShadow: 4,
                      transition: "background-color 0.3s, transform 0.2s",
                      "&:hover": {
                        backgroundColor: "#1565c0",
                        transform: "scale(1.1)",
                      },
                    }}
                  >
                    <FaRobot size={28} />
                  </IconButton>
                )}
                {
                  <div style={{}}>
                    <ChatDataPrep {...{ showModel, setShowModel }} />
                  </div>
                }
              </div>
            </div>
          </div>
        ) : (
          <Navigate to="/login" replace />
        )}
      </React.Fragment>
    </div>
  );
}
