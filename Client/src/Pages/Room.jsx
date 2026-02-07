import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import WaitingLobby from "./Room/WaitingLobby";
import HostInterface from "./Room/HostInterface";
import Participant from "./Room/Participant";
import { BACKEND_URL } from "../config/backend";

function Room() {
  const { id } = useParams();
  const {useId}=useParams()
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole]=useState("");
  const [username, setUsername] = useState("");
  const socketRef = useRef(null);
  useEffect(() => {
    (async () => {
      try {
        const userRes = await axios.get(`${BACKEND_URL}/login/${useId}`);
        setUsername(userRes.data.name);

        const roomRes = await axios.get(`${BACKEND_URL}/room/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setStatus(roomRes.data.status);
        setRole(roomRes.data.host);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Keep room status in sync via socket events
  useEffect(() => {
    if (!id || !useId || !username) return;
    socketRef.current = io(BACKEND_URL);

    socketRef.current.emit("Join-Room", { id, useId, username });

    socketRef.current.on("sync-state", (s) => {
      if (s?.status) setStatus(s.status);
    });
    socketRef.current.on("contest-started", () => setStatus("live"));
    socketRef.current.on("contest-ended", () => setStatus("ended"));

    return () => socketRef.current?.disconnect();
  }, [id, useId, username]);

  if (loading) return <h2>Loading room...</h2>;

  return (
    <>
    {String(useId) === String(role) && status === "waiting" && <HostInterface />}
    {String(useId) !== String(role) && status === "waiting" && <WaitingLobby />}
    {status === "live" && <Participant />}
    {status === "ended" && <Participant />}
    </>
  );
}

export default Room;