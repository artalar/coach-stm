const workingTasks = new Map();

export class RejectedByRaceCondition extends Error {
  constructor() {
    super();
    this.message = 'rejected by race condition';
  }
}

export const preventRaceCondition = async (payload, meta, task) => {
  const { instanceId, taskIndex, processId } = meta;
  if (taskIndex === 0) {
    workingTasks.set(instanceId, processId);
  }
  if (workingTasks.get(instanceId) !== processId) {
    throw new RejectedByRaceCondition();
  }
  const result = task(payload, meta);
  return result instanceof Promise ? await result : result;
};
