
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { dbPromise, saveResource } from './db';
import { retrieveRelevantPassages } from './retrieval';

describe('Local document retrieval', () => {
  beforeEach(async () => {
    const db = await dbPromise;
    await db.clear('resources');
  });

  it('retrieves a relevant note', async () => {
    const note = await saveResource({
      title: 'Machine Learning',
      kind: 'note',
      content:
        'Backpropagation is an algorithm used to train neural networks.',
    });

    const results = await retrieveRelevantPassages(
      'Explain backpropagation',
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].resourceId).toBe(note.id);
    expect(results[0].content).toContain('Backpropagation');
  });

  it('retrieves extracted document text', async () => {
    const document = await saveResource({
      title: 'Database Course',
      kind: 'document',
      content:
        'Normalization reduces data redundancy in relational databases.',
      extractionStatus: 'completed',
    });

    const results = await retrieveRelevantPassages(
      'What is normalization?',
    );

    expect(results[0].resourceId).toBe(document.id);
  });

  it('ignores documents with failed extraction', async () => {
    await saveResource({
      title: 'Failed Document',
      kind: 'document',
      content: 'Quantum computing fundamentals.',
      extractionStatus: 'failed',
    });

    const results = await retrieveRelevantPassages(
      'quantum computing',
    );

    expect(results).toHaveLength(0);
  });

  it('does not return unrelated content', async () => {
    await saveResource({
      title: 'Cooking',
      kind: 'note',
      content: 'Boil the potatoes for twenty minutes.',
    });

    const results = await retrieveRelevantPassages(
      'backpropagation neural networks',
    );

    expect(results).toHaveLength(0);
  });

  it('prioritizes title matches', async () => {
    await saveResource({
      title: 'General Notes',
      kind: 'note',
      content: 'React is a JavaScript library.',
    });

    const preferred = await saveResource({
      title: 'React Fundamentals',
      kind: 'note',
      content: 'Components help structure user interfaces.',
    });

    const results = await retrieveRelevantPassages('React');

    expect(results[0].resourceId).toBe(preferred.id);
  });

  it('returns no passages for an empty query', async () => {
    const results = await retrieveRelevantPassages('   ');

    expect(results).toEqual([]);
  });

  it('does not return duplicate passages from the same resource', async () => {
  const repeatedText = Array(20)
    .fill(
      'Neural networks learn patterns from training data using backpropagation.',
    )
    .join(' ');

  const note = await saveResource({
    title: 'Neural Networks',
    kind: 'note',
    content: repeatedText,
  });

  const results = await retrieveRelevantPassages(
    'neural networks backpropagation',
  );

  const resourceResults = results.filter(
    (result) => result.resourceId === note.id,
  );

  expect(resourceResults.length).toBe(1);
});


it('prioritizes content matches over title-only matches', async () => {
  await saveResource({
    title: 'Neural Networks Backpropagation',
    kind: 'note',
    content: 'This note discusses unrelated cooking recipes.',
  });

  const relevant = await saveResource({
    title: 'Study Notes',
    kind: 'note',
    content:
      'Backpropagation trains neural networks by calculating gradients.',
  });

  const results = await retrieveRelevantPassages(
    'neural networks backpropagation',
  );

  expect(results[0].resourceId).toBe(relevant.id);
});

});
