import * as React from "react";

const compose = (f, x) => (payload, options) => x(payload, options, f);

const workingTasks = new WeakMap();

const getDate = () => {
  const date = new Date();
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`;
};

const logger = (payload, options, task) => {
  const { name, taskIndex, tasksCount } = options;
  if (taskIndex === 0) console.groupCollapsed(`Goal ${name}`);
  console.log(`Task #${taskIndex} start at ${getDate()}`, options);
  payload = task(payload, options);
  console.log(`Task #${taskIndex} end at ${getDate()}`, options);
  if (taskIndex === tasksCount) console.groupEnd();
  return payload;
};

async function executor(name, tasks, errorHandler, initialPayload) {
  const processId = Symbol();
  const tasksCount = tasks.length - 1;
  let taskIndex = 0;
  let result = initialPayload;
  let loops = 0;

  workingTasks.set(tasks, processId);

  while (taskIndex <= tasksCount) {
    try {
      // escape race condition
      if (workingTasks.get(tasks) !== processId) {
        const error = new Error("rejected by race condition");
        error.rejectedByRaceCondition = true;
        throw error;
      }

      result = await tasks[taskIndex](result, {
        state: this.state,
        initialPayload,
        name,
        taskIndex,
        tasksCount
      });

      taskIndex++;
    } catch (error) {
      const log = () => {
        console.error(`Task #${taskIndex} FILED at ${getDate()}`, {
          state: this.state,
          initialPayload,
          name,
          taskIndex,
          tasksCount
        });
        console.groupEnd();
      };

      if (error.rejectedByRaceCondition) {
        log();
        throw error;
      }

      const newTaskIndex = errorHandler(error, taskIndex);
      if (newTaskIndex === undefined || newTaskIndex > tasksCount) {
        log();
        throw error;
      }
      if (newTaskIndex === taskIndex && this.maxLoop < ++loops) {
        log();
        throw new Error(`to many loops`);
      }

      // continue with renew taskIndex;
      taskIndex = newTaskIndex;
    }
  }

  return result;
}

export class Coach extends React.Component {
  decorators = [logger];

  maxLoop = 5;

  isRejectedByRaceCondition(error) {
    return error.rejectedByRaceCondition;
  }

  // wait state update for continue
  async setWaitState(updater) {
    return await new Promise(resolve =>
      this.setState(updater, state => resolve(this.state))
    );
  }

  goal(name, tasks = [], errorHandler = () => tasks.length) {
    const decoratedTasks = tasks.map(task =>
      this.decorators.reduce(
        (acc, decorator) => compose(task, decorator),
        f => f
      )
    );
    const newGoal = payload =>
      executor.bind(this)(
        name ? `"${name}"` : "",
        decoratedTasks,
        errorHandler,
        payload
      );

    newGoal.tasks = decoratedTasks;

    return newGoal;
  }
}
