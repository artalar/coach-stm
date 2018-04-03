export const identity = async (payload, meta, task) => {
  let result = task(payload, meta);
  result = result instanceof Promise ? await result : result;
  return result === undefined ? payload : result;
};
