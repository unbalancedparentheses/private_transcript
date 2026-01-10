# Private Transcript - Makefile
# =============================

.PHONY: setup dev build clean

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
