const executor = async ({
  description,
  tasks,
  errorHandler,
  tasksNames,
  instanceId,
  payload,
  parentInstanceId,
  processId,
}) => {
  const tasksCount = tasks.length;

  for (let taskIndex = 0; taskIndex < tasksCount; taskIndex++) {
    const meta = {
      description,
      instanceId,
      parentInstanceId,
      processId,
      tasksCount,
      taskIndex,
      taskName: tasksNames[taskIndex],
    };

    try {
      const result = await tasks[taskIndex](payload, meta);
      if (result instanceof Promise) {
        payload = await result;
      } else {
        payload = result;
      }
    } catch (error) {
      payload = errorHandler(error, meta);
    }
  }

  return payload;
};

const compose = (theMiddleware, task) => (payload, meta) => theMiddleware(payload, meta, task);

const withMiddleware = middleware => task =>
  Object.values(middleware).reduceRight((acc, theMiddleware) => compose(theMiddleware, acc), task);

const createGoal = goalSettings => {
  const { description, tasks, errorHandler, tasksNames, middleware } = goalSettings;
  const tasksWithMiddleware = tasks.map(withMiddleware(middleware));

  const instanceId = Symbol();

  const goal = (payload, { instanceId: parentInstanceId } = {}) =>
    executor({
      description,
      tasks: tasksWithMiddleware,
      errorHandler,
      tasksNames,
      instanceId,
      payload,
      parentInstanceId,
      processId: Symbol(),
    });

  goal.middleware = Object.freeze(middleware);
  goal.replaceMiddleware = (middleware = {}) => createGoal({ ...goalSettings, middleware });

  return goal;
};

export const identity = callback => async (payload, meta) => {
  await callback(payload, meta);
  return payload;
};

const defaultErrorHandler = error => {
  throw error;
};

export class Coach {
  constructor({ middleware = {} } = {}) {
    Object.defineProperty(this, 'middleware', {
      value: Object.freeze(middleware),
      configurable: false,
      enumerable: false,
      writable: false,
    });
  }

  goal(...args) {
    let description = '',
      tasks = { identity: identity },
      errorHandler = defaultErrorHandler;

    args.forEach(argument => {
      const type = typeof argument;
      if (type === 'string') description = argument;
      if (type === 'object') tasks = argument;
      if (type === 'function') errorHandler = argument;
    });

    const tasksNames = [];
    tasks = Object.keys(tasks).map(key => {
      tasksNames.push(key);
      return tasks[key];
    });

    return createGoal({
      description,
      tasks,
      errorHandler,
      tasksNames,
      middleware: this.middleware,
    });
  }
}
