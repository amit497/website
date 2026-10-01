import { useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNavbar from './MobileNavbar';
import './AdminLayout.css';
import AddCategory from '../pages/categories/AddCategory';
import AddSubCategory from '../pages/categories/AddSubCategory';
import AddSubChildCategory from '../pages/categories/AddSubChildCategory';
import AllCategories from '../pages/categories/AllCategories';
import AllProducts from '../pages/products/AllProducts';
import AddProduct from '../pages/products/AddProduct';
import Brands from '../pages/products/Brands';
import ImageGallery from '../pages/products/Image';
import AllCustomers from '../pages/customers/AllCustomers';
import AddCustomer from '../pages/customers/AddCustomer';
import CustomerLedger from '../pages/customers/CustomerLedger';
import StockManagement from '../pages/inventory/StockManagement';
import LowStockAlert from '../pages/inventory/LowStockAlert';
import StockHistory from '../pages/inventory/StockHistory';
import Purchase from '../pages/inventory/Purchase';
import AllOrders from '../pages/orders/AllOrders';
import CompletedOrders from '../pages/orders/CompletedOrders';
import DueOrders from '../pages/orders/DueOrders';
import NewOrders from '../pages/orders/NewOrders';
import AllUsers from '../pages/users/AllUsers';
import AddUser from '../pages/users/AddUser';
import Dashboard from '../pages/Dashboard/Dashboard';

export default function AdminLayout({ setIsAuthenticated }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('auth');
    navigate('/login');
  };

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(!mobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        mobileOpen={mobileOpen} 
        closeMobile={() => setMobileOpen(false)} 
      />

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main Area */}
      <div className="admin-main">
        <Header toggleSidebar={toggleSidebar} handleLogout={handleLogout} />
        
        {/* Dynamic Content Area Using Nested Routes */}
        <div className="admin-content">
          <Routes>
            {/* Dashboard Route */}
            <Route path="dashboard" element={<Dashboard />} />

            {/* Category Routes */}
            <Route path="category/all" element={<AllCategories />} />
            <Route path="category/add" element={<AddCategory />} />
            <Route path="category/sub" element={<AddSubCategory />} />
            <Route path="category/child" element={<AddSubChildCategory />} />

            {/* Product Routes */}
            <Route path="product/all" element={<AllProducts />} />
            <Route path="product/add" element={<AddProduct />} />
            <Route path="product/brands" element={<Brands />} />
            <Route path="product/image" element={<ImageGallery />} />

            {/* Customer Routes */}
            <Route path="customer/all" element={<AllCustomers />} />
            <Route path="customer/add" element={<AddCustomer />} />
            <Route path="customer/ledger" element={<CustomerLedger />} />

            {/* Inventory Routes */}
            <Route path="inventory/stocks" element={<StockManagement />} />
            <Route path="inventory/low-stock" element={<LowStockAlert />} />
            <Route path="inventory/history" element={<StockHistory />} />
            <Route path="inventory/purchase" element={<Purchase />} />

            {/* Order Routes */}
            <Route path="order/all" element={<AllOrders />} />
            <Route path="order/create" element={<NewOrders />} />
            <Route path="order/due" element={<DueOrders />} />
            <Route path="order/completed" element={<CompletedOrders />} />

            {/* User Routes */}
            <Route path="users/all" element={<AllUsers />} />
            <Route path="users/add" element={<AddUser />} />
          </Routes>
        </div>

        {/* Mobile Navigation Bar */}
        <MobileNavbar />
      </div>
    </div>
  );
}