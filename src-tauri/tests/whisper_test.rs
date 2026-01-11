//! Whisper-rs integration tests for debugging BLAS crash on Apple Silicon
//!
//! Run with: cargo test --test whisper_test -- --nocapture
//!
//! These tests help isolate the exact point where whisper-rs crashes
//! when using the BLAS backend on Apple M4 silicon.

use std::path::PathBuf;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

/// Get the path to the downloaded whisper model
fn get_model_path() -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    let models_dir = home
        .join("Library/Application Support/com.private-transcript.app/models");

    // Look for any whisper model
    let whisper_models = [
        "whisper-tiny",
        "whisper-base",
        "whisper-small",
        "whisper-medium",
        "whisper-large",
    ];

    for model_name in whisper_models {
        let model_path = models_dir.join(model_name).join("ggml-model.bin");
        if model_path.exists() {
            println!("[Test] Found model at: {:?}", model_path);
            return Some(model_path);
        }
    }

    println!("[Test] No whisper model found in {:?}", models_dir);
    None
}

/// Generate silent audio data (16kHz mono f32)
fn generate_silent_audio(duration_secs: f32) -> Vec<f32> {
    let sample_rate = 16000;
    let num_samples = (sample_rate as f32 * duration_secs) as usize;
    vec![0.0f32; num_samples]
}

/// Generate sine wave audio (16kHz mono f32) for testing
fn generate_sine_wave(duration_secs: f32, frequency: f32) -> Vec<f32> {
    let sample_rate = 16000;
    let num_samples = (sample_rate as f32 * duration_secs) as usize;
    let mut samples = Vec::with_capacity(num_samples);

    for i in 0..num_samples {
        let t = i as f32 / sample_rate as f32;
        let sample = (2.0 * std::f32::consts::PI * frequency * t).sin() * 0.5;
        samples.push(sample);
    }

    samples
}

#[test]
fn test_01_model_exists() {
    println!("\n=== TEST 01: Check if model exists ===");
    let model_path = get_model_path();
    assert!(model_path.is_some(), "No whisper model found. Please download a model first.");

    let path = model_path.unwrap();
    let metadata = std::fs::metadata(&path).expect("Failed to get file metadata");
    println!("[Test] Model size: {} MB", metadata.len() / 1024 / 1024);
}

#[test]
fn test_02_create_context_params() {
    println!("\n=== TEST 02: Create context parameters ===");
    let params = WhisperContextParameters::default();
    println!("[Test] Created default context parameters successfully");
    println!("[Test] PASSED: Context parameters created successfully");
}

#[test]
fn test_03_load_model() {
    println!("\n=== TEST 03: Load whisper model into context ===");

    let model_path = get_model_path().expect("No model found");
    let model_path_str = model_path.to_string_lossy().to_string();

    println!("[Test] Loading model from: {}", model_path_str);
    println!("[Test] This may print backend initialization messages...");

    let ctx_params = WhisperContextParameters::default();

    // This is where Metal/BLAS backend is selected
    let ctx = WhisperContext::new_with_params(&model_path_str, ctx_params);

    match ctx {
        Ok(_) => println!("[Test] PASSED: Model loaded successfully"),
        Err(e) => panic!("[Test] FAILED: Could not load model: {}", e),
    }
}

#[test]
fn test_04_create_state() {
    println!("\n=== TEST 04: Create whisper state (CRASH POINT) ===");

    let model_path = get_model_path().expect("No model found");
    let model_path_str = model_path.to_string_lossy().to_string();

    println!("[Test] Loading model...");
    let ctx_params = WhisperContextParameters::default();
    let ctx = WhisperContext::new_with_params(&model_path_str, ctx_params)
        .expect("Failed to load model");

    println!("[Test] Model loaded. Now creating state...");
    println!("[Test] >>> This is where the BLAS crash typically occurs <<<");

    // This call triggers BLAS initialization which crashes on M4
    let state = ctx.create_state();

    match state {
        Ok(_) => println!("[Test] PASSED: State created successfully"),
        Err(e) => panic!("[Test] FAILED: Could not create state: {}", e),
    }
}

#[test]
fn test_05_create_full_params() {
    println!("\n=== TEST 05: Create transcription parameters ===");

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("en"));
    params.set_translate(false);
    params.set_no_timestamps(true);
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_single_segment(false);
    params.set_n_threads(4);

    println!("[Test] PASSED: Transcription parameters created");
}

