
import { getResources } from './db';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but',
  'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'to', 'of', 'in',
  'on', 'at', 'for', 'from', 'by',
  'with', 'as', 'it', 'its', 'this',
  'that', 'these', 'those', 'what',
  'which', 'who', 'when', 'where',
  'why', 'how', 'do', 'does', 'did',
  'can', 'could', 'would', 'should',
  'me', 'my', 'you', 'your', 'about',
  'explain', 'describe', 'tell',
]);

export interface RetrievedPassage {
  resourceId: string;
  title: string;
  content: string;
  score: number;
}

function tokenize(text: string): string[] {
  const tokens =
    text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

  return tokens.filter(
    (token) => token.length > 1 && !STOP_WORDS.has(token),
  );
}

function chunkText(
  text: string,
  chunkSize = 1200,
  overlap = 200,
): string[] {
  const chunks: string[] = [];
  const step = chunkSize - overlap;

  for (let start = 0; start < text.length; start += step) {
    const chunk = text.slice(start, start + chunkSize).trim();

    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

export async function retrieveRelevantPassages(
  query: string,
  limit = 5,
): Promise<RetrievedPassage[]> {
  if (!query.trim() || limit <= 0) {
    return [];
  }

  const resources = await getResources();
  const queryTokens = new Set(tokenize(query));

  if (queryTokens.size === 0) {
    return [];
  }

  const results: RetrievedPassage[] = [];

  for (const resource of resources) {
    if (
      resource.kind === 'document' &&
      resource.extractionStatus !== 'completed'
    ) {
      continue;
    }

    const content = resource.content?.trim();

    if (!content) {
      continue;
    }

    const chunks = chunkText(content);
    const titleTokens = new Set(tokenize(resource.title));

    for (const chunk of chunks) {
      const chunkTokens = new Set(tokenize(chunk));

      let contentScore = 0;
      let titleScore = 0;

      for (const token of queryTokens) {
        if (chunkTokens.has(token)) {
          contentScore += 1;
        }

        if (titleTokens.has(token)) {
          titleScore += 1;
        }
      }

      // Short queries favor title matches.
      // Longer queries prioritize matching passage content.
      const score =
        queryTokens.size === 1
          ? titleScore * 2 + contentScore
          : contentScore * (queryTokens.size + 1) + titleScore;

      if (score > 0) {
        results.push({
          resourceId: resource.id,
          title: resource.title,
          content: chunk,
          score,
        });
      }
    }
  }

  // Rank passages, then keep only the best passage per resource.
  results.sort((a, b) => b.score - a.score);

  const uniqueResults = new Map<string, RetrievedPassage>();

  for (const result of results) {
    if (!uniqueResults.has(result.resourceId)) {
      uniqueResults.set(result.resourceId, result);
    }
  }

  return Array.from(uniqueResults.values()).slice(0, limit);
}
