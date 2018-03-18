const executor = async ({ description, tasks, instanceId, payload, processId }) => {
  const tasksCount = tasks.length;

  for (let taskIndex = 0; taskIndex < tasksCount; taskIndex++) {
    const meta = {
      description,
      instanceId,
      processId,
      tasksCount,
      taskIndex,
    };

    payload = await tasks[taskIndex](payload, meta);
  }

  return payload;
};

const compose = (theMiddleware, task) => (payload, meta) => theMiddleware(payload, meta, task);

export class Coach {
  constructor({ middleware = [] } = {}) {
    this.middleware = middleware;
  }

  withMiddleware(middleware) {
    return task =>
      middleware.reduceRight((acc, theMiddleware) => {
        const f = compose(theMiddleware, acc);
        f._cStmTaskName = task._cStmTaskName || task.name;
        return f;
      }, task);
  }

  goal(description, tasks = [payload => payload]) {
    // description not specified
    if (Array.isArray(description)) {
      tasks = description;
      description = '';
    }

    const instanceId = Symbol();

    tasks = tasks.map(this.withMiddleware(this.middleware));

    return payload =>
      executor({
        description,
        tasks,
        instanceId,
        payload,
        processId: Symbol(),
      });
  }
}
