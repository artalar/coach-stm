import * as React from "react";

const compose = (decorator, task) => (payload, options) =>
  decorator(payload, options, task);

const workingTasks = new WeakMap();

const getDate = () => {
  const date = new Date();
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`;
};

const logger = async (payload, options, task) => {
  const { name, taskIndex, tasksCount } = options;
  if (taskIndex === 0) console.groupCollapsed(`Goal ${name}`);
  console.log(`Task #${taskIndex} start at ${getDate()}`, options);
  payload = await task(payload, options);
  console.log(`Task #${taskIndex} end at ${getDate()}`, options);
  if (taskIndex === tasksCount) console.groupEnd();
  return payload;
};

async function executor(name, tasks, errorHandler, initialPayload) {
  const processId = Symbol();
  const tasksCount = tasks.length - 1;
  let taskIndex = 0;
  // accumulate payload for case when taskIndex changed by throw
  // and we need call previous Task with old payload

  const payload = [initialPayload];
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

      payload[taskIndex + 1] = await tasks[taskIndex](payload[taskIndex], {
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

  // `- 1` because in end of while tick we do `taskIndex++;`
  return payload[taskIndex - 1];
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
      this.decorators.reduceRight(
        (acc, decorator) => compose(decorator, acc),
        task
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
