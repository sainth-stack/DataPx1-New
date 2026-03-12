import React from "react";
import "./loader.css";
// import ReactSpinner from "react-bootstrap-spinner";

export function LoadingIndicator({ message = "Loading..." }) {
  return (
    <div className="loader-overlay">
      <div className="loader-container">
        <div className="spinner"></div>
        <p>{message}</p>
      </div>
    </div>
  );
  //  <ReactSpinner type={type} color="primary" size={size.toString()} />;
}
