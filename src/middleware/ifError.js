export const ifError = callback => async (payload, meta, task) => {
  try {
    const result = task(payload, meta);
    return result instanceof Promise ? await result : result;
  } catch (e) {
    callback(e, meta);
    throw e;
  }
};
