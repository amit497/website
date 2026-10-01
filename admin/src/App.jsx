import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login/Login';
import ProtectedRoute from './components/Protected/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout/AdminLayout';
import Register from './components/auth/Register/Register';
import ForgotPassword from './components/auth/ForgotPassword/ForgotPassword';

function App() {
  // Check localStorage so page refresh korle login state chole na jay
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('auth') === 'true'
  );

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Pages */}
        <Route 
          path="/auth/login" 
          element={<Login setIsAuthenticated={setIsAuthenticated} />} 
        />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />

        {/* Protected Admin Layout */}
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AdminLayout setIsAuthenticated={setIsAuthenticated} />
            </ProtectedRoute>
          } 
        />

        {/* Default Redirect to Login */}
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;