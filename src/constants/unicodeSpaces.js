// Unicode space characters used to break tokenization in AI detectors
// while remaining visually similar to a normal space.
export const unicodeSpaces = {
  'Em Space': '\u2003',
  'En Space': '\u2002',
  'Thin Space': '\u2009',
  'Thin Space*2': '\u2009\u2009',
  'Hair Space': '\u200A',
  'Narrow, Hair': '\u202F\u200A',
  'Thin, Hair': ' \u2009\u200A',
  'Hair Space*3': '\u200A\u200A\u200A',
  'Narrow No-Break': '\u202F',
  'Narrow No-Break*2': '\u202F\u202F',
  'Zero Width Space': '\u200A\u200B\u200A',
  'Word Joiner': '\u2009\u2060\u2009',
};

export const usageDescription = {
  'Em Space': 'in wide spacing between characters',
  'En Space': 'for mid-range spacing',
  'Thin Space': 'for slightly narrower spacing',
  'Thin Space*2': 'for even narrower spacing',
  'Hair Space': 'for very thin spacing',
  'Narrow, Hair': 'for extra narrow hair-like spacing',
  'Thin, Hair': 'for a mix of thin and hair spacing',
  'Hair Space*3': 'for extremely tight spacing',
  'Narrow No-Break': 'to prevent line breaks with tight spacing',
  'Narrow No-Break*2': 'for even tighter no-break spacing',
  'Zero Width Space': 'to create word breaks without visible space',
  'Word Joiner': 'to prevent word breaks without adding width',
};
