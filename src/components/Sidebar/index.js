import React from "react";
import { LuHome } from "react-icons/lu";
import { BiAnalyse } from "react-icons/bi";
import { RiFileWarningLine } from "react-icons/ri";
import { AiOutlineRobot, AiOutlineSetting } from "react-icons/ai";
import { IoStatsChartOutline } from "react-icons/io5";
import { RiFileList3Line } from "react-icons/ri";
import { MdStorage } from "react-icons/md";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./styles.css";

export default function Sidebar({ }) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions=JSON.parse(localStorage.getItem('permissions') || '[]') || [];
  // Check specific admin permissions
  const hasTenantPermission = Array.isArray(permissions) && permissions.some(p => p?.startsWith("tenant_"));
  const hasOrgPermission = Array.isArray(permissions) && permissions.some(p => p?.startsWith("organization_"));
  const hasUserPermission = Array.isArray(permissions) && permissions.some(p => p?.startsWith("users_"));
  const hasRolePermission = Array.isArray(permissions) && permissions.some(p => p?.startsWith("roles_"));
  const hasAnyAdminPermission = hasTenantPermission || hasOrgPermission || hasUserPermission || hasRolePermission;

  const adminPaths = [];
  if (hasTenantPermission) adminPaths.push({ path: "/tenants", name: "Tenants" });
  if (hasOrgPermission) adminPaths.push({ path: "/organizations", name: "Organizations" });
  if (hasUserPermission) adminPaths.push({ path: "/users", name: "Users" });
  if (hasRolePermission) adminPaths.push({ path: "/roles", name: "Roles" });
  const sidebarItems = [
    {
      path: "/data-source",
      name: "Data Source",
      icon: <MdStorage size={20} />, 
      permission: "home_Read"
    },
    {
      path: "/",
      name: "Home",
      icon: <LuHome size={20} />,
      permission: "home_Read",
      paths: ['/home', '/']
    },
    {
      path: "/data-analysis",
      name: "Data Analysis",
      icon: <BiAnalyse size={20} />,
      permission: "data_analysis_Read"
    },
    {
      path: "/visualizations",
      name: "Visualizations",
      icon: <BiAnalyse size={20} />,
      permission: "visualizations_Read"
    },
    {
      path: "/missing-value",
      name: "Missing Value Treatment",
      icon: <RiFileWarningLine size={20} />,
      permission: "missing_value_treatment_Read"
    },
    {
      path: "/ai-models",
      name: "AI and Models",
      icon: <AiOutlineRobot size={20} />,
      permission: "ai_models_Read"
    },
    {
      path: "/kpi",
      name: "KPI",
      icon: <IoStatsChartOutline size={20} />,
      permission: "kpi_Read"
    },
    {
      path: "/machine-360",
      name: "Machine 360",
      icon: <RiFileList3Line size={20} />,
      permission: "kpi_Read"
    },
    {
      path: "/customer-360",
      name: "Customer 360",
      icon: <RiFileList3Line size={20} />,
      permission: "kpi_Read"
    }
  ].filter(item => permissions.includes(item.permission)) || [];

  // Function to check if current path is accessible
  const isPathAccessible = (path) => {
    // Check main paths
    const mainPathItem = sidebarItems.find(item => 
      item.path === path || (item.paths && item.paths.includes(path))
    );
    if (mainPathItem) return true;

    // Check admin paths
    if (path.startsWith("/admin")) {
      const adminPath = adminPaths.find(p => path.startsWith(p.path));
      return !!adminPath;
    }

    return false;
  };

  // Redirect if trying to access unauthorized path
  React.useEffect(() => {
    if (!isPathAccessible(location.pathname)) {
      navigate("/access-denied"); // Or your preferred unauthorized access route
    }
  }, [location.pathname, navigate]);

  return (
    <div className="main-container">
      <nav className="sidebar shadow sidebar-scroll sticky-top" style={{ zIndex: 100 }}>
        <ul className="sidebar-list" id="menu">
          {sidebarItems.map((item) => (
            <li 
              key={item.path}
              className={`sidebar-item mt-2 ${
                (item.paths ? item.paths.includes(location.pathname) : location.pathname === item.path) 
                  ? "active" 
                  : ""
              }`}
            >
              <Link to={item.path} className="sidebar-link">
                {item.icon}
                <span className="link-text">{item.name}</span>
              </Link>
            </li>
          ))}
          
          {hasAnyAdminPermission && (
            <li className={`sidebar-item mt-2 has-dropdown ${
              location.pathname.startsWith("/admin") ? "active" : ""
            }`}>
              <div className="sidebar-link" onClick={()=>navigate(adminPaths?.[0]?.path)}>
                <AiOutlineSetting size={20} />
                <span className="link-text">Admin</span>
              </div>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}