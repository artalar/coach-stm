/******************
 *** MIDDLEWARE ***
 ******************/

const getDate = () => {
  const date = new Date();
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`;
};

export const logger = async (payload, meta, task) => {
  const { description, taskIndex, tasksCount } = meta;
  if (taskIndex === 0) {
    console.groupCollapsed(`Goal ${description ? `"${description}"` : ""}`);
  }
  console.log(`Task #${taskIndex} start at ${getDate()}`, { payload, meta });
  try {
    payload = await task(payload, meta);
  } catch (e) {
    console.error(`Task #${taskIndex} failed at ${getDate()}`, {
      payload,
      meta
    });
    console.groupEnd();
    throw e;
  }
  console.log(`Task #${taskIndex} end at ${getDate()}`, { payload, meta });
  if (taskIndex === tasksCount - 1) console.groupEnd();
  return payload;
};

const workingTasks = new WeakMap();

export const rejectedByRaceCondition = new Error("rejected by race condition");

export const preventRaceCondition = async (payload, meta, task) => {
  const { tasks, taskIndex, processId } = meta;
  if (taskIndex === 0) {
    workingTasks.set(tasks, processId);
  }
  if (workingTasks.get(tasks) !== processId) {
    throw rejectedByRaceCondition;
  }
  return await task(payload, meta);
};

/************
 *** CORE ***
 ************/

const executor = async ({
  description,
  tasks,
  payload,
  startIndex,
  processId
}) => {
  const tasksCount = tasks.length;

  for (let taskIndex = startIndex; taskIndex < tasksCount; taskIndex++) {
    const meta = {
      description,
      tasks,
      payload,
      startIndex,
      processId,
      tasksCount,
      taskIndex
    };

    payload = await tasks[taskIndex](payload, meta);
  }

  return payload;
};

const compose = (theMiddleware, task) => (payload, meta) =>
  theMiddleware(payload, meta, task);

export class Coach {
  constructor({ middleware = [logger, preventRaceCondition] } = {}) {
    this.middleware = middleware;
  }

  withMiddleware(middleware) {
    return task =>
      middleware.reduceRight(
        (acc, theMiddleware) => compose(theMiddleware, acc),
        task
      );
  }

  goal(description, tasks = [payload => payload]) {
    // description not specified
    if (Array.isArray(description)) {
      tasks = description;
      description = "";
    }

    tasks = tasks.map(this.withMiddleware(this.middleware));

    return (payload, startIndex = 0) =>
      executor({
        description,
        tasks,
        payload,
        startIndex,
        processId: Symbol()
      });
  }
}
