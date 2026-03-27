import { useState } from "react";
import axios from "axios";
import { Maximize, Minimize, ArrowLeft } from "lucide-react";

export default function Login({ onLoginSuccess, onBackToCart }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await axios.post("http://localhost:3000/login", form);
      if (res.data.success) {
        onLoginSuccess(res.data.role);
      } else {
        setError("Invalid username or password");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container} className="animate-page-enter">
      {/* LEFT SIDE: Deep Purple Brand Panel (Inspired by Card) */}
      <div style={styles.brandSection}>
        <div style={styles.brandContent}>
          <img src="/prism_logo.png" alt="PRISM" style={styles.logoImage} />
          <div style={styles.brandDecoration}></div>
        </div>
      </div>

      {/* RIGHT SIDE: Dark Form */}
      <div style={styles.formSection}>
        <button
          onClick={toggleFullScreen}
          style={styles.fullscreenBtn}
          title="Toggle Fullscreen"
        >
          {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>

        <div style={styles.loginBox}>
          <div style={styles.header}>
            {/* Pink Heading inspired by "INITIAL THOUGHT" */}
            <h2 style={styles.title}>STAFF LOGIN</h2>
            <p style={styles.subtitle}>Enter your credentials to access the workspace</p>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                placeholder="Ex. admin"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            {error && (
              <div style={styles.error}>
                <span style={{ marginRight: '8px' }}>⚠️</span>{error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                ...styles.button,
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? "wait" : "pointer"
              }}
            >
              {isLoading ? "AUTHENTICATING..." : "LOG IN"}
            </button>
          </form>

          <div style={styles.footer}>
            <button onClick={onBackToCart} style={styles.backLink}>
              <ArrowLeft size={16} /> Back to POS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    backgroundColor: "#050505", // Black BG
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: "hidden",
    overflow: "hidden",
    // animation: "fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards", // Replaced by global class
  },
  brandSection: {
    flex: "1",
    backgroundColor: "#4a148c", // Deep Purple (Reference)
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "80px",
    position: "relative",
    color: "white",
    overflow: "hidden",
  },
  brandContent: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center", // Center the single logo
    width: "100%",
  },
  brandTitle: {
    fontSize: "64px",
    fontWeight: "900",
    letterSpacing: "-2px",
    margin: "0 0 16px 0",
    lineHeight: "0.9",
    color: "white",
    textTransform: "uppercase",
  },
  brandSubtitle: {
    fontSize: "24px",
    color: "rgba(255,255,255,0.8)",
    fontWeight: "700",
    margin: 0,
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  logoImage: {
    width: "240px", // Reduced size as requested
    height: "auto",
    filter: "none",
  },
  brandDecoration: {
    position: "absolute",
    top: "-50%",
    left: "-20%",
    width: "100%",
    height: "200%",
    background: "linear-gradient(45deg, transparent 45%, rgba(255,0,127,0.1) 50%, transparent 55%)",
    pointerEvents: "none",
  },
  formSection: {
    width: "500px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
    position: "relative",
    backgroundColor: "#050505", // Near Black
  },
  fullscreenBtn: {
    position: 'absolute',
    top: '24px',
    right: '24px',
    background: 'none',
    border: 'none',
    color: '#555',
    cursor: 'pointer',
    padding: '8px',
    transition: 'color 0.2s',
  },
  loginBox: {
    width: "100%",
    maxWidth: "360px",
  },
  header: {
    marginBottom: "40px",
  },
  title: {
    fontSize: "36px",
    fontWeight: "900",
    color: "#ff007f", // Hot Pink Title
    margin: "0 0 8px 0",
    letterSpacing: "-1px",
    textTransform: "uppercase",
    lineHeight: "1",
  },
  subtitle: {
    fontSize: "14px",
    color: "#a3a3a3",
    lineHeight: "1.5",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  input: {
    width: "100%",
    padding: "16px",
    fontSize: "15px",
    border: "2px solid #333", // Dark Border
    borderRadius: "0px", // Square borders
    outline: "none",
    transition: "all 0.2s",
    backgroundColor: "#121212",
    color: "white",
    fontWeight: "500",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "16px",
    fontSize: "16px",
    fontWeight: "800",
    color: "#ffffff",
    backgroundColor: "transparent",
    border: "2px solid #ff007f", // Pink Border Button
    borderRadius: "100px", // Rounded like "+info"
    cursor: "pointer",
    transition: "all 0.2s",
    marginTop: "16px",
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  error: {
    padding: "12px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    color: "#ef4444",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "600",
    border: "1px solid #ef4444",
    display: "flex",
    alignItems: "center",
  },
  footer: {
    marginTop: "48px",
    textAlign: "center",
  },
  backLink: {
    background: "none",
    border: "none",
    fontSize: "14px",
    color: "#666",
    cursor: "pointer",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "color 0.2s",
  },
};

// Inject focus/hover styles
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    input:focus {
      border-color: #ff007f !important; /* Pink Focus */
      background-color: #000 !important;
    }
    button[type="submit"]:hover {
      background-color: #ff007f !important;
      box-shadow: 0 0 20px rgba(255, 0, 127, 0.5);
    }
  `;
  document.head.appendChild(style);
}