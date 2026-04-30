package chathandler

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"Necrocode/api/services"

	"github.com/gorilla/websocket"
)

type Client struct {
	login string
	conn  *websocket.Conn
	send  chan []byte
}

type Hub struct {
	mu      sync.RWMutex
	clients map[string]*Client
}

type Handler struct {
	Hub *Hub
}

type IncomingMessage struct {
	Type string `json:"type"`
	To   string `json:"to"`
	Text string `json:"text"`
}

type OutgoingMessage struct {
	Type   string `json:"type"`
	From   string `json:"from"`
	To     string `json:"to"`
	Text   string `json:"text"`
	SentAt string `json:"sentAt"`
}

type HandshakeMessage struct {
	Type  string `json:"type"`
	Login string `json:"login"`
}

func NewHub() *Hub {
	return &Hub{clients: make(map[string]*Client)}
}

func (h *Hub) Register(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client.login] = client
}

func (h *Hub) Unregister(login string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if client, ok := h.clients[login]; ok {
		close(client.send)
		delete(h.clients, login)
	}
}

func (h *Hub) SendTo(login string, payload []byte) {
	h.mu.RLock()
	client, ok := h.clients[login]
	h.mu.RUnlock()
	if !ok {
		return
	}

	select {
	case client.send <- payload:
	default:
	}
}

func (c *Client) writePump() {
	for msg := range c.send {
		_ = c.conn.WriteMessage(websocket.TextMessage, msg)
	}
}

func (h Handler) HandleWS(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "token is required"})
		return
	}

	claims, err := services.ParseToken(token)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid token"})
		return
	}

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{
		login: claims.Login,
		conn:  conn,
		send:  make(chan []byte, 16),
	}

	h.Hub.Register(client)
	go client.writePump()

	ack, _ := json.Marshal(HandshakeMessage{Type: "handshake", Login: claims.Login})
	client.send <- ack

	defer func() {
		h.Hub.Unregister(client.login)
		_ = conn.Close()
	}()

	conn.SetReadLimit(4096)
	_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			return
		}

		var incoming IncomingMessage
		if err := json.Unmarshal(data, &incoming); err != nil {
			continue
		}

		if incoming.Type != "message" || incoming.To == "" || incoming.Text == "" {
			continue
		}

		payload, _ := json.Marshal(OutgoingMessage{
			Type:   "message",
			From:   client.login,
			To:     incoming.To,
			Text:   incoming.Text,
			SentAt: time.Now().UTC().Format(time.RFC3339),
		})
		h.Hub.SendTo(incoming.To, payload)
	}
}
