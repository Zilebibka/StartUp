package services

import (
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"
)

type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

func LoadSMTPConfigFromEnv() SMTPConfig {
	port, _ := strconv.Atoi(strings.TrimSpace(os.Getenv("SMTP_PORT")))
	if port == 0 {
		port = 587
	}

	from := strings.TrimSpace(os.Getenv("SMTP_FROM"))
	if from == "" {
		from = strings.TrimSpace(os.Getenv("SMTP_USERNAME"))
	}

	return SMTPConfig{
		Host:     strings.TrimSpace(os.Getenv("SMTP_HOST")),
		Port:     port,
		Username: strings.TrimSpace(os.Getenv("SMTP_USERNAME")),
		Password: os.Getenv("SMTP_PASSWORD"),
		From:     from,
	}
}

func (c SMTPConfig) IsConfigured() bool {
	return c.Host != "" && c.Port > 0 && c.Username != "" && c.Password != "" && c.From != ""
}

func SendPlainEmail(cfg SMTPConfig, to, subject, body string) error {
	return SendEmail(cfg, to, subject, body, "")
}

func SendEmail(cfg SMTPConfig, to, subject, plainBody, htmlBody string) error {
	if !cfg.IsConfigured() {
		return fmt.Errorf("smtp is not configured")
	}

	to = strings.TrimSpace(to)
	if to == "" {
		return fmt.Errorf("empty recipient")
	}

	if strings.TrimSpace(plainBody) == "" {
		return fmt.Errorf("empty plain text body")
	}

	headers := "From: " + cfg.From + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n"

	message := headers + "Content-Type: text/plain; charset=UTF-8\r\n\r\n" + plainBody
	if strings.TrimSpace(htmlBody) != "" {
		boundary := fmt.Sprintf("necrocode-boundary-%d", time.Now().UnixNano())
		message = headers +
			"Content-Type: multipart/alternative; boundary=\"" + boundary + "\"\r\n\r\n" +
			"--" + boundary + "\r\n" +
			"Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
			plainBody + "\r\n\r\n" +
			"--" + boundary + "\r\n" +
			"Content-Type: text/html; charset=UTF-8\r\n\r\n" +
			htmlBody + "\r\n\r\n" +
			"--" + boundary + "--"
	}

	addr := net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port))
	auth := smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)
	const smtpTimeout = 12 * time.Second

	if cfg.Port == 465 {
		dialer := &net.Dialer{Timeout: smtpTimeout}
		conn, err := tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{ServerName: cfg.Host})
		if err != nil {
			return fmt.Errorf("smtp connect failed: %w", err)
		}
		defer conn.Close()
		_ = conn.SetDeadline(time.Now().Add(smtpTimeout))

		client, err := smtp.NewClient(conn, cfg.Host)
		if err != nil {
			return fmt.Errorf("smtp client failed: %w", err)
		}
		defer client.Close()

		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("smtp auth failed: %w", err)
		}
		if err := client.Mail(cfg.From); err != nil {
			return fmt.Errorf("smtp from failed: %w", err)
		}
		if err := client.Rcpt(to); err != nil {
			return fmt.Errorf("smtp recipient rejected: %w", err)
		}

		wc, err := client.Data()
		if err != nil {
			return fmt.Errorf("smtp data failed: %w", err)
		}
		if _, err := wc.Write([]byte(message)); err != nil {
			_ = wc.Close()
			return fmt.Errorf("smtp write failed: %w", err)
		}
		if err := wc.Close(); err != nil {
			return fmt.Errorf("smtp finalize failed: %w", err)
		}

		if err := client.Quit(); err != nil && err != io.EOF {
			return fmt.Errorf("smtp quit failed: %w", err)
		}
		return nil
	}

	conn, err := net.DialTimeout("tcp", addr, smtpTimeout)
	if err != nil {
		return fmt.Errorf("smtp connect failed: %w", err)
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(smtpTimeout))

	client, err := smtp.NewClient(conn, cfg.Host)
	if err != nil {
		return fmt.Errorf("smtp client failed: %w", err)
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: cfg.Host}); err != nil {
			return fmt.Errorf("smtp starttls failed: %w", err)
		}
	}

	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("smtp auth failed: %w", err)
	}
	if err := client.Mail(cfg.From); err != nil {
		return fmt.Errorf("smtp from failed: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("smtp recipient rejected: %w", err)
	}

	wc, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data failed: %w", err)
	}
	if _, err := wc.Write([]byte(message)); err != nil {
		_ = wc.Close()
		return fmt.Errorf("smtp write failed: %w", err)
	}
	if err := wc.Close(); err != nil {
		return fmt.Errorf("smtp finalize failed: %w", err)
	}

	if err := client.Quit(); err != nil && err != io.EOF {
		return fmt.Errorf("smtp quit failed: %w", err)
	}

	return nil
}
