# Private Transcript - Makefile
# =============================

# Model configuration for tests
MODEL_DIR := $(HOME)/Library/Application Support/com.private-transcript.app/models/whisper-tiny
MODEL_FILE := $(MODEL_DIR)/ggml-model.bin
MODEL_URL := https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin

.PHONY: setup dev build clean test test-whisper download-model clean-model

# Full setup: enter Nix, install deps, pull Ollama model
setup:
	nix develop --command bash -c "pnpm install && (command -v ollama >/dev/null && ollama pull llama3.1:8b || echo 'Install Ollama from https://ollama.com')"

# Run the app in development mode
dev:
	nix develop --command pnpm tauri dev

# Build for production
build:
	nix develop --command pnpm tauri build

# Clean all build artifacts
clean:
	rm -rf node_modules dist src-tauri/target

# Download whisper-tiny model for testing
download-model:
	@echo "Downloading whisper-tiny model..."
	@mkdir -p "$(MODEL_DIR)"
	@if [ ! -f "$(MODEL_FILE)" ]; then \
		echo "Downloading from $(MODEL_URL)"; \
		curl -L -o "$(MODEL_FILE)" "$(MODEL_URL)"; \
		echo "Model downloaded to $(MODEL_FILE)"; \
	else \
		echo "Model already exists at $(MODEL_FILE)"; \
	fi

# Run all backend tests
test: download-model
	nix develop --command bash -c "cd src-tauri && cargo test -- --nocapture"

# Run whisper-specific tests
test-whisper: download-model
	nix develop --command bash -c "cd src-tauri && cargo test --test whisper_test -- --nocapture --test-threads=1"

# Remove test model
clean-model:
	@echo "Removing test model..."
	@rm -rf "$(MODEL_DIR)"
	@echo "Done"
