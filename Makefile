# Private Transcript - Makefile
# =============================

.PHONY: setup dev build clean test test-backend test-frontend test-all build-whisperkit

# Full setup: enter Nix, install deps, build whisperkit worker
setup:
	nix develop --command bash -c "pnpm install && cd whisperkit-worker && swift build -c release"

# Run the app in development mode
dev:
	nix develop --command pnpm tauri dev

# Build for production
build: build-whisperkit
	nix develop --command pnpm tauri build

# Clean all build artifacts
clean:
	rm -rf node_modules dist src-tauri/target whisperkit-worker/.build

# Build WhisperKit worker
build-whisperkit:
	cd whisperkit-worker && swift build -c release
	@echo "WhisperKit worker built at whisperkit-worker/.build/release/whisperkit-worker"

# Run all tests
test-all: test-backend test-frontend
	@echo "All tests passed!"

# Run backend (Rust) tests
test-backend:
	nix develop --command bash -c "cd src-tauri && cargo test -- --nocapture"

# Run frontend (TypeScript) tests
test-frontend:
	nix develop --command pnpm test:run

# Alias for all tests
test: test-all

# Run whisperkit-specific tests
test-whisperkit:
	nix develop --command bash -c "cd src-tauri && cargo test --test whisperkit_test -- --nocapture"

# Quick check (no tests, just compilation)
check:
	nix develop --command bash -c "cd src-tauri && cargo check && pnpm tsc --noEmit"
