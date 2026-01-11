use llama_cpp_2::llama_backend::LlamaBackend;
use once_cell::sync::OnceCell;

/// Global shared llama backend (initialized once, never dropped)
static LLAMA_BACKEND: OnceCell<LlamaBackend> = OnceCell::new();

/// Get reference to the shared llama backend, initializing if needed
pub fn get_backend() -> &'static LlamaBackend {
    LLAMA_BACKEND.get_or_init(|| {
        let backend = LlamaBackend::init().expect("Failed to initialize llama backend");
        println!("[LlamaBackend] Initialized shared backend");
        backend
    })
}
