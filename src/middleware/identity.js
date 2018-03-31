export const identity = async (payload, meta, task) => {
  const result = await task(payload, meta);
  return result === undefined ? payload : result;
};
