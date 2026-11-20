import { describe, expect, it } from 'vitest';
import { loadContent, parseContent } from './loader';

const prabu = { id: 'character.prabu', name: 'Prabu', age: 27, portrait: 'p' };

describe('content loader', () => {
  it('loads the shipped content', () => {
    expect(loadContent().characters['character.prabu']?.name).toBe('Prabu');
  });

  it('rejects bad ids, duplicates and dangling references', () => {
    expect(() => parseContent({ characters: [{ ...prabu, id: 'Prabu' }], newGame: { startingCharacter: 'character.prabu' } })).toThrow();
    expect(() => parseContent({ characters: [{ ...prabu, id: 'characterXprabu' }], newGame: { startingCharacter: 'character.prabu' } })).toThrow();
    expect(() => parseContent({ characters: [prabu, prabu], newGame: { startingCharacter: 'character.prabu' } })).toThrow(/Duplicate/);
    expect(() => parseContent({ characters: [prabu], newGame: { startingCharacter: 'character.ghost' } })).toThrow(/unknown character/);
  });
});
