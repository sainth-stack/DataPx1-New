import React from "react";
import { BsBuilding } from "react-icons/bs";
import { AiOutlineTeam } from "react-icons/ai";
import { BiUser } from "react-icons/bi";
import { RiShieldUserLine } from "react-icons/ri";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./styles.css";

export default function Sidebar({ }) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions=JSON.parse(localStorage.getItem('permissions') || '{}');

  const hasTenantPermission = Array.isArray(permissions) && permissions.some(p => p.startsWith("tenant_"));
  const hasOrgPermission = Array.isArray(permissions) && permissions.some(p => p.startsWith("organization_"));
  const hasUserPermission = Array.isArray(permissions) && permissions.some(p => p.startsWith("users_"));
  const hasRolePermission = Array.isArray(permissions) && permissions.some(p => p.startsWith("roles_"));
  // Menu items with their required permissions
  const menuItems = [
    {
      path: "/tenants",
      name: "Tenants",
      icon: <BsBuilding size={20} />,
      requiredPermission: "tenant_Read",
      show: hasTenantPermission
    },
    {
      path: "/organizations",
      name: "Organizations",
      icon: <AiOutlineTeam size={20} />,
      requiredPermission: "organization_Read",
      show: hasOrgPermission
    },
    {
      path: "/user-roles",
      name: "User Roles",
      icon: <RiShieldUserLine size={20} />,
      requiredPermission: "roles_Read",
      show: hasRolePermission
    },
    {
      path: "/users",
      name: "Users",
      icon: <BiUser size={20} />,
      requiredPermission: "users_Read",
      show: hasUserPermission
    },
    {
      path: "/user-sessions",
      name: "User Sessions",
      icon: <RiShieldUserLine size={20} />,
      requiredPermission: "session_Read",
      show: hasRolePermission
    }
  ].filter(item => item.show);

  // Check if current path is accessible
  const isPathAccessible = (path) => {
    // Allow access to root path
    if (path === "/") return true;
    
    // Check if path matches any accessible menu item
    return menuItems.some(item => item.path === path);
  };

  // Redirect if trying to access unauthorized path
  React.useEffect(() => {
    if (!isPathAccessible(location.pathname)) {
      navigate("/access-denied");
    }
  }, [location.pathname, navigate]);

  return (
    <div className="main-container">
      <nav className="sidebar shadow sidebar-scroll sticky-top" style={{ zIndex: 100 }}>
        <ul className="sidebar-list" id="menu">
          {menuItems.map((item) => (
            <li 
              key={item.path}
              className={`sidebar-item mt-2 ${location.pathname === item.path ? "active" : ""}`}
            >
              <Link to={item.path} className="sidebar-link">
                {item.icon}
                <span className="link-text">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}