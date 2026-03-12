/* eslint-disable no-unused-vars */
import React from "react";
import './styles.css'
import group from "../../assets/svg/group.svg"
const TitleHeader = (props) => {
  return (
    <div className="titleHeader">
      <p className={"title d-flex align-items-center m-0"}>{props.group&&<img src={group} alt="group" className="pe-2 header-icon" />}{props.name}</p>
      {/* <div className="export-custom">
        <div className="export-div">
          <div className="export-in">
            <a className="dropdown-toggle text-black text-decoration-none fs14 greenColor" href="/#" role="button" id="dropdownMenuLink" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              <img src={exports} alt="export" className="pr-2 wh25" />Export
            </a>
            <div className="dropdown-menu export-drop" aria-labelledby="dropdownMenuLink">
              <a className="dropdown-item" href="/#">Action</a>
              <a className="dropdown-item" href="/#">Another action</a>
              <a className="dropdown-item" href="/#">Something else here</a>
            </div>
          </div>
        </div>
        <div className={isMobile ? "cust" : "customize"} >
          <a className="text-black text-decoration-none fs14" href="/#">
            <img src={editIcon} alt="export" className="pr-2 ml-2 wh45" />
            <span className="custom-text greenColor">Customize this page</span>
          </a>
        </div>
      </div> */}
    </div>
  )
}

export default TitleHeader;