package chathandler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"Necrocode/api/middlewares"
	"Necrocode/api/services"

	"github.com/go-chi/chi/v5"
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
	DB  *sql.DB
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
	Attachment *AttachmentPayload `json:"attachment,omitempty"`
}

type HandshakeMessage struct {
	Type  string `json:"type"`
	Login string `json:"login"`
}

type AttachmentPayload struct {
	ID        int64  `json:"id"`
	Kind      string `json:"kind"`
	FileName  string `json:"fileName"`
	Mime      string `json:"mime"`
	SizeBytes int64  `json:"sizeBytes"`
}

type ChatSummary struct {
	Login         string `json:"login"`
	DisplayName   string `json:"displayName"`
	AvatarDataURL string `json:"avatarDataUrl"`
	LastText      string `json:"lastText"`
	LastSentAt    string `json:"lastSentAt"`
	LastFrom      string `json:"lastFrom"`
}

type ChatHistoryMessage struct {
	From   string `json:"from"`
	To     string `json:"to"`
	Text   string `json:"text"`
	SentAt string `json:"sentAt"`
	Attachment *AttachmentPayload `json:"attachment,omitempty"`
}

type UploadAttachmentResponse struct {
	Message ChatHistoryMessage `json:"message"`
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

func (h Handler) UploadAttachment(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	login, _ := r.Context().Value(middlewares.ContextLoginKey).(string)
	if userID == 0 || login == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	recipientLogin := chi.URLParam(r, "login")
	if recipientLogin == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "login is required"})
		return
	}

	var recipientID int64
	if err := h.DB.QueryRow(`SELECT id FROM users WHERE login = $1`, recipientLogin).Scan(&recipientID); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "user not found"})
		return
	}

	const maxFileBytes = int64(5 * 1024 * 1024)
	const maxImageBytes = int64(2 * 1024 * 1024)
	const maxUploadBytes = int64(6 * 1024 * 1024)

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusRequestEntityTooLarge)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "file is too large"})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "file is required"})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxUploadBytes+1))
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to read file"})
		return
	}
	if int64(len(data)) > maxUploadBytes {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusRequestEntityTooLarge)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "file is too large"})
		return
	}

	mime := strings.TrimSpace(header.Header.Get("Content-Type"))
	if mime == "" {
		mime = http.DetectContentType(data)
	}

	kind := "file"
	if strings.HasPrefix(mime, "image/") {
		kind = "image"
	}
	if strings.HasPrefix(mime, "audio/") {
		kind = "voice"
	}

	if kind == "image" && int64(len(data)) > maxImageBytes {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusRequestEntityTooLarge)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "image is too large"})
		return
	}
	if kind != "image" && int64(len(data)) > maxFileBytes {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusRequestEntityTooLarge)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "file is too large"})
		return
	}

	var attachmentID int64
	insertAttachment := `
INSERT INTO chat_attachments (sender_id, recipient_id, kind, file_name, mime, size_bytes, data)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id;
`
	if err := h.DB.QueryRow(
		insertAttachment,
		userID,
		recipientID,
		kind,
		header.Filename,
		mime,
		len(data),
		data,
	).Scan(&attachmentID); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to save attachment"})
		return
	}

	sentAt := time.Now().UTC()
	_, _ = h.DB.Exec(
		`INSERT INTO chat_messages (sender_id, recipient_id, body, sent_at, attachment_id) VALUES ($1, $2, $3, $4, $5)`,
		userID,
		recipientID,
		"",
		sentAt,
		attachmentID,
	)

	attachment := &AttachmentPayload{
		ID:        attachmentID,
		Kind:      kind,
		FileName:  header.Filename,
		Mime:      mime,
		SizeBytes: int64(len(data)),
	}

	payload, _ := json.Marshal(OutgoingMessage{
		Type:       "message",
		From:       login,
		To:         recipientLogin,
		Text:       "",
		SentAt:     sentAt.Format(time.RFC3339),
		Attachment: attachment,
	})
	h.Hub.SendTo(recipientLogin, payload)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(UploadAttachmentResponse{
		Message: ChatHistoryMessage{
			From:       login,
			To:         recipientLogin,
			Text:       "",
			SentAt:     sentAt.Format(time.RFC3339),
			Attachment: attachment,
		},
	})
}

func (h Handler) DownloadAttachment(w http.ResponseWriter, r *http.Request) {
	claims, err := parseTokenFromRequest(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	attachmentID := chi.URLParam(r, "id")
	if attachmentID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "id is required"})
		return
	}

	attachmentIDValue, err := strconv.ParseInt(attachmentID, 10, 64)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid id"})
		return
	}

	const query = `
SELECT sender_id, recipient_id, file_name, mime, size_bytes, data
FROM chat_attachments
WHERE id = $1;
`

	var (
		senderID    int64
		recipientID int64
		fileName    string
		mime        string
		sizeBytes   int64
		data        []byte
	)
	if err := h.DB.QueryRow(query, attachmentIDValue).Scan(&senderID, &recipientID, &fileName, &mime, &sizeBytes, &data); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "attachment not found"})
		return
	}

	if claims.UserID != senderID && claims.UserID != recipientID {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "forbidden"})
		return
	}

	w.Header().Set("Content-Type", mime)
	w.Header().Set("Content-Length", strconv.FormatInt(sizeBytes, 10))
	w.Header().Set("Content-Disposition", "inline; filename=\""+fileName+"\"")
	_, _ = w.Write(data)
}

