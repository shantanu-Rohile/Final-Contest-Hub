import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import { BACKEND_URL } from "../../config/backend";

function WaitingLobby() {
  const { id, useId } = useParams();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [username, setUsername] = useState("");

  const socketRef = useRef(null);

  useEffect(() => {
    if (!id) return;

    axios
      .get(`${BACKEND_URL}/login/${useId}`)
      .then((res) => setUsername(res.data.name))
      .catch(console.error);

    axios
      .get(`${BACKEND_URL}/room/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setRoomData(res.data);
        setParticipants(
          res.data.participants.map((p) => ({
            userId: p.userId,
            username: p.username || "Anonymous",
          }))
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching room:", err);
        setLoading(false);
      });
  }, [id, useId]);

  useEffect(() => {
    if (!id || !useId || !username) return;

    socketRef.current = io(BACKEND_URL);

    socketRef.current.emit("Join-Room", {
      id,
      useId,
      username,
    });

    socketRef.current.on("participants-updated", (list) => {
      setParticipants(list || []);
    });

    return () => socketRef.current.disconnect();
  }, [id, useId, username]);

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh", color: "white" }}
      >
        Loading lobby...
      </div>
    );
  }

  if (!roomData) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh", color: "white" }}
      >
        Room not found.
      </div>
    );
  }

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #ff512f, #1c1c1c, #f09819)",
        padding: "2rem",
      }}
    >
      <div
        style={{
          width: "700px",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: "18px",
          padding: "2.5rem",
          color: "white",
          boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
        }}
      >
        <h2 className="mb-2">
          Hi <span style={{ color: "#ff9f1a" }}>{username}</span>
        </h2>

        <h4 className="mb-3">
          Welcome to <strong>{roomData.roomName}</strong>
        </h4>

        <p style={{ opacity: 0.8 }}>Room ID: {id}</p>

        {/* DIVIDER */}
        <div
          style={{
            height: "1px",
            background: "rgba(255,255,255,0.3)",
            margin: "2rem 0",
          }}
        />

        <h4 className="mb-3">
          Participants ({participants.length})
        </h4>

        {participants.length === 0 && (
          <p style={{ opacity: 0.7 }}>Waiting for players to join...</p>
        )}

        {participants.map((user, index) => (
          <div
            key={index}
            style={{
              background: "rgba(0,0,0,0.35)",
              padding: "0.9rem 1.2rem",
              borderRadius: "10px",
              marginBottom: "0.6rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{user.username}</span>
            <span style={{ opacity: 0.6, fontSize: "0.85rem" }}>
              {user.userId}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WaitingLobby;
