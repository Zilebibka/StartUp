package chathandler

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
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
	ClientID string `json:"clientId,omitempty"`
}

type OutgoingMessage struct {
	Type       string `json:"type"`
	ID         int64  `json:"id"`
	From       string `json:"from"`
	To         string `json:"to"`
	Text       string `json:"text"`
	SentAt     string `json:"sentAt"`
	EditedAt   *string `json:"editedAt,omitempty"`
	DeletedAt  *string `json:"deletedAt,omitempty"`
	ClientID   string `json:"clientId,omitempty"`
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
	ChatID        string `json:"chatId"`
	Login         string `json:"login"`
	DisplayName   string `json:"displayName"`
	AvatarDataURL string `json:"avatarDataUrl"`
	LastText      string `json:"lastText"`
	LastSentAt    string `json:"lastSentAt"`
	LastFrom      string `json:"lastFrom"`
}

type ChatResolveResponse struct {
	ChatID        string `json:"chatId"`
	Login         string `json:"login"`
	DisplayName   string `json:"displayName"`
	AvatarDataURL string `json:"avatarDataUrl"`
}

type ChatHistoryMessage struct {
	ID        int64  `json:"id"`
	From      string `json:"from"`
	To        string `json:"to"`
	Text      string `json:"text"`
	SentAt    string `json:"sentAt"`
	EditedAt  *string `json:"editedAt,omitempty"`
	DeletedAt *string `json:"deletedAt,omitempty"`
	Attachment *AttachmentPayload `json:"attachment,omitempty"`
}

type EditMessageRequest struct {
	Text string `json:"text"`
}

type DeleteMessagesRequest struct {
	IDs []int64 `json:"ids"`
}

type MessageUpdate struct {
	ID        int64  `json:"id"`
	Text      string `json:"text"`
	EditedAt  *string `json:"editedAt,omitempty"`
	DeletedAt *string `json:"deletedAt,omitempty"`
}

type UploadAttachmentResponse struct {
	Message ChatHistoryMessage `json:"message"`
}

func NewHub() *Hub {
	return &Hub{clients: make(map[string]*Client)}
}

func chatIDSecret() ([]byte, error) {
	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if secret == "" {
		return nil, errors.New("JWT_SECRET is required")
	}
	return []byte(secret), nil
}

func normalizeChatUsers(a, b int64) (int64, int64) {
	if a > b {
		return b, a
	}
	return a, b
}

func makeChatID(userA, userB int64) (string, error) {
	secret, err := chatIDSecret()
	if err != nil {
		return "", err
	}

	a, b := normalizeChatUsers(userA, userB)
	data := fmt.Sprintf("%d:%d", a, b)
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(data))
	signature := hex.EncodeToString(mac.Sum(nil))
	encoded := base64.RawURLEncoding.EncodeToString([]byte(data + "." + signature))
	return encoded, nil
}

