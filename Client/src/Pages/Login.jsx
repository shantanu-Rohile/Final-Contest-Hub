import React, { useState } from "react";
import axios from "axios";
import { Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../config/backend";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    axios
      .post(`${BACKEND_URL}/login`, {
        email,
        password,
      })
      .then((res) => {
        localStorage.setItem("token", res.data.token);
        navigate(`/main/${res.data.ID}`);
      })
      .catch((err) =>
        alert(err.response?.data?.message || "Login Failed")
      );
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        height: "100vh",
        background: "linear-gradient(135deg, #ff512f, #1c1c1c, #f09819)",
      }}
    >
      <div
        style={{
          width: "420px",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
          padding: "2.5rem",
          color: "white",
          boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
        }}
      >
        <h2 className="text-center mb-2">Welcome Back</h2>
        <p className="text-center mb-4" style={{ opacity: 0.75 }}>
          Login to continue to ContestHub
        </p>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Control
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: "12px" }}
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Control
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: "12px" }}
            />
          </Form.Group>

          <Button
            type="submit"
            style={{
              width: "100%",
              backgroundColor: "#ff9f1a",
              border: "none",
              padding: "12px",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            Login
          </Button>
        </Form>
      </div>
    </div>
  );
}

export default Login;
