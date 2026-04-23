package main

import (
	"log"
	"net/http"
	"os"

	"Necrocode/api"
	"Necrocode/db"
)

func main() {
	database, err := db.Connect()
	if err != nil {
		log.Fatalf("failed to connect db: %v", err)
	}
	defer database.Close()

	if err := db.InitSchema(database); err != nil {
		log.Fatalf("failed to init schema: %v", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := ":" + port
	log.Printf("server started on %s", addr)
	if err := http.ListenAndServe(addr, api.NewRouter(database)); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
