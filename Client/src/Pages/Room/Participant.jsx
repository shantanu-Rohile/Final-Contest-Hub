import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import { BACKEND_URL } from "../../config/backend";

function Participant() {
  const { id, useId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [username, setUsername] = useState("");
  const [hostId, setHostId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Contest state (server is source of truth)
  const [status, setStatus] = useState("waiting");
  // Individual progression state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [questionStartedAt, setQuestionStartedAt] = useState(null);

  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  const [selectedByQuestionId, setSelectedByQuestionId] = useState({});

  const [timeLeft, setTimeLeft] = useState(0);
  const [contestCompleted, setContestCompleted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const finishedRef = useRef(false);

  const isHost = hostId && String(hostId) === String(useId);

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    async function fetchData() {
      try {
        const userRes = await axios.get(`${BACKEND_URL}/login/${useId}`);
        setUsername(userRes.data.name);

        const roomRes = await axios.get(`${BACKEND_URL}/room/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        setQuestions(roomRes.data.questions || []);
        setHostId(roomRes.data.host);
        setStatus(roomRes.data.status);

        // Individual progression is controlled by socket sync-state
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, useId]);

  /* ================= SOCKET ================= */

  useEffect(() => {
    if (!id || !useId || !username) return;

    socketRef.current = io(BACKEND_URL);

    socketRef.current.emit("Join-Room", {
      id,
      useId,
      username,
    });

    socketRef.current.on("sync-state", (s) => {
      if (!s) return;
      if (s.status) setStatus(s.status);
      if (s.participant) {
        if (typeof s.participant.currentQuestionIndex === "number") {
          setCurrentQuestionIndex(s.participant.currentQuestionIndex);
        }
        if (s.participant.currentQuestionStartedAt) {
          setQuestionStartedAt(new Date(s.participant.currentQuestionStartedAt));
        }
        if (s.participant.completed) {
          setContestCompleted(true);
        }
      }
    });

    socketRef.current.on("contest-started", () => {
      setStatus("live");
    });

    // Individual progression updates
    socketRef.current.on("your-state", (p) => {
      if (!p) return;
      if (typeof p.currentQuestionIndex === "number") setCurrentQuestionIndex(p.currentQuestionIndex);
      if (p.currentQuestionStartedAt) setQuestionStartedAt(new Date(p.currentQuestionStartedAt));
      if (p.completed) {
        setContestCompleted(true);
      }
    });

    socketRef.current.on("contest-ended", () => {
      setStatus("ended");
      finishContest();
    });

    socketRef.current.on("leaderboard-data", (data) => {
      setLeaderboard(data || []);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [id, useId, username]);

  /* ================= BACK BUTTON BEHAVIOR ================= */

  useEffect(() => {
    // If user hits the browser Back button during the test, they leave the test.
    window.history.pushState(null, "", window.location.href);

    const onPopState = () => {
      navigate(`/main/${useId}`, { replace: true });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigate, useId]);

  /* ================= TIMER (SYNCED) ================= */

  useEffect(() => {
    if (!questions.length) return;
    if (status !== "live") return;
    if (!questionStartedAt) return;
    if (contestCompleted) return;
    if (currentQuestionIndex < 0) return;

    const q = questions[currentQuestionIndex];
    const limit = q?.timeLimit || 30;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(questionStartedAt).getTime()) / 1000);
      const remaining = Math.max(0, limit - elapsed);
      setTimeLeft(remaining);

      // If time runs out and user hasn't answered, auto-advance with a null submission.
      if (remaining === 0 && q?._id && !answeredQuestions.has(q._id)) {
        socketRef.current?.emit("submit-answer", {
          roomId: id,
          questionId: q._id,
          selectedOption: null,
        });

        setAnsweredQuestions((prev) => {
          const updated = new Set(prev);
          updated.add(q._id);
          return updated;
        });
      }
    };

    tick();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(tick, 250);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [questions, currentQuestionIndex, questionStartedAt, status, contestCompleted, id, answeredQuestions]);

  /* ================= LOGIC ================= */

  const finishContest = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setContestCompleted(true);
    socketRef.current?.emit("contest-completed", { roomId: id });
  };

  const submitAnswer = (questionId, optionIndex) => {
    if (status !== "live") return;
    if (timeLeft <= 0) return;
    if (answeredQuestions.has(questionId)) return;

    socketRef.current?.emit("submit-answer", {
      roomId: id,
      questionId,
      selectedOption: optionIndex,
    });

    setAnsweredQuestions((prev) => {
      const updated = new Set(prev);
      updated.add(questionId);
      return updated;
    });

    setSelectedByQuestionId((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const startContestAsHost = () => {
    if (!isHost) return;
    socketRef.current?.emit("start-contest", id);
  };

  // host does not control pacing anymore

  if (loading) return <div style={{ color: "white" }}>Loading...</div>;

  const currentQuestion = currentQuestionIndex >= 0 ? questions[currentQuestionIndex] : null;
  const currentQuestionId = currentQuestion?._id;
  const alreadyAnswered = currentQuestionId ? answeredQuestions.has(currentQuestionId) : false;

  /* ================= UI ================= */

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
          width: "900px",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: "18px",
          padding: "2.5rem",
          color: "white",
          boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
        }}
      >
        <h2 className="text-center mb-3">Hi {username}</h2>

        {status === "waiting" && isHost && (
          <div style={{ textAlign: "center" }}>
            <p style={{ opacity: 0.85 }}>Upload questions in the Host Panel, then start the contest.</p>
            <button
              onClick={startContestAsHost}
              style={{
                backgroundColor: "#3498db",
                border: "none",
                padding: "12px 18px",
                borderRadius: "10px",
                color: "white",
                fontWeight: "600",
              }}
              disabled={!questions.length}
            >
              Start Contest
            </button>
          </div>
        )}

        {status === "waiting" && !isHost && (
          <p style={{ textAlign: "center", opacity: 0.85 }}>Waiting for host to start…</p>
        )}

        {!contestCompleted && status === "live" && currentQuestion && (
          <>
            <h4 className="text-center mb-4">
              ⏳ Time Left: <span style={{ color: "#ff9f1a" }}>{timeLeft}s</span>
            </h4>

            <div
              style={{
                background: "rgba(0,0,0,0.35)",
                padding: "1.5rem",
                borderRadius: "12px",
                marginBottom: "1.5rem",
              }}
            >
              <h4>
                Q{currentQuestionIndex + 1}. {currentQuestion.questionText}
              </h4>
            </div>

            {currentQuestion.options.map((opt, i) => {
              const selected = selectedByQuestionId[currentQuestionId] === i;

              return (
                <div
                  key={i}
                  onClick={() => submitAnswer(currentQuestionId, i)}
                  style={{
                    background: selected
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(0,0,0,0.35)",
                    padding: "1rem",
                    borderRadius: "10px",
                    marginBottom: "0.7rem",
                    cursor: alreadyAnswered || timeLeft <= 0 ? "not-allowed" : "pointer",
                    opacity: alreadyAnswered ? 0.7 : 1,
                    pointerEvents: alreadyAnswered || timeLeft <= 0 ? "none" : "auto",
                    transition: "0.2s",
                  }}
                >
                  {String.fromCharCode(65 + i)}. {opt.text}
                </div>
              );
            })}

            {/* Individual-paced contest: no host-driven next-question */}
          </>
        )}

        {status !== "waiting" && (
          <div style={{ marginTop: "2rem" }}>
            <h2 className="text-center mb-4">🏆 {contestCompleted ? "Final Leaderboard" : "Leaderboard"}</h2>

            {leaderboard.length === 0 && (
              <p style={{ textAlign: "center", opacity: 0.75 }}>Waiting for leaderboard…</p>
            )}

            {leaderboard.map((u, i) => (
              <div
                key={i}
                style={{
                  background:
                    i === 0 ? "linear-gradient(90deg,#ffd70033,#ffffff11)" : "rgba(0,0,0,0.35)",
                  padding: "1rem",
                  borderRadius: "10px",
                  marginBottom: "0.6rem",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  #{i + 1} {u.username}
                </span>
                <span style={{ color: "#ff9f1a", fontWeight: "bold" }}>{u.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Participant;