func (h Handler) ListChats(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	if userID == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	const query = `
SELECT DISTINCT ON (other.login)
	other.login,
	other.display_name,
	other.avatar_data_url,
	CASE
		WHEN m.body <> '' THEN m.body
		WHEN a.kind = 'image' THEN 'Фото'
		WHEN a.kind = 'voice' THEN 'Голосовое'
		WHEN a.kind = 'file' THEN 'Файл'
		ELSE ''
	END AS last_text,
	m.sent_at,
	sender.login
FROM chat_messages m
JOIN users sender ON sender.id = m.sender_id
JOIN users recipient ON recipient.id = m.recipient_id
JOIN users other ON other.id = CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END
LEFT JOIN chat_attachments a ON a.id = m.attachment_id
WHERE m.sender_id = $1 OR m.recipient_id = $1
ORDER BY other.login, m.sent_at DESC;
`

	rows, err := h.DB.Query(query, userID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to load chats"})
		return
	}
	defer rows.Close()

	items := make([]ChatSummary, 0)
	for rows.Next() {
		var item ChatSummary
		var sentAt time.Time
		if err := rows.Scan(&item.Login, &item.DisplayName, &item.AvatarDataURL, &item.LastText, &sentAt, &item.LastFrom); err != nil {
			continue
		}
		item.LastSentAt = sentAt.UTC().Format(time.RFC3339)
		items = append(items, item)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"chats": items})
}

func (h Handler) GetChatHistory(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	if userID == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	otherLogin := chi.URLParam(r, "login")
	if otherLogin == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "login is required"})
		return
	}

	var otherID int64
	if err := h.DB.QueryRow(`SELECT id FROM users WHERE login = $1`, otherLogin).Scan(&otherID); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "user not found"})
		return
	}

	const historyQuery = `
SELECT sender.login, recipient.login, m.body, m.sent_at,
  a.id, a.kind, a.file_name, a.mime, a.size_bytes
FROM chat_messages m
JOIN users sender ON sender.id = m.sender_id
JOIN users recipient ON recipient.id = m.recipient_id
LEFT JOIN chat_attachments a ON a.id = m.attachment_id
WHERE (m.sender_id = $1 AND m.recipient_id = $2)
	OR (m.sender_id = $2 AND m.recipient_id = $1)
ORDER BY m.sent_at ASC
LIMIT 500;
`

	rows, err := h.DB.Query(historyQuery, userID, otherID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to load history"})
		return
	}
	defer rows.Close()

	items := make([]ChatHistoryMessage, 0)
	for rows.Next() {
		var item ChatHistoryMessage
		var sentAt time.Time
		var attachmentID sql.NullInt64
		var attachmentKind sql.NullString
		var attachmentName sql.NullString
		var attachmentMime sql.NullString
		var attachmentSize sql.NullInt64
		if err := rows.Scan(
			&item.From,
			&item.To,
			&item.Text,
			&sentAt,
			&attachmentID,
			&attachmentKind,
			&attachmentName,
			&attachmentMime,
			&attachmentSize,
		); err != nil {
			continue
		}
		item.SentAt = sentAt.UTC().Format(time.RFC3339)
		if attachmentID.Valid {
			item.Attachment = &AttachmentPayload{
				ID:        attachmentID.Int64,
				Kind:      attachmentKind.String,
				FileName:  attachmentName.String,
				Mime:      attachmentMime.String,
				SizeBytes: attachmentSize.Int64,
			}
		}
		items = append(items, item)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"messages": items})
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

		sentAt := time.Now().UTC()
		payload, _ := json.Marshal(OutgoingMessage{
			Type:   "message",
			From:   client.login,
			To:     incoming.To,
			Text:   incoming.Text,
			SentAt: sentAt.Format(time.RFC3339),
		})

		if h.DB != nil {
			var recipientID int64
			if err := h.DB.QueryRow(`SELECT id FROM users WHERE login = $1`, incoming.To).Scan(&recipientID); err == nil {
				_, _ = h.DB.Exec(
					`INSERT INTO chat_messages (sender_id, recipient_id, body, sent_at) VALUES ($1, $2, $3, $4)`,
					claims.UserID,
					recipientID,
					incoming.Text,
					sentAt,
				)
			}
		}
		h.Hub.SendTo(incoming.To, payload)
	}
}

func parseTokenFromRequest(r *http.Request) (*services.Claims, error) {
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(authHeader, "Bearer ") {
		return services.ParseToken(strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer ")))
	}

	queryToken := strings.TrimSpace(r.URL.Query().Get("token"))
	if queryToken != "" {
		return services.ParseToken(queryToken)
	}

	return nil, errors.New("missing token")
}
