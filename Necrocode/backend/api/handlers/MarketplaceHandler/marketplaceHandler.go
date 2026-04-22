package marketplacehandler

import (
        "database/sql"
        "encoding/json"
        "net/http"
        "strconv"
        "strings"
        "time"

        "Necrocode/api/middlewares"

        "github.com/go-chi/chi/v5"
)

type Handler struct {
        DB *sql.DB
}

type listingDTO struct {
        ID           int64    `json:"id"`
        Title        string   `json:"title"`
        Description  string   `json:"description"`
        Price        int64    `json:"price"`
        OwnerLogin   string   `json:"ownerLogin"`
        Category     string   `json:"category"`
        TechStack    string   `json:"techStack"`
        DeliveryMode string   `json:"deliveryMode"`
        ProjectURL   *string  `json:"projectUrl,omitempty"`
        CodeFileName *string  `json:"codeFileName,omitempty"`
        ImageDataURL []string `json:"imageDataUrls"`
        CreatedAt    string   `json:"createdAt"`
}

type createListingRequest struct {
        Title        string   `json:"title"`
        Description  string   `json:"description"`
        Price        int64    `json:"price"`
        Category     string   `json:"category"`
        TechStack    string   `json:"techStack"`
        DeliveryMode string   `json:"deliveryMode"`
        ProjectURL   string   `json:"projectUrl"`
        CodeFileName string   `json:"codeFileName"`
        ImageDataURL []string `json:"imageDataUrls"`
}

type cartItemDTO struct {
        ListingID int64 `json:"listingId"`
        Qty       int   `json:"qty"`
}

type setCartItemRequest struct {
        ListingID int64 `json:"listingId"`
        Qty       int   `json:"qty"`
}

func (h Handler) ListListings(w http.ResponseWriter, r *http.Request) {
        const query = `
                SELECT l.id, l.title, l.description, l.price, u.login, l.delivery_mode,
                        l.project_url, l.code_file_name, l.image_data_urls, l.category, l.tech_stack, l.created_at
                FROM listings l
                JOIN users u ON u.id = l.seller_user_id
                ORDER BY l.created_at DESC
        `

        rows, err := h.DB.Query(query)
        if err != nil {
                writeError(w, http.StatusInternalServerError, "failed to load listings")
                return
        }
        defer rows.Close()

        items := make([]listingDTO, 0)
        for rows.Next() {
                item, scanErr := scanListing(rows)
                if scanErr != nil {
                        writeError(w, http.StatusInternalServerError, "failed to parse listings")
                        return
                }
                items = append(items, item)
        }

        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(items)
}

func (h Handler) GetListingByID(w http.ResponseWriter, r *http.Request) {
        listingID, err := strconv.ParseInt(chi.URLParam(r, "listingID"), 10, 64)
        if err != nil || listingID <= 0 {
                writeError(w, http.StatusBadRequest, "invalid listing id")
                return
        }

        const query = `
                SELECT l.id, l.title, l.description, l.price, u.login, l.delivery_mode,
                        l.project_url, l.code_file_name, l.image_data_urls, l.category, l.tech_stack, l.created_at
                FROM listings l
                JOIN users u ON u.id = l.seller_user_id
                WHERE l.id = $1
        `

        row := h.DB.QueryRow(query, listingID)
        item, scanErr := scanListing(row)
        if scanErr == sql.ErrNoRows {
                writeError(w, http.StatusNotFound, "listing not found")
                return
        }
        if scanErr != nil {
                writeError(w, http.StatusInternalServerError, "failed to load listing")
                return
        }

        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(item)
}

