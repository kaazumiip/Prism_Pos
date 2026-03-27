import { useState } from "react";
import POSCartUI from './components/cart.jsx'
import Login from "./Login";
import Dashboard from "./Dashboard";
import History from "./History";
import './App.css'

function App() {
  const [page, setPage] = useState("cart"); // 'cart', 'login', 'dashboard'
  const [user, setUser] = useState(null);

  const [previousPage, setPreviousPage] = useState("dashboard");

  // Navigation handlers
  const goToLogin = () => setPage("login");
  const goToCart = () => setPage("cart");
  const goToDashboard = () => setPage("dashboard");
  const goToHistory = () => {
    setPreviousPage(page);
    setPage("history");
  };

  // Login handler
  const handleLoginSuccess = (role) => {
    setUser(role);
    goToDashboard();
  };

  return (
    <>
      {page === "cart" && (
        <POSCartUI
          onNavigateToLogin={goToLogin}
          onViewHistory={goToHistory}
        />
      )}

      {page === "login" && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onBackToCart={goToCart}
        />
      )}

      {page === "dashboard" && (
        <Dashboard
          onBackToCart={goToCart}
          onViewHistory={goToHistory}
        />
      )}

      {page === "history" && (
        <History
          onBack={previousPage === "cart" ? goToCart : goToDashboard}
          backLabel={previousPage === "cart" ? "Back to POS" : "Back to Dashboard"}
        />
      )}
    </>
  )
}

export default App

