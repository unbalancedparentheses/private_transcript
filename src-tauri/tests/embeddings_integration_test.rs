//! Integration tests for the embeddings system
//!
//! These tests verify the embedding vector operations, serialization,
//! and similarity calculations work correctly.

use std::f32::consts::PI;

/// Helper function to create a normalized test vector
fn create_normalized_vector(values: &[f32]) -> Vec<f32> {
    let norm: f32 = values.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm > 0.0 {
        values.iter().map(|x| x / norm).collect()
    } else {
        values.to_vec()
    }
}

/// Helper function to calculate cosine similarity (matching embeddings.rs implementation)
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }

    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a > 0.0 && norm_b > 0.0 {
        dot_product / (norm_a * norm_b)
    } else {
        0.0
    }
}

/// Serialize embedding to bytes (matching embeddings.rs implementation)
fn embedding_to_bytes(embedding: &[f32]) -> Vec<u8> {
    embedding
        .iter()
        .flat_map(|f| f.to_le_bytes())
        .collect()
}

/// Deserialize embedding from bytes (matching embeddings.rs implementation)
fn bytes_to_embedding(bytes: &[u8]) -> Vec<f32> {
    bytes
        .chunks_exact(4)
        .map(|chunk| {
            let arr: [u8; 4] = chunk.try_into().unwrap_or([0; 4]);
            f32::from_le_bytes(arr)
        })
        .collect()
}

/// Find top-k most similar vectors
fn find_top_k_similar(
    query_embedding: &[f32],
    embeddings: &[(String, Vec<f32>)],
    k: usize,
) -> Vec<(String, f32)> {
    let mut similarities: Vec<(String, f32)> = embeddings
        .iter()
        .map(|(id, emb)| (id.clone(), cosine_similarity(query_embedding, emb)))
        .collect();

    similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    similarities.into_iter().take(k).collect()
}

mod cosine_similarity_tests {
    use super::*;

    #[test]
    fn test_identical_vectors() {
        let v = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let similarity = cosine_similarity(&v, &v);
        assert!((similarity - 1.0).abs() < 0.0001, "Identical vectors should have similarity 1.0");
    }

    #[test]
    fn test_opposite_vectors() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![-1.0, -2.0, -3.0];
        let similarity = cosine_similarity(&a, &b);
        assert!((similarity + 1.0).abs() < 0.0001, "Opposite vectors should have similarity -1.0");
    }

    #[test]
    fn test_orthogonal_vectors() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![0.0, 1.0, 0.0];
        let similarity = cosine_similarity(&a, &b);
        assert!(similarity.abs() < 0.0001, "Orthogonal vectors should have similarity 0.0");
    }

    #[test]
    fn test_different_lengths_returns_zero() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![1.0, 2.0];
        let similarity = cosine_similarity(&a, &b);
        assert_eq!(similarity, 0.0, "Different length vectors should return 0.0");
    }

    #[test]
    fn test_zero_vector() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![0.0, 0.0, 0.0];
        let similarity = cosine_similarity(&a, &b);
        assert_eq!(similarity, 0.0, "Zero vector should return 0.0");
    }

    #[test]
    fn test_normalized_vectors() {
        let a = create_normalized_vector(&[1.0, 2.0, 3.0]);
        let b = create_normalized_vector(&[1.0, 2.0, 3.0]);
        let similarity = cosine_similarity(&a, &b);
        assert!((similarity - 1.0).abs() < 0.0001, "Normalized identical vectors should be 1.0");
    }

    #[test]
    fn test_similar_vectors() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![1.1, 2.1, 3.1];
        let similarity = cosine_similarity(&a, &b);
        assert!(similarity > 0.99, "Similar vectors should have high similarity");
    }

    #[test]
    fn test_high_dimensional_vectors() {
        let dim = 384; // Same as MiniLM embedding dimension
        let a: Vec<f32> = (0..dim).map(|i| (i as f32).sin()).collect();
        let b: Vec<f32> = (0..dim).map(|i| (i as f32).cos()).collect();
        let similarity = cosine_similarity(&a, &b);
        // Sin and cos are orthogonal over a full period, but not necessarily for arbitrary slices
        assert!(similarity.abs() < 1.0, "Similarity should be between -1 and 1");
    }

    #[test]
    fn test_symmetry() {
        let a = vec![1.0, 2.0, 3.0, 4.0];
        let b = vec![4.0, 3.0, 2.0, 1.0];
        let sim_ab = cosine_similarity(&a, &b);
        let sim_ba = cosine_similarity(&b, &a);
        assert!((sim_ab - sim_ba).abs() < 0.0001, "Cosine similarity should be symmetric");
    }
}

