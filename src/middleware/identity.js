export const identity = callback => async (payload, meta, task) => {
  const result = await task(payload, meta);
  return result === undefined ? payload : result;
};