func (h Handler) CreateListing(w http.ResponseWriter, r *http.Request) {
        userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
        if userID == 0 {
                writeError(w, http.StatusUnauthorized, "unauthorized")
                return
        }

        var req createListingRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                writeError(w, http.StatusBadRequest, "invalid payload")
                return
        }

        req.Title = strings.TrimSpace(req.Title)
        req.Description = strings.TrimSpace(req.Description)
        req.Category = strings.TrimSpace(req.Category)
        req.TechStack = strings.TrimSpace(req.TechStack)
        req.ProjectURL = strings.TrimSpace(req.ProjectURL)
        req.CodeFileName = strings.TrimSpace(req.CodeFileName)

        if req.Title == "" || req.Description == "" || req.Price <= 0 || req.Category == "" || req.TechStack == "" {
                writeError(w, http.StatusBadRequest, "title, description, price, category and techStack are required")
                return
        }

        if req.DeliveryMode != "auto" {
                req.DeliveryMode = "manual"
        }

        if req.ProjectURL == "" && req.CodeFileName == "" {
                writeError(w, http.StatusBadRequest, "projectUrl or codeFileName required")
                return
        }

        if len(req.ImageDataURL) > 5 {
                req.ImageDataURL = req.ImageDataURL[:5]
        }

        imagesJSON, _ := json.Marshal(req.ImageDataURL)

        const insertQuery = `
                INSERT INTO listings (
                        seller_user_id, title, description, price, delivery_mode,
                        project_url, code_file_name, image_data_urls, category, tech_stack
                ) VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, ''), $8::jsonb, $9, $10)
                RETURNING id, created_at
        `

        var (
                listingID int64
                createdAt time.Time
        )
        if err := h.DB.QueryRow(
                insertQuery,
                userID,
                req.Title,
                req.Description,
                req.Price,
                req.DeliveryMode,
                req.ProjectURL,
                req.CodeFileName,
                string(imagesJSON),
                req.Category,
                req.TechStack,
        ).Scan(&listingID, &createdAt); err != nil {
                writeError(w, http.StatusInternalServerError, "failed to create listing")
                return
        }

        var ownerLogin string
        if err := h.DB.QueryRow("SELECT login FROM users WHERE id = $1", userID).Scan(&ownerLogin); err != nil {
                writeError(w, http.StatusInternalServerError, "failed to load listing owner")
                return
        }

        result := listingDTO{
                ID:           listingID,
                Title:        req.Title,
                Description:  req.Description,
                Price:        req.Price,
                OwnerLogin:   ownerLogin,
                Category:     req.Category,
                TechStack:    req.TechStack,
                DeliveryMode: req.DeliveryMode,
                ImageDataURL: req.ImageDataURL,
                CreatedAt:    createdAt.UTC().Format(time.RFC3339),
        }
        if req.ProjectURL != "" {
                result.ProjectURL = &req.ProjectURL
        }
        if req.CodeFileName != "" {
                result.CodeFileName = &req.CodeFileName
        }

        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusCreated)
        _ = json.NewEncoder(w).Encode(result)
}

func (h Handler) DeleteListing(w http.ResponseWriter, r *http.Request) {
        userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
        if userID == 0 {
                writeError(w, http.StatusUnauthorized, "unauthorized")
                return
        }

        listingIDStr := chi.URLParam(r, "listingID")
        listingID, err := strconv.ParseInt(listingIDStr, 10, 64)
        if err != nil {
                writeError(w, http.StatusBadRequest, "invalid listing ID")
                return
        }

        res, err := h.DB.Exec("DELETE FROM listings WHERE id = $1 AND seller_user_id = $2", listingID, userID)
        if err != nil {
                writeError(w, http.StatusInternalServerError, "failed to delete listing")
                return
        }

        rows, _ := res.RowsAffected()
        if rows == 0 {
                writeError(w, http.StatusForbidden, "not allowed or listing not found")
                return
        }

        w.WriteHeader(http.StatusNoContent)
}

