# shell.nix - For users who prefer shell.nix over flakes
# Usage: nix-shell

{ pkgs ? import <nixpkgs> {} }:

let
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
    alsa-lib
    pkg-config
  ];

in pkgs.mkShell {
  buildInputs = with pkgs; [
    # Rust
    rustc
    cargo
    rustfmt
    clippy
    rust-analyzer
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
  ] ++ darwinDeps ++ linuxDeps;

  shellHook = ''
    export CARGO_HOME="$HOME/.cargo"
    export PATH="$CARGO_HOME/bin:$PATH"
  '';

  # For openssl-sys
  OPENSSL_DIR = "${pkgs.openssl.dev}";
  OPENSSL_LIB_DIR = "${pkgs.openssl.out}/lib";
  OPENSSL_INCLUDE_DIR = "${pkgs.openssl.dev}/include";
}
