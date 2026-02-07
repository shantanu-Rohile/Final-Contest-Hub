import React from "react";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        height: "100vh",
        background: "linear-gradient(135deg, #ff512f, #1c1c1c, #f09819)",
      }}
    >
      <div
        className="text-center p-5"
        style={{
          background: "rgba(255,255,255,0.08)",
          borderRadius: "16px",
          backdropFilter: "blur(10px)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          color: "white",
          minWidth: "400px",
        }}
      >
        <h1 style={{ fontSize: "3.5rem", fontWeight: "700" }}>
          Contest<span style={{ color: "#ff9f1a" }}>Hub</span>
        </h1>

        <p style={{ opacity: 0.8, marginBottom: "2rem" }}>
          Host & compete in real-time contests
        </p>

        <div className="d-flex justify-content-center gap-4">
          <Button
            onClick={() => navigate("/login")}
            style={{
              backgroundColor: "#ff9f1a",
              border: "none",
              padding: "12px 28px",
              fontSize: "18px",
            }}
          >
            Login
          </Button>

          <Button
            onClick={() => navigate("/signup")}
            variant="outline-light"
            style={{
              padding: "12px 28px",
              fontSize: "18px",
            }}
          >
            Signup
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Home;
