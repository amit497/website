import { FaHome, FaUsers, FaCog } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

export default function MobileNavbar() {
  return (
    <nav className="mobile-bottom-nav">
      <NavLink to="/admin/dashboard" end className={({ isActive }) => isActive ? "mobile-nav-item active" : "mobile-nav-item"}>
        <FaHome />
        <span>Home</span>
      </NavLink>
      <NavLink to="/admin/users" className={({ isActive }) => isActive ? "mobile-nav-item active" : "mobile-nav-item"}>
        <FaUsers />
        <span>Users</span>
      </NavLink>
      <NavLink to="/admin/settings" className={({ isActive }) => isActive ? "mobile-nav-item active" : "mobile-nav-item"}>
        <FaCog />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}