func (h Handler) UpdateListing(w http.ResponseWriter, r *http.Request) {
        userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
        if userID == 0 {
                writeError(w, http.StatusUnauthorized, "unauthorized")
                return
        }

        listingIDStr := chi.URLParam(r, "listingID")
        listingID, err := strconv.ParseInt(listingIDStr, 10, 64)
        if err != nil {
                writeError(w, http.StatusBadRequest, "invalid listing ID")
                return
        }

        var req createListingRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                writeError(w, http.StatusBadRequest, "invalid payload")
                return
        }

        req.Title = strings.TrimSpace(req.Title)
        req.Description = strings.TrimSpace(req.Description)
        req.ProjectURL = strings.TrimSpace(req.ProjectURL)
        req.CodeFileName = strings.TrimSpace(req.CodeFileName)
        req.Category = strings.TrimSpace(req.Category)
        req.TechStack = strings.TrimSpace(req.TechStack)

        if req.Title == "" || req.Description == "" || req.Price <= 0 || req.Category == "" || req.TechStack == "" {
                writeError(w, http.StatusBadRequest, "title, description, price, category, techStack are required")
                return
        }

        if req.DeliveryMode != "auto" {
                req.DeliveryMode = "manual"
        }

        if len(req.ImageDataURL) > 5 {
                req.ImageDataURL = req.ImageDataURL[:5]
        }

        imagesJSON, _ := json.Marshal(req.ImageDataURL)

        const updateQuery = `
                UPDATE listings SET 
                        title = $1, description = $2, price = $3, delivery_mode = $4,
                        project_url = NULLIF($5, ''), code_file_name = NULLIF($6, ''), image_data_urls = $7::jsonb, category = $10, tech_stack = $11
                WHERE id = $8 AND seller_user_id = $9
                RETURNING id, created_at
        `

        var createdAt time.Time
        if err := h.DB.QueryRow(
                updateQuery,
                req.Title,
                req.Description,
                req.Price,
                req.DeliveryMode,
                req.ProjectURL,
                req.CodeFileName,
                string(imagesJSON),
                listingID,
                userID,
                req.Category,
                req.TechStack,
        ).Scan(&listingID, &createdAt); err != nil {
                if err == sql.ErrNoRows {
                        writeError(w, http.StatusForbidden, "not allowed or listing not found")
                        return
                }
                writeError(w, http.StatusInternalServerError, "failed to update listing")
                return
        }

        var ownerLogin string
        if err := h.DB.QueryRow("SELECT login FROM users WHERE id = $1", userID).Scan(&ownerLogin); err != nil {
                writeError(w, http.StatusInternalServerError, "failed to load listing owner")
                return
        }

        var projectUrlPtr *string
        if req.ProjectURL != "" {
                projectUrlPtr = &req.ProjectURL
        }
        var codeFileNamePtr *string
        if req.CodeFileName != "" {
                codeFileNamePtr = &req.CodeFileName
        }

        result := listingDTO{
                ID:           listingID,
                Title:        req.Title,
                Description:  req.Description,
                Price:        req.Price,
                OwnerLogin:   ownerLogin,
                Category:     req.Category,
                TechStack:    req.TechStack,
                DeliveryMode: req.DeliveryMode,
                ProjectURL:   projectUrlPtr,
                CodeFileName: codeFileNamePtr,
                ImageDataURL: req.ImageDataURL,
                CreatedAt:    createdAt.Format(time.RFC3339),
        }

        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusOK)
        _ = json.NewEncoder(w).Encode(result)
}

func (h Handler) GetCart(w http.ResponseWriter, r *http.Request) {
        userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
        if userID == 0 {
                writeError(w, http.StatusUnauthorized, "unauthorized")
                return
        }

        const query = `
                SELECT listing_id, qty
                FROM cart_items
                WHERE user_id = $1
                ORDER BY updated_at DESC
        `

        rows, err := h.DB.Query(query, userID)
        if err != nil {
                writeError(w, http.StatusInternalServerError, "failed to load cart")
                return
        }
        defer rows.Close()

        items := make([]cartItemDTO, 0)
        for rows.Next() {
                var item cartItemDTO
                if err := rows.Scan(&item.ListingID, &item.Qty); err != nil {
                        writeError(w, http.StatusInternalServerError, "failed to parse cart")
                        return
                }
                items = append(items, item)
        }

        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(items)
}

