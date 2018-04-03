const executor = args => {
  const {
    description,
    tasks,
    errorHandler,
    tasksNames,
    instanceId,
    parentInstanceId,
    processId,
  } = args;
  let { payload, taskIndex } = args;

  const tasksCount = tasks.length;

  for (; taskIndex < tasksCount; taskIndex++) {
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
      const result = tasks[taskIndex](payload, meta);
      if (result instanceof Promise) {
        return asyncExecutor(args, result);
      } else {
        payload = result;
      }
    } catch (error) {
      errorHandler(error, meta);
      throw error;
    }
  }

  return payload;
};

const asyncExecutor = async (
  {
    description,
    tasks,
    errorHandler,
    tasksNames,
    instanceId,
    payload,
    parentInstanceId,
    processId,
    taskIndex,
  },
  task
) => {
  const tasksCount = tasks.length;

  try {
    payload = await task;
    taskIndex++;
  } catch (error) {
    errorHandler(error, {
      description,
      instanceId,
      parentInstanceId,
      processId,
      tasksCount,
      taskIndex,
      taskName: tasksNames[taskIndex],
    });
    throw error;
  }

  for (; taskIndex < tasksCount; taskIndex++) {
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
      payload = await tasks[taskIndex](payload, meta);
    } catch (error) {
      payload = errorHandler(error, meta);
      throw error;
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

  const errorHandlerWithMiddleware = withMiddleware(middleware)(errorHandler);

  const instanceId = Symbol();

  const goal = (payload, { instanceId: parentInstanceId } = {}) =>
    executor({
      description,
      tasks: tasksWithMiddleware,
      errorHandler: errorHandlerWithMiddleware,
      tasksNames,
      instanceId,
      payload,
      parentInstanceId,
      processId: Symbol(),
      taskIndex: 0,
    });

  goal.middleware = Object.freeze(middleware);
  goal.replaceMiddleware = (middleware = {}) => createGoal({ ...goalSettings, middleware });

  return goal;
};

const identity = p => p;

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
      tasks = { identity },
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
