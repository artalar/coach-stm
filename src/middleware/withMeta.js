export const withMeta = externalMeta => async (payload, meta, task) => {
  meta = { ...meta, ...externalMeta };
  const result = task(payload, meta);
  return result instanceof Promise ? await result : result;
};