func (h Handler) SyncCart(w http.ResponseWriter, r *http.Request) {
        userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
        if userID == 0 {
                writeError(w, http.StatusUnauthorized, "unauthorized")
                return
        }

        var req []setCartItemRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                writeError(w, http.StatusBadRequest, "invalid payload")
                return
        }

        tx, err := h.DB.Begin()
        if err != nil {
                writeError(w, http.StatusInternalServerError, "tx begin failed")
                return
        }
        defer tx.Rollback()

        if _, err := tx.Exec("DELETE FROM cart_items WHERE user_id = $1", userID); err != nil {
                writeError(w, http.StatusInternalServerError, "cart clear failed")
                return
        }

        stmt, err := tx.Prepare(`
                INSERT INTO cart_items (user_id, listing_id, qty)
                VALUES ($1, $2, $3)
        `)
        if err != nil {
                writeError(w, http.StatusInternalServerError, "stmt prepare failed")
                return
        }
        defer stmt.Close()

        for _, item := range req {
                if item.ListingID <= 0 || item.Qty <= 0 || item.Qty > 99 {
                        continue
                }
                if _, err := stmt.Exec(userID, item.ListingID, item.Qty); err != nil {
                        writeError(w, http.StatusInternalServerError, "stmt exec failed")
                        return
                }
        }

        if err := tx.Commit(); err != nil {
                writeError(w, http.StatusInternalServerError, "tx commit failed")
                return
        }

        h.GetCart(w, r)
}

func (h Handler) SetCartItem(w http.ResponseWriter, r *http.Request) {
        userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
        if userID == 0 {
                writeError(w, http.StatusUnauthorized, "unauthorized")
                return
        }

        var req setCartItemRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                writeError(w, http.StatusBadRequest, "invalid payload")
                return
        }

        if req.ListingID <= 0 {
                writeError(w, http.StatusBadRequest, "invalid listing id")
                return
        }

        if req.Qty <= 0 {
                _, err := h.DB.Exec("DELETE FROM cart_items WHERE user_id = $1 AND listing_id = $2", userID, req.ListingID)
                if err != nil {
                        writeError(w, http.StatusInternalServerError, "failed to remove item")
                        return
                }
        } else {
                if req.Qty > 99 {
                        req.Qty = 99
                }
                const upsertQuery = `
                        INSERT INTO cart_items (user_id, listing_id, qty)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (user_id, listing_id)
                        DO UPDATE SET qty = EXCLUDED.qty, updated_at = NOW()
                `
                if _, err := h.DB.Exec(upsertQuery, userID, req.ListingID, req.Qty); err != nil {
                        writeError(w, http.StatusInternalServerError, "failed to update cart")
                        return
                }
        }

        w.WriteHeader(http.StatusNoContent)
}

func (h Handler) RemoveCartItem(w http.ResponseWriter, r *http.Request) {
        userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
        if userID == 0 {
                writeError(w, http.StatusUnauthorized, "unauthorized")
                return
        }

        listingIDStr := chi.URLParam(r, "listingID")
        listingID, err := strconv.ParseInt(listingIDStr, 10, 64)
        if err != nil || listingID <= 0 {
                writeError(w, http.StatusBadRequest, "invalid listing id")
                return
        }

        _, err = h.DB.Exec("DELETE FROM cart_items WHERE user_id = $1 AND listing_id = $2", userID, listingID)
        if err != nil {
                writeError(w, http.StatusInternalServerError, "failed to remove item")
                return
        }

        w.WriteHeader(http.StatusNoContent)
}

type listingScanner interface {
        Scan(dest ...any) error
}

func scanListing(scanner listingScanner) (listingDTO, error) {
        var (
                item       listingDTO
                projectURL sql.NullString
                codeFile   sql.NullString
                imagesRaw  []byte
                createdAt  time.Time
        )

        err := scanner.Scan(
                &item.ID,
                &item.Title,
                &item.Description,
                &item.Price,
                &item.OwnerLogin,
                &item.DeliveryMode,
                &projectURL,
                &codeFile,
                &imagesRaw,
                &item.Category,
                &item.TechStack,
                &createdAt,
        )
        if err != nil {
                return listingDTO{}, err
        }

        item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
        if projectURL.Valid {
                item.ProjectURL = &projectURL.String
        }
        if codeFile.Valid {
                item.CodeFileName = &codeFile.String
        }
        if len(imagesRaw) == 0 {
                item.ImageDataURL = []string{}
                return item, nil
        }
        if err := json.Unmarshal(imagesRaw, &item.ImageDataURL); err != nil {
                item.ImageDataURL = []string{}
        }

        return item, nil
}

func writeError(w http.ResponseWriter, status int, message string) {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(status)
        _ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
