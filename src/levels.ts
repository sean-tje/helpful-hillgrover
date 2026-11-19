// School levels written in short forms ("Sec 1", "Sec One", "S1", "Secondary 1", "Sec 1-2")
// become the official names ("Secondary One", "Secondary One and Two"). Class names such as
// "Sec 3E3" or "2A" are left alone.
const WORDS: Record<string, string> = {
  '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five',
  one: 'One', two: 'Two', three: 'Three', four: 'Four', five: 'Five',
};
const LEVEL = '([1-5]|one|two|three|four|five)';
const SHORT = `(?:sec(?:ondary)?\\s*|s(?=[1-5]\\b))`;
const PATTERN = new RegExp(`\\b${SHORT}${LEVEL}((?:\\s*(?:-|to|&|and|/|,)\\s*${LEVEL}\\b)*)(?![\\w-])`, 'gi');

const word = (n: string) => WORDS[n.toLowerCase()];

export const expandLevels = (text: string) =>
  (text || '').replace(PATTERN, (_match, first: string, rest: string) => {
    const others = rest ? [...rest.matchAll(new RegExp(LEVEL, 'gi'))].map(m => word(m[1])) : [];
    if (!others.length) return `Secondary ${word(first)}`;
    const all = [word(first), ...others];
    return `Secondary ${all.slice(0, -1).join(', ')} and ${all[all.length - 1]}`;
  });