func parseChatID(chatID string) (int64, int64, error) {
	secret, err := chatIDSecret()
	if err != nil {
		return 0, 0, err
	}

	decodedBytes, err := base64.RawURLEncoding.DecodeString(chatID)
	if err != nil {
		return 0, 0, errors.New("invalid chat id")
	}

	parts := strings.SplitN(string(decodedBytes), ".", 2)
	if len(parts) != 2 {
		return 0, 0, errors.New("invalid chat id")
	}

	data := parts[0]
	signature := parts[1]
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(data))
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(signature), []byte(expected)) {
		return 0, 0, errors.New("invalid chat id")
	}

	ids := strings.SplitN(data, ":", 2)
	if len(ids) != 2 {
		return 0, 0, errors.New("invalid chat id")
	}

	a, err := strconv.ParseInt(ids[0], 10, 64)
	if err != nil {
		return 0, 0, errors.New("invalid chat id")
	}
	b, err := strconv.ParseInt(ids[1], 10, 64)
	if err != nil {
		return 0, 0, errors.New("invalid chat id")
	}

	return a, b, nil
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
	var messageID int64
	_ = h.DB.QueryRow(
		`INSERT INTO chat_messages (sender_id, recipient_id, body, sent_at, attachment_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		userID,
		recipientID,
		"",
		sentAt,
		attachmentID,
	).Scan(&messageID)

	attachment := &AttachmentPayload{
		ID:        attachmentID,
		Kind:      kind,
		FileName:  header.Filename,
		Mime:      mime,
		SizeBytes: int64(len(data)),
	}

	payload, _ := json.Marshal(OutgoingMessage{
		Type:       "message",
		ID:         messageID,
		From:       login,
		To:         recipientLogin,
		Text:       "",
		SentAt:     sentAt.Format(time.RFC3339),
		Attachment: attachment,
	})
	h.Hub.SendTo(recipientLogin, payload)
	h.Hub.SendTo(login, payload)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(UploadAttachmentResponse{
		Message: ChatHistoryMessage{
			ID:         messageID,
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
		other.id,
		other.login,
		other.display_name,
		other.avatar_data_url,
	CASE
		WHEN m.deleted_at IS NOT NULL THEN 'Сообщение удалено'
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
		var otherID int64
		var sentAt time.Time
		if err := rows.Scan(&otherID, &item.Login, &item.DisplayName, &item.AvatarDataURL, &item.LastText, &sentAt, &item.LastFrom); err != nil {
			continue
		}
		item.LastSentAt = sentAt.UTC().Format(time.RFC3339)
		chatID, err := makeChatID(userID, otherID)
		if err == nil {
			item.ChatID = chatID
		}
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

	items, err := h.loadHistoryByUsers(userID, otherID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to load history"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"messages": items})
}

func (h Handler) GetChatByID(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	if userID == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	chatID := chi.URLParam(r, "chatId")
	if chatID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "chatId is required"})
		return
	}

	a, b, err := parseChatID(chatID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid chat id"})
		return
	}
	if userID != a && userID != b {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "forbidden"})
		return
	}

	otherID := a
	if otherID == userID {
		otherID = b
	}

	var user ChatResolveResponse
	if err := h.DB.QueryRow(
		`SELECT login, display_name, COALESCE(avatar_data_url, '') FROM users WHERE id = $1`,
		otherID,
	).Scan(&user.Login, &user.DisplayName, &user.AvatarDataURL); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "user not found"})
		return
	}
	user.ChatID = chatID

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(user)
}

func (h Handler) ResolveChat(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	if userID == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	var payload struct {
		Login string `json:"login"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || strings.TrimSpace(payload.Login) == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "login is required"})
		return
	}

	var otherID int64
	var resp ChatResolveResponse
	if err := h.DB.QueryRow(
		`SELECT id, login, display_name, COALESCE(avatar_data_url, '') FROM users WHERE login = $1`,
		payload.Login,
	).Scan(&otherID, &resp.Login, &resp.DisplayName, &resp.AvatarDataURL); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "user not found"})
		return
	}

	chatID, err := makeChatID(userID, otherID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to resolve chat"})
		return
	}
	resp.ChatID = chatID

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func (h Handler) GetChatHistoryByID(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	if userID == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	chatID := chi.URLParam(r, "chatId")
	if chatID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "chatId is required"})
		return
	}

	a, b, err := parseChatID(chatID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid chat id"})
		return
	}
	if userID != a && userID != b {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "forbidden"})
		return
	}

	otherID := a
	if otherID == userID {
		otherID = b
	}

	items, err := h.loadHistoryByUsers(userID, otherID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to load history"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"messages": items})
}

