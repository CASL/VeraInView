export function zip(...lists) {
  const result = [];
  const length = lists.reduce((min, l) => Math.min(min, l.length), Infinity);
  for (let i = 0; i < length; ++i) {
    result.push(lists.map((l) => l[i]));
  }
  return result;
}

export default {
  zip,
};
