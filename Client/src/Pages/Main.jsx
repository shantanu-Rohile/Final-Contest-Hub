import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Button, Form } from "react-bootstrap";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { BACKEND_URL } from "../config/backend";

function Main() {
  const [roomName, setRoomName] = useState("");
  const [roomId, setRoomId] = useState("");
  const socketRef = useRef(null);

  const navigate = useNavigate();
  const {useId} = useParams();

  useEffect(() => {
    socketRef.current = io(BACKEND_URL, {
      auth: { token: localStorage.getItem("token") },
    });

    socketRef.current.on("id", (data) => {
      console.log("Socket connected:", data);
    });

    return () => socketRef.current.disconnect();
  }, []);

  const handleCreateRoom = (e) => {
    e.preventDefault();

    axios
      .post(
        `${BACKEND_URL}/room/create`,
        { roomName },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      )
      .then((res) => {
        const createdRoomId = res.data.roomId || res.data;
        setRoomName("");
        navigate(`/room/${useId}/${createdRoomId}`);
      })
      .catch((err) => console.error("Creation Error:", err));
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!roomId) return;

    navigate(`/room/${useId}/${roomId}`);
    setRoomId("");
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
          width: "520px",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: "18px",
          padding: "2.5rem",
          color: "white",
          boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
        }}
      >
        {/* CREATE ROOM */}
        <h3 className="text-center mb-3">Create Room</h3>

        <Form onSubmit={handleCreateRoom} className="mb-4">
          <Form.Group className="mb-3">
            <Form.Control
              placeholder="Room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
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
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            Create Room
          </Button>
        </Form>

        {/* DIVIDER */}
        <div
          style={{
            height: "1px",
            background: "rgba(255,255,255,0.3)",
            margin: "2rem 0",
          }}
        />

        {/* JOIN ROOM */}
        <h3 className="text-center mb-3">Join Room</h3>

        <Form onSubmit={handleJoinRoom}>
          <Form.Group className="mb-3">
            <Form.Control
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
              style={{ padding: "12px" }}
            />
          </Form.Group>

          <Button
            type="submit"
            variant="outline-light"
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            Join Room
          </Button>
        </Form>
      </div>
    </div>
  );
}

export default Main;