func (h Handler) loadHistoryByUsers(userID int64, otherID int64) ([]ChatHistoryMessage, error) {
	const historyQuery = `
	SELECT m.id, sender.login, recipient.login, m.body, m.sent_at, m.edited_at, m.deleted_at,
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
		return nil, err
	}
	defer rows.Close()

	items := make([]ChatHistoryMessage, 0)
	for rows.Next() {
		var item ChatHistoryMessage
		var messageID int64
		var sentAt time.Time
		var editedAt sql.NullTime
		var deletedAt sql.NullTime
		var attachmentID sql.NullInt64
		var attachmentKind sql.NullString
		var attachmentName sql.NullString
		var attachmentMime sql.NullString
		var attachmentSize sql.NullInt64
		if err := rows.Scan(
			&messageID,
			&item.From,
			&item.To,
			&item.Text,
			&sentAt,
			&editedAt,
			&deletedAt,
			&attachmentID,
			&attachmentKind,
			&attachmentName,
			&attachmentMime,
			&attachmentSize,
		); err != nil {
			continue
		}
		item.ID = messageID
		item.SentAt = sentAt.UTC().Format(time.RFC3339)
		if editedAt.Valid {
			value := editedAt.Time.UTC().Format(time.RFC3339)
			item.EditedAt = &value
		}
		if deletedAt.Valid {
			value := deletedAt.Time.UTC().Format(time.RFC3339)
			item.DeletedAt = &value
			item.Text = ""
			item.Attachment = nil
		}
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

	return items, rows.Err()
}

func (h Handler) EditMessage(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	login, _ := r.Context().Value(middlewares.ContextLoginKey).(string)
	if userID == 0 || login == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	messageIDParam := chi.URLParam(r, "id")
	messageID, err := strconv.ParseInt(messageIDParam, 10, 64)
	if err != nil || messageID <= 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid id"})
		return
	}

	var req EditMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid payload"})
		return
	}

	text := strings.TrimSpace(req.Text)
	if text == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "text is required"})
		return
	}

	updatedAt := time.Now().UTC()
	var recipientID int64
	var updatedText string
	var editedAt time.Time
	if err := h.DB.QueryRow(
		`UPDATE chat_messages
		 SET body = $1, edited_at = $2
		 WHERE id = $3 AND sender_id = $4 AND deleted_at IS NULL
		 RETURNING recipient_id, body, edited_at`,
		text,
		updatedAt,
		messageID,
		userID,
	).Scan(&recipientID, &updatedText, &editedAt); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "message not found"})
		return
	}

	var recipientLogin string
	_ = h.DB.QueryRow(`SELECT login FROM users WHERE id = $1`, recipientID).Scan(&recipientLogin)
	editedAtValue := editedAt.UTC().Format(time.RFC3339)

	payload, _ := json.Marshal(OutgoingMessage{
		Type:     "edit",
		ID:       messageID,
		From:     login,
		To:       recipientLogin,
		Text:     updatedText,
		SentAt:   "",
		EditedAt: &editedAtValue,
	})
	h.Hub.SendTo(recipientLogin, payload)
	h.Hub.SendTo(login, payload)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"message": MessageUpdate{
			ID:       messageID,
			Text:     updatedText,
			EditedAt: &editedAtValue,
		},
	})
}

func (h Handler) DeleteMessages(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	login, _ := r.Context().Value(middlewares.ContextLoginKey).(string)
	if userID == 0 || login == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	var req DeleteMessagesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid payload"})
		return
	}
	if len(req.IDs) == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "ids are required"})
		return
	}

	deletedAt := time.Now().UTC()
	rows, err := h.DB.Query(
		`WITH updated AS (
			UPDATE chat_messages
			SET body = '', deleted_at = $1, attachment_id = NULL
			WHERE sender_id = $2 AND id = ANY($3) AND deleted_at IS NULL
			RETURNING id, recipient_id
		)
		SELECT updated.id, recipient.login
		FROM updated
		JOIN users recipient ON recipient.id = updated.recipient_id;`,
		deletedAt,
		userID,
		req.IDs,
	)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to delete"})
		return
	}
	defer rows.Close()

	deletedAtValue := deletedAt.UTC().Format(time.RFC3339)
	updates := make([]MessageUpdate, 0)
	for rows.Next() {
		var messageID int64
		var recipientLogin string
		if err := rows.Scan(&messageID, &recipientLogin); err != nil {
			continue
		}
		payload, _ := json.Marshal(OutgoingMessage{
			Type:      "delete",
			ID:        messageID,
			From:      login,
			To:        recipientLogin,
			Text:      "",
			SentAt:    "",
			DeletedAt: &deletedAtValue,
		})
		h.Hub.SendTo(recipientLogin, payload)
		h.Hub.SendTo(login, payload)
		updates = append(updates, MessageUpdate{ID: messageID, Text: "", DeletedAt: &deletedAtValue})
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"messages": updates})
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
		var messageID int64
		if h.DB != nil {
			var recipientID int64
			if err := h.DB.QueryRow(`SELECT id FROM users WHERE login = $1`, incoming.To).Scan(&recipientID); err == nil {
				_ = h.DB.QueryRow(
					`INSERT INTO chat_messages (sender_id, recipient_id, body, sent_at) VALUES ($1, $2, $3, $4) RETURNING id`,
					claims.UserID,
					recipientID,
					incoming.Text,
					sentAt,
				).Scan(&messageID)
			}
		}
		payload, _ := json.Marshal(OutgoingMessage{
			Type:     "message",
			ID:       messageID,
			From:     client.login,
			To:       incoming.To,
			Text:     incoming.Text,
			SentAt:   sentAt.Format(time.RFC3339),
			ClientID: incoming.ClientID,
		})
		h.Hub.SendTo(incoming.To, payload)
		h.Hub.SendTo(client.login, payload)
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
