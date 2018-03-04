import * as React from "react";

const workingTasks = new WeakMap();

const getDate = () => {
  const date = new Date();
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`;
};

const defaultMiddleware = [
  {
    beforeGoalStart({ name }) {
      console.groupCollapsed(`Goal ${name}`);
    },
    beforeTaskStart({ index, payload, state }) {
      console.log(`Task #${index} start at ${getDate()}`, { state, payload });
    },
    afterTaskEnd({ index, state }) {
      console.log(`Task #${index} end at ${getDate()}`, { state });
    },
    afterGoalEnd({ name }) {
      console.log(`Goal ${name} complete at ${getDate()}`);
      console.groupEnd();
    },
    goalCatchError({ name, error }) {
      console.error(`Goal ${name} catch error`, error);
      console.groupEnd();
    }
  }
];

async function executor(name, tasks, errorHandler, payload) {
  const processId = Symbol();
  const tasksCount = tasks.length - 1;
  let taskIndex = 0;
  let result = payload;
  let loops = 0;

  workingTasks.set(tasks, processId);

  this.middleware.forEach(({ beforeGoalStart }) =>
    beforeGoalStart({ name, payload, state: this.state })
  );

  while (taskIndex <= tasksCount) {
    try {
      // escape race condition
      if (workingTasks.get(tasks) !== processId) {
        const error = new Error("rejected by race condition");
        error.rejectedByRaceCondition = true;
        throw error;
      }

      this.middleware.forEach(({ beforeTaskStart }) =>
        beforeTaskStart({
          index: taskIndex,
          state: this.state,
          name,
          payload,
          result
        })
      );

      result = await tasks[taskIndex](result);

      this.middleware.forEach(({ afterTaskEnd }) =>
        afterTaskEnd({
          index: taskIndex,
          state: this.state,
          name,
          payload,
          result
        })
      );

      taskIndex++;
    } catch (error) {
      const log = () =>
        this.middleware.forEach(({ goalCatchError }) =>
          goalCatchError({
            index: taskIndex,
            state: this.state,
            name,
            payload,
            result,
            error
          })
        );

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

  this.middleware.forEach(({ afterGoalEnd }) =>
    afterGoalEnd({
      index: taskIndex,
      state: this.state,
      name,
      payload,
      result
    })
  );
  return result;
}

export class Coach extends React.Component {
  middleware = defaultMiddleware;

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
    const newGoal = payload =>
      executor.bind(this)(
        name ? `"${name}"` : "",
        tasks,
        errorHandler,
        payload
      );

    newGoal.tasks = tasks;

    return newGoal;
  }
}
