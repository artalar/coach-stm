export const identity = (payload, meta, task) => {
  let result = task(payload, meta);
  if (result instanceof Promise) return asyncIdentity(result, payload);
  return result === undefined ? payload : result;
};

const asyncIdentity = async (task, payload) => {
  const result = await task;
  return result === undefined ? payload : result;
}