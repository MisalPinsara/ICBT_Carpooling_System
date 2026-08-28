import { useEffect, useRef, useState } from "react";
import { Send, MessageSquare, Car, MapPin, Clock, User, ArrowLeft, RefreshCw } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { LoadingWindow } from "../components/LoadingWindow";
import { api } from "../services/api";

export function MessagesPage(props) {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const currentUserId = (props.user?.id || props.user?._id || "").toString();

  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      const list = res.conversations || [];
      setConversations(list);

      const targetOfferId = sessionStorage.getItem("activeChatOfferId");
      const targetPartnerId = sessionStorage.getItem("activeChatPartnerId");

      if (targetOfferId && targetPartnerId && list.length > 0) {
        const found = list.find(
          (c) => c.rideOfferId === targetOfferId && c.partnerUserId === targetPartnerId
        );
        if (found) {
          setActiveConv(found);
        } else if (list[0]) {
          setActiveConv(list[0]);
        }
      } else if (list.length > 0 && !activeConv) {
        setActiveConv(list[0]);
      }
    } catch (err) {
      setError(err.message || "Failed to load conversations.");
    } finally {
      setLoadingConvs(false);
    }
  };

  const loadMessages = async (conv) => {
    if (!conv) return;
    setLoadingMsgs(true);
    setSendError("");
    try {
      const res = await api.getMessages(conv.rideOfferId, conv.partnerUserId);
      setMessages(res.messages || []);
    } catch (err) {
      setSendError(err.message || "Failed to load messages.");
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv);
      const interval = setInterval(() => {
        api.getMessages(activeConv.rideOfferId, activeConv.partnerUserId)
          .then((res) => setMessages(res.messages || []))
          .catch(() => {});
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setSendError("Message content cannot be empty.");
      return;
    }
    if (!activeConv) return;

    setSending(true);
    setSendError("");

    try {
      const res = await api.sendMessage({
        rideOfferId: activeConv.rideOfferId,
        recipientUserId: activeConv.partnerUserId,
        content: inputText.trim()
      });
      setInputText("");
      setMessages((prev) => [...prev, res.data || res.messageItem]);
    } catch (err) {
      setSendError(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  if (loadingConvs) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="Loading messages..." />
      </AppShell>
    );
  }

  return (
    <AppShell {...props}>
      <section className="intro compact-intro" style={{ marginBottom: "1rem" }}>
        <h2>Messages</h2>
        <p>Coordinate pickup locations and journey details with your carpool partners.</p>
      </section>

      {error && <p className="validation-message" style={{ marginBottom: "1rem" }}>{error}</p>}

      <section className="panel" style={{ display: "grid", gridTemplateColumns: conversations.length ? "320px 1fr" : "1fr", minHeight: "560px", overflow: "hidden" }}>
        {/* Left Sidebar: Conversations list */}
        <div style={{ borderRight: conversations.length ? "1px solid #e2e8f0" : "none", padding: "1rem", backgroundColor: "#f8fafc" }}>
          <h3 style={{ fontSize: "0.95rem", color: "#475569", marginBottom: "0.85rem" }}>
            Conversations ({conversations.length})
          </h3>

          {!conversations.length ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "#94a3b8" }}>
              <MessageSquare size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
              <p style={{ fontSize: "0.875rem", margin: 0 }}>No message conversations yet.</p>
              <p style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: 4 }}>
                Request to join a ride or accept passengers to start communicating.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {conversations.map((conv) => {
                const isSelected = activeConv?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "8px",
                      backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                      border: isSelected ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <strong style={{ fontSize: "0.875rem", color: "#1e293b" }}>{conv.partner?.name || "Carpool User"}</strong>
                      {conv.lastMessage?.createdAt && (
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                          {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    {conv.offer && (
                      <div style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: 500, marginBottom: 4 }}>
                        <MapPin size={11} style={{ display: "inline", marginRight: 3 }} />
                        {conv.offer.origin} → {conv.offer.destination}
                      </div>
                    )}
                    {conv.lastMessage && (
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {conv.lastMessage.senderUserId === currentUserId ? "You: " : ""}{conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Main Chat Panel */}
        <div style={{ display: "flex", flexDirection: "column", height: "560px", backgroundColor: "#ffffff" }}>
          {!activeConv ? (
            <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#94a3b8" }}>
              <div style={{ textAlign: "center" }}>
                <MessageSquare size={44} style={{ opacity: 0.4, margin: "0 auto 0.75rem" }} />
                <p>Select a conversation to view and send messages.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", margin: 0, color: "#0f172a" }}>{activeConv.partner?.name}</h3>
                  {activeConv.offer && (
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                      Journey: {activeConv.offer.origin} → {activeConv.offer.destination} ({activeConv.offer.departureDate} {activeConv.offer.departureTime})
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="secondary-button compact"
                  style={{ gap: 4, fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                  onClick={() => loadMessages(activeConv)}
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {/* Message History Stream */}
              <div style={{ flex: 1, padding: "1rem 1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {loadingMsgs ? (
                  <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>Loading message thread...</p>
                ) : messages.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.875rem", margin: "auto" }}>
                    No messages yet. Send a message below to coordinate your ride.
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMine = (msg.senderUserId || msg.sender?.id) === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isMine ? "flex-end" : "flex-start",
                          maxWidth: "75%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isMine ? "flex-end" : "flex-start"
                        }}
                      >
                        <div
                          style={{
                            padding: "0.65rem 0.95rem",
                            borderRadius: isMine ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                            backgroundColor: isMine ? "#2563eb" : "#f1f5f9",
                            color: isMine ? "#ffffff" : "#0f172a",
                            fontSize: "0.875rem",
                            lineHeight: 1.4,
                            wordBreak: "break-word"
                          }}
                        >
                          {msg.content}
                        </div>
                        <span style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 3, padding: "0 4px" }}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {sendError && (
                <p className="validation-message" style={{ margin: "0 1.25rem 0.5rem 1.25rem" }}>{sendError}</p>
              )}

              {/* Message Composer Input */}
              <form onSubmit={handleSend} style={{ padding: "0.85rem 1.25rem", borderTop: "1px solid #e2e8f0", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setSendError("");
                  }}
                  style={{
                    flex: 1,
                    padding: "0.65rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.875rem",
                    outline: "none"
                  }}
                />
                <button
                  type="submit"
                  className="primary-button compact"
                  disabled={sending || !inputText.trim()}
                  style={{ gap: 6 }}
                >
                  <Send size={14} /> Send
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}
