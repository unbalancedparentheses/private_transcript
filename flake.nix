{
  description = "Private Transcript - Privacy-first offline transcription app";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, rust-overlay, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
        };

        # Platform-specific dependencies
        darwinDeps = with pkgs; pkgs.lib.optionals pkgs.stdenv.isDarwin [
          apple-sdk_15
          libiconv
        ];

        linuxDeps = with pkgs; pkgs.lib.optionals pkgs.stdenv.isLinux [
          webkitgtk
          gtk3
          cairo
          gdk-pixbuf
          glib
          dbus
          openssl
          librsvg
          libappindicator-gtk3
          libayatana-appindicator
          alsa-lib
          pkg-config
        ];

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Rust
            rustToolchain
            pkg-config
            openssl

            # Node.js
            nodejs_20
            nodePackages.pnpm

            # Tauri CLI
            cargo-tauri

            # Build tools
            cmake
            gnumake

            # SQLite
            sqlite

            # Optional: Ollama (if available in nixpkgs)
            # ollama
          ] ++ darwinDeps ++ linuxDeps;

          shellHook = ''
            export CARGO_HOME="$HOME/.cargo"
            export PATH="$CARGO_HOME/bin:$PATH"
          '';

          # Required for some Rust crates
          RUST_SRC_PATH = "${rustToolchain}/lib/rustlib/src/rust/library";

          # For openssl-sys
          OPENSSL_DIR = "${pkgs.openssl.dev}";
          OPENSSL_LIB_DIR = "${pkgs.openssl.out}/lib";
          OPENSSL_INCLUDE_DIR = "${pkgs.openssl.dev}/include";
        };
      }
    );
}
