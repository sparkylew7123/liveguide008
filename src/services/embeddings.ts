import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChunkMetadata {
  documentId: string;
  chunkIndex: number;
  totalChunks: number;
  startChar: number;
  endChar: number;
}

/**
 * Generate embeddings for a text using OpenAI's text-embedding-3-small model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not set, using placeholder embeddings');
    // Return placeholder embedding for development
    return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Split text into chunks with overlap for better context preservation
 */
export function chunkText(
  text: string, 
  maxChunkSize: number = 1500,
  overlapSize: number = 200
): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    // Find the end of the current chunk
    let endIndex = startIndex + maxChunkSize;
    
    // If we're not at the end of the text, try to break at a sentence or paragraph
    if (endIndex < text.length) {
      // Look for sentence endings
      const sentenceEndings = ['. ', '! ', '? ', '\n\n'];
      let bestBreak = endIndex;
      
      for (const ending of sentenceEndings) {
        const lastIndex = text.lastIndexOf(ending, endIndex);
        if (lastIndex > startIndex + maxChunkSize * 0.5) {
          bestBreak = lastIndex + ending.length;
          break;
        }
      }
      
      endIndex = bestBreak;
    }
    
    // Extract the chunk
    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    
    // Move to the next chunk with overlap
    startIndex = endIndex - overlapSize;
    
    // Ensure we don't get stuck in an infinite loop
    if (startIndex <= 0 && chunks.length > 0) {
      startIndex = endIndex;
    }
  }

  return chunks;
}

/**
 * Generate embeddings for multiple chunks
 */
export async function generateChunkEmbeddings(
  chunks: string[]
): Promise<Array<{ text: string; embedding: number[] }>> {
  const embeddings = await Promise.all(
    chunks.map(async (chunk) => ({
      text: chunk,
      embedding: await generateEmbedding(chunk),
    }))
  );

  return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find the most similar chunks to a query
 */
export async function findSimilarChunks(
  queryEmbedding: number[],
  chunks: Array<{ id: string; embedding: number[]; text: string }>,
  topK: number = 5,
  threshold: number = 0.7
): Promise<Array<{ id: string; text: string; similarity: number }>> {
  const similarities = chunks.map((chunk) => ({
    id: chunk.id,
    text: chunk.text,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  // Sort by similarity and filter by threshold
  return similarities
    .filter((item) => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}