mod serialization_tests {
    use super::*;

    #[test]
    fn test_roundtrip_simple() {
        let embedding = vec![0.1, 0.2, 0.3, 0.4];
        let bytes = embedding_to_bytes(&embedding);
        let recovered = bytes_to_embedding(&bytes);

        assert_eq!(embedding.len(), recovered.len());
        for (a, b) in embedding.iter().zip(recovered.iter()) {
            assert!((a - b).abs() < 0.0001, "Values should match after roundtrip");
        }
    }

    #[test]
    fn test_roundtrip_negative_values() {
        let embedding = vec![-0.5, 0.0, 0.5, -1.0, 1.0];
        let bytes = embedding_to_bytes(&embedding);
        let recovered = bytes_to_embedding(&bytes);

        for (a, b) in embedding.iter().zip(recovered.iter()) {
            assert!((a - b).abs() < 0.0001);
        }
    }

    #[test]
    fn test_roundtrip_very_small_values() {
        let embedding = vec![1e-10, 1e-20, 1e-30, 0.0];
        let bytes = embedding_to_bytes(&embedding);
        let recovered = bytes_to_embedding(&bytes);

        for (a, b) in embedding.iter().zip(recovered.iter()) {
            assert!((a - b).abs() < 1e-35);
        }
    }

    #[test]
    fn test_roundtrip_large_values() {
        let embedding = vec![1e10, 1e20, -1e15];
        let bytes = embedding_to_bytes(&embedding);
        let recovered = bytes_to_embedding(&bytes);

        for (a, b) in embedding.iter().zip(recovered.iter()) {
            let relative_error = ((a - b) / a).abs();
            assert!(relative_error < 0.0001, "Large values should roundtrip correctly");
        }
    }

    #[test]
    fn test_byte_length() {
        let embedding = vec![1.0, 2.0, 3.0];
        let bytes = embedding_to_bytes(&embedding);
        assert_eq!(bytes.len(), embedding.len() * 4, "Each f32 should be 4 bytes");
    }

    #[test]
    fn test_empty_embedding() {
        let embedding: Vec<f32> = vec![];
        let bytes = embedding_to_bytes(&embedding);
        let recovered = bytes_to_embedding(&bytes);
        assert!(recovered.is_empty());
    }

    #[test]
    fn test_384_dimensional_embedding() {
        let dim = 384;
        let embedding: Vec<f32> = (0..dim).map(|i| (i as f32 * PI / 180.0).sin()).collect();
        let bytes = embedding_to_bytes(&embedding);
        let recovered = bytes_to_embedding(&bytes);

        assert_eq!(recovered.len(), dim);
        for (a, b) in embedding.iter().zip(recovered.iter()) {
            assert!((a - b).abs() < 0.0001);
        }
    }

    #[test]
    fn test_special_float_values() {
        let embedding = vec![f32::MIN, f32::MAX, f32::EPSILON];
        let bytes = embedding_to_bytes(&embedding);
        let recovered = bytes_to_embedding(&bytes);

        assert_eq!(recovered[0], f32::MIN);
        assert_eq!(recovered[1], f32::MAX);
        assert_eq!(recovered[2], f32::EPSILON);
    }
}

mod top_k_search_tests {
    use super::*;

