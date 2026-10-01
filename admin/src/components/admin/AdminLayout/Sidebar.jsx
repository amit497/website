import { useState } from 'react';
import { 
  FaHome, 
  FaUsers, 
  FaCog, 
  FaTags, 
  FaBoxOpen, 
  FaShoppingCart, 
  FaWarehouse, 
  FaUserFriends, 
  FaChevronDown, 
  FaChevronRight 
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

export default function Sidebar({ isCollapsed, mobileOpen, closeMobile }) {
  // Store only the active submenu key as a string (null means all closed)
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  // Accordion toggle: if clicked menu is already open, close it; otherwise open it and close others
  const toggleSubmenu = (key) => {
    setActiveSubmenu((prev) => (prev === key ? null : key));
  };

  return (
    <div className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        {isCollapsed && !mobileOpen ? 'AP' : 'Admin Panel'}
      </div>
      <ul className="sidebar-menu">
        {/* Dashboard */}
        <li>
          <Link 
            to="/admin/dashboard" 
            onClick={() => {
              setActiveSubmenu(null);
              closeMobile && closeMobile();
            }}
          >
            <FaHome />
            {(!isCollapsed || mobileOpen) && <span>Dashboard</span>}
          </Link>
        </li>

        {/* Category Menu */}
        <li className="submenu-container">
          <div className="submenu-toggle" onClick={() => toggleSubmenu('category')}>
            <div className="menu-title-wrapper">
              <FaTags />
              {(!isCollapsed || mobileOpen) && <span>Category</span>}
            </div>
            {(!isCollapsed || mobileOpen) && (
              activeSubmenu === 'category' ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />
            )}
          </div>
          {(activeSubmenu === 'category' && (!isCollapsed || mobileOpen)) && (
            <ul className="submenu-list">
              <li><Link to="/admin/category/all" onClick={closeMobile}>All Categories</Link></li>
              <li><Link to="/admin/category/add" onClick={closeMobile}>Add Category</Link></li>
              <li><Link to="/admin/category/sub" onClick={closeMobile}>Add Sub Category</Link></li>
              <li><Link to="/admin/category/child" onClick={closeMobile}>Add Sub Child Category</Link></li>
            </ul>
          )}
        </li>

        {/* Product Menu */}
        <li className="submenu-container">
          <div className="submenu-toggle" onClick={() => toggleSubmenu('product')}>
            <div className="menu-title-wrapper">
              <FaBoxOpen />
              {(!isCollapsed || mobileOpen) && <span>Product</span>}
            </div>
            {(!isCollapsed || mobileOpen) && (
              activeSubmenu === 'product' ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />
            )}
          </div>
          {(activeSubmenu === 'product' && (!isCollapsed || mobileOpen)) && (
            <ul className="submenu-list">
              <li><Link to="/admin/product/all" onClick={closeMobile}>All Products</Link></li>
              <li><Link to="/admin/product/add" onClick={closeMobile}>Add Product</Link></li>
              <li><Link to="/admin/product/brands" onClick={closeMobile}>Brands</Link></li>
              <li><Link to="/admin/product/image" onClick={closeMobile}>Image</Link></li>
            </ul>
          )}
        </li>

        {/* Order Menu */}
        <li className="submenu-container">
          <div className="submenu-toggle" onClick={() => toggleSubmenu('order')}>
            <div className="menu-title-wrapper">
              <FaShoppingCart />
              {(!isCollapsed || mobileOpen) && <span>Order</span>}
            </div>
            {(!isCollapsed || mobileOpen) && (
              activeSubmenu === 'order' ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />
            )}
          </div>
          {(activeSubmenu === 'order' && (!isCollapsed || mobileOpen)) && (
            <ul className="submenu-list">
              <li><Link to="/admin/order/all" onClick={closeMobile}>All Orders</Link></li>
              <li><Link to="/admin/order/create" onClick={closeMobile}>New Orders</Link></li>
              <li><Link to="/admin/order/due" onClick={closeMobile}>Due Orders</Link></li>
              <li><Link to="/admin/order/completed" onClick={closeMobile}>Completed Orders</Link></li>
            </ul>
          )}
        </li>

        {/* Inventory Menu */}
        <li className="submenu-container">
          <div className="submenu-toggle" onClick={() => toggleSubmenu('inventory')}>
            <div className="menu-title-wrapper">
              <FaWarehouse />
              {(!isCollapsed || mobileOpen) && <span>Inventory</span>}
            </div>
            {(!isCollapsed || mobileOpen) && (
              activeSubmenu === 'inventory' ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />
            )}
          </div>
          {(activeSubmenu === 'inventory' && (!isCollapsed || mobileOpen)) && (
            <ul className="submenu-list">
              <li><Link to="/admin/inventory/stocks" onClick={closeMobile}>Stock Management</Link></li>
              <li><Link to="/admin/inventory/low-stock" onClick={closeMobile}>Low Stock Alert</Link></li>
              <li><Link to="/admin/inventory/history" onClick={closeMobile}>Stock History</Link></li>
              <li><Link to="/admin/inventory/purchase" onClick={closeMobile}>Stock Purchase</Link></li>
            </ul>
          )}
        </li>

        {/* Customer Menu */}
        <li className="submenu-container">
          <div className="submenu-toggle" onClick={() => toggleSubmenu('customer')}>
            <div className="menu-title-wrapper">
              <FaUserFriends />
              {(!isCollapsed || mobileOpen) && <span>Customer</span>}
            </div>
            {(!isCollapsed || mobileOpen) && (
              activeSubmenu === 'customer' ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />
            )}
          </div>
          {(activeSubmenu === 'customer' && (!isCollapsed || mobileOpen)) && (
            <ul className="submenu-list">
              <li><Link to="/admin/customer/all" onClick={closeMobile}>All Customers</Link></li>
              <li><Link to="/admin/customer/add" onClick={closeMobile}>Add Customer</Link></li>
              <li><Link to="/admin/customer/ledger" onClick={closeMobile}>Customer Ledger</Link></li>
            </ul>
          )}
        </li>

        {/* Users Management */}
        <li className="submenu-container">
          <div className="submenu-toggle" onClick={() => toggleSubmenu('users')}>
            <div className="menu-title-wrapper">
              <FaUsers />
              {(!isCollapsed || mobileOpen) && <span>Users</span>}
            </div>
            {(!isCollapsed || mobileOpen) && (
              activeSubmenu === 'users' ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />
            )}
          </div>
          {(activeSubmenu === 'users' && (!isCollapsed || mobileOpen)) && (
            <ul className="submenu-list">
              <li><Link to="/admin/users/all" onClick={closeMobile}>All Users</Link></li>
              <li><Link to="/admin/users/add" onClick={closeMobile}>Add New User</Link></li>
            </ul>
          )}
        </li>
      </ul>
    </div>
  );
}