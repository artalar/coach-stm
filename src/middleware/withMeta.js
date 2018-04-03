export const withMeta = externalMeta => (payload, meta, task) => {
  meta = { ...meta, ...externalMeta };
  return task(payload, meta);
};