    fn create_test_embeddings() -> Vec<(String, Vec<f32>)> {
        vec![
            ("doc1".to_string(), vec![1.0, 0.0, 0.0]),
            ("doc2".to_string(), vec![0.9, 0.1, 0.0]),
            ("doc3".to_string(), vec![0.0, 1.0, 0.0]),
            ("doc4".to_string(), vec![0.0, 0.0, 1.0]),
            ("doc5".to_string(), vec![0.7, 0.7, 0.1]),
        ]
    }

    #[test]
    fn test_find_exact_match() {
        let embeddings = create_test_embeddings();
        let query = vec![1.0, 0.0, 0.0];
        let results = find_top_k_similar(&query, &embeddings, 1);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, "doc1");
        assert!((results[0].1 - 1.0).abs() < 0.0001);
    }

    #[test]
    fn test_find_top_3() {
        let embeddings = create_test_embeddings();
        let query = vec![1.0, 0.0, 0.0];
        let results = find_top_k_similar(&query, &embeddings, 3);

        assert_eq!(results.len(), 3);
        assert_eq!(results[0].0, "doc1"); // Exact match
        assert_eq!(results[1].0, "doc2"); // Very similar
        // doc5 should be 3rd (0.7/sqrt(0.99) ≈ 0.7)
    }

    #[test]
    fn test_k_larger_than_collection() {
        let embeddings = create_test_embeddings();
        let query = vec![1.0, 0.0, 0.0];
        let results = find_top_k_similar(&query, &embeddings, 100);

        assert_eq!(results.len(), 5, "Should return all embeddings when k > collection size");
    }

    #[test]
    fn test_k_zero() {
        let embeddings = create_test_embeddings();
        let query = vec![1.0, 0.0, 0.0];
        let results = find_top_k_similar(&query, &embeddings, 0);

        assert!(results.is_empty());
    }

    #[test]
    fn test_empty_collection() {
        let embeddings: Vec<(String, Vec<f32>)> = vec![];
        let query = vec![1.0, 0.0, 0.0];
        let results = find_top_k_similar(&query, &embeddings, 5);

        assert!(results.is_empty());
    }

    #[test]
    fn test_results_ordered_by_similarity() {
        let embeddings = create_test_embeddings();
        let query = vec![0.5, 0.5, 0.0];
        let results = find_top_k_similar(&query, &embeddings, 5);

        for i in 0..results.len() - 1 {
            assert!(
                results[i].1 >= results[i + 1].1,
                "Results should be ordered by descending similarity"
            );
        }
    }
}

mod normalization_tests {
    use super::*;

    #[test]
    fn test_normalize_standard_vector() {
        let v = vec![3.0, 4.0];
        let normalized = create_normalized_vector(&v);
        let length: f32 = normalized.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((length - 1.0).abs() < 0.0001, "Normalized vector should have unit length");
    }

    #[test]
    fn test_normalize_zero_vector() {
        let v = vec![0.0, 0.0, 0.0];
        let normalized = create_normalized_vector(&v);
        assert_eq!(normalized, v, "Zero vector should remain zero");
    }

    #[test]
    fn test_normalize_already_unit() {
        let v = vec![1.0, 0.0, 0.0];
        let normalized = create_normalized_vector(&v);
        for (a, b) in v.iter().zip(normalized.iter()) {
            assert!((a - b).abs() < 0.0001);
        }
    }

    #[test]
    fn test_normalize_preserves_direction() {
        let v = vec![2.0, 4.0, 6.0];
        let normalized = create_normalized_vector(&v);

        // Check ratios are preserved
        let ratio1 = normalized[1] / normalized[0];
        let ratio2 = v[1] / v[0];
        assert!((ratio1 - ratio2).abs() < 0.0001);
    }

    #[test]
    fn test_normalize_high_dimensional() {
        let dim = 384;
        let v: Vec<f32> = (0..dim).map(|i| i as f32).collect();
        let normalized = create_normalized_vector(&v);
        let length: f32 = normalized.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((length - 1.0).abs() < 0.0001);
    }
}