#[test]
fn test_06_transcribe_silence() {
    println!("\n=== TEST 06: Transcribe silent audio ===");

    let model_path = get_model_path().expect("No model found");
    let model_path_str = model_path.to_string_lossy().to_string();

    println!("[Test] Loading model...");
    let ctx_params = WhisperContextParameters::default();
    let ctx = WhisperContext::new_with_params(&model_path_str, ctx_params)
        .expect("Failed to load model");

    println!("[Test] Creating state...");
    let mut state = ctx.create_state().expect("Failed to create state");

    // Generate 1 second of silence
    let audio = generate_silent_audio(1.0);
    println!("[Test] Generated {} samples of silent audio", audio.len());

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("en"));
    params.set_n_threads(4);

    println!("[Test] Running transcription...");
    let result = state.full(params, &audio);

    match result {
        Ok(_) => {
            let n_segments = state.full_n_segments();
            println!("[Test] PASSED: Transcription complete, {} segments", n_segments);
        }
        Err(e) => panic!("[Test] FAILED: Transcription error: {}", e),
    }
}

#[test]
fn test_07_transcribe_sine_wave() {
    println!("\n=== TEST 07: Transcribe sine wave audio ===");

    let model_path = get_model_path().expect("No model found");
    let model_path_str = model_path.to_string_lossy().to_string();

    println!("[Test] Loading model...");
    let ctx_params = WhisperContextParameters::default();
    let ctx = WhisperContext::new_with_params(&model_path_str, ctx_params)
        .expect("Failed to load model");

    println!("[Test] Creating state...");
    let mut state = ctx.create_state().expect("Failed to create state");

    // Generate 2 seconds of 440Hz sine wave
    let audio = generate_sine_wave(2.0, 440.0);
    println!("[Test] Generated {} samples of 440Hz sine wave", audio.len());

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("en"));
    params.set_n_threads(4);
    params.set_print_progress(true);

    println!("[Test] Running transcription...");
    let result = state.full(params, &audio);

    match result {
        Ok(_) => {
            let n_segments = state.full_n_segments();
            println!("[Test] Transcription complete, {} segments", n_segments);

            for i in 0..n_segments {
                if let Some(segment) = state.get_segment(i) {
                    if let Ok(text) = segment.to_str() {
                        println!("[Test] Segment {}: '{}'", i, text);
                    }
                }
            }
            println!("[Test] PASSED");
        }
        Err(e) => panic!("[Test] FAILED: Transcription error: {}", e),
    }
}

/// Test with minimal thread count
#[test]
fn test_08_single_thread() {
    println!("\n=== TEST 08: Single thread transcription ===");

    let model_path = get_model_path().expect("No model found");
    let model_path_str = model_path.to_string_lossy().to_string();

    let ctx_params = WhisperContextParameters::default();
    let ctx = WhisperContext::new_with_params(&model_path_str, ctx_params)
        .expect("Failed to load model");

    let mut state = ctx.create_state().expect("Failed to create state");

    let audio = generate_silent_audio(0.5);

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("en"));
    params.set_n_threads(1); // Single thread

    println!("[Test] Running with 1 thread...");
    state.full(params, &audio).expect("Transcription failed");
    println!("[Test] PASSED: Single thread transcription works");
}

/// Test with beam search instead of greedy
#[test]
fn test_09_beam_search() {
    println!("\n=== TEST 09: Beam search sampling ===");

    let model_path = get_model_path().expect("No model found");
    let model_path_str = model_path.to_string_lossy().to_string();

    let ctx_params = WhisperContextParameters::default();
    let ctx = WhisperContext::new_with_params(&model_path_str, ctx_params)
        .expect("Failed to load model");

    let mut state = ctx.create_state().expect("Failed to create state");

    let audio = generate_silent_audio(0.5);

    // Use beam search instead of greedy
    let mut params = FullParams::new(SamplingStrategy::BeamSearch {
        beam_size: 5,
        patience: 1.0
    });
    params.set_language(Some("en"));
    params.set_n_threads(2);

    println!("[Test] Running with beam search...");
    state.full(params, &audio).expect("Transcription failed");
    println!("[Test] PASSED: Beam search sampling works");
}

/// Print environment info
#[test]
fn test_00_environment_info() {
    println!("\n=== TEST 00: Environment Info ===");
    println!("[Test] OS: {}", std::env::consts::OS);
    println!("[Test] Arch: {}", std::env::consts::ARCH);

    // Check relevant environment variables
    let env_vars = [
        "GGML_NO_ACCELERATE",
        "GGML_METAL",
        "WHISPER_NO_ACCELERATE",
        "ACCELERATE_FRAMEWORK",
        "BLAS",
        "OPENBLAS_NUM_THREADS",
    ];

    for var in env_vars {
        match std::env::var(var) {
            Ok(val) => println!("[Test] {}={}", var, val),
            Err(_) => println!("[Test] {} (not set)", var),
        }
    }

    println!("[Test] PASSED: Environment info collected");
}