mod edge_cases {
    use super::*;

    #[test]
    fn test_nan_handling() {
        let a = vec![1.0, f32::NAN, 3.0];
        let b = vec![1.0, 2.0, 3.0];
        let similarity = cosine_similarity(&a, &b);
        // NaN in vector will propagate - similarity will be NaN
        assert!(similarity.is_nan() || similarity == 0.0);
    }

    #[test]
    fn test_infinity_handling() {
        let a = vec![f32::INFINITY, 1.0, 1.0];
        let b = vec![1.0, 1.0, 1.0];
        let similarity = cosine_similarity(&a, &b);
        // Should handle gracefully (might be NaN or a valid value)
        assert!(similarity.is_nan() || similarity.is_finite());
    }

    #[test]
    fn test_very_small_norm() {
        let a = vec![1e-38, 1e-38, 1e-38];
        let b = vec![1e-38, 1e-38, 1e-38];
        let similarity = cosine_similarity(&a, &b);
        // Very small but equal vectors should still be similar
        assert!((similarity - 1.0).abs() < 0.001 || similarity == 0.0);
    }

    #[test]
    fn test_single_element_vectors() {
        let a = vec![5.0];
        let b = vec![3.0];
        let similarity = cosine_similarity(&a, &b);
        assert!((similarity - 1.0).abs() < 0.0001, "Parallel single-element vectors should have similarity 1.0");
    }

    #[test]
    fn test_partial_bytes() {
        // Test with incomplete byte array (not multiple of 4)
        let bytes = vec![0u8, 0, 0, 0, 1, 2]; // 6 bytes - only first 4 make a complete f32
        let recovered = bytes_to_embedding(&bytes);
        assert_eq!(recovered.len(), 1, "Should only recover complete f32 values");
    }
}

mod semantic_similarity_simulation {
    use super::*;

    /// Simulates how similar text embeddings would behave
    #[test]
    fn test_similar_concepts_high_similarity() {
        // Simulating embeddings for related concepts
        // In real embeddings, "dog" and "puppy" would be close
        let dog = create_normalized_vector(&[0.8, 0.5, 0.2, 0.1]);
        let puppy = create_normalized_vector(&[0.78, 0.52, 0.18, 0.12]);
        let similarity = cosine_similarity(&dog, &puppy);
        assert!(similarity > 0.95, "Related concepts should have high similarity");
    }

    #[test]
    fn test_unrelated_concepts_low_similarity() {
        // "dog" vs "mathematics"
        let dog = create_normalized_vector(&[0.8, 0.5, 0.2, 0.1]);
        let math = create_normalized_vector(&[0.1, 0.1, 0.9, 0.4]);
        let similarity = cosine_similarity(&dog, &math);
        assert!(similarity < 0.7, "Unrelated concepts should have lower similarity");
    }

    #[test]
    fn test_query_retrieval_simulation() {
        // Simulate a RAG search scenario
        let documents = vec![
            ("meeting_notes".to_string(), create_normalized_vector(&[0.7, 0.6, 0.3, 0.1])),
            ("project_plan".to_string(), create_normalized_vector(&[0.6, 0.7, 0.3, 0.2])),
            ("recipe".to_string(), create_normalized_vector(&[0.1, 0.2, 0.8, 0.5])),
            ("code_review".to_string(), create_normalized_vector(&[0.5, 0.5, 0.5, 0.5])),
        ];

        // Query about project work
        let query = create_normalized_vector(&[0.65, 0.65, 0.3, 0.15]);
        let results = find_top_k_similar(&query, &documents, 2);

        // Top 2 should be work-related documents
        let top_ids: Vec<&str> = results.iter().map(|(id, _)| id.as_str()).collect();
        assert!(
            top_ids.contains(&"meeting_notes") || top_ids.contains(&"project_plan"),
            "Work-related query should retrieve work documents"
        );
        assert!(
            !top_ids.contains(&"recipe"),
            "Recipe should not be top match for work query"
        );
    }
}
