import * as React from "react";

const workingTasks = new Map();

const getDate = () => {
  const date = new Date();
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`;
};

const defaultMiddleware = [
  {
    beforeGoalStart({ name }) {
      console.groupCollapsed(`Goal ${name}`);
    },
    beforeTaskStart({ index, state }) {
      console.log(`Task #${index} start at ${getDate()}`, { state });
    },
    afterTaskEnd({ index, state }) {
      console.log(`Task #${index} end at ${getDate()}`, { state });
    },
    afterGoalEnd({ name }) {
      console.log(`Goal ${name} complete at ${getDate()}`);
      console.groupEnd();
    },
    goalCatchError({ name }) {
      console.error(`Goal ${name} rejected by race condition`);
      console.groupEnd();
    }
  }
];

async function executor(name, tasks, middleware, payload) {
  const processId = Symbol();
  let taskIndex = 0;
  let result = payload;

  workingTasks.set(tasks, processId);

  middleware.forEach(({ beforeGoalStart }) =>
    beforeGoalStart({ name, payload, state: this.state })
  );

  try {
    for (; taskIndex < tasks.length; taskIndex++) {
      // escape race condition
      if (workingTasks.get(tasks) !== processId) {
        throw new Error(`Goal ${name} rejected by race condition`);
      }

      middleware.forEach(({ beforeTaskStart }) =>
        beforeTaskStart({
          name,
          payload,
          state: this.state,
          result,
          index: taskIndex
        })
      );

      result = await tasks[taskIndex](result);

      middleware.forEach(({ afterTaskEnd }) =>
        afterTaskEnd({
          name,
          payload,
          state: this.state,
          result,
          index: taskIndex
        })
      );
    }
  } catch (error) {
    middleware.forEach(({ goalCatchError }) =>
      goalCatchError({
        name,
        payload,
        state: this.state,
        result,
        index: taskIndex
      })
    );
    return error;
  }
  middleware.forEach(({ afterGoalEnd }) =>
    afterGoalEnd({
      name,
      payload,
      state: this.state,
      result,
      index: taskIndex
    })
  );
  return result;
}

export class Coach extends React.Component {
  defaultMiddleware = defaultMiddleware;

  // wait state update for continue
  async setWaitState(updater) {
    return await new Promise(resolve =>
      this.setState(updater, state => resolve(this.state))
    );
  }

  goal(...args) {
    let name = "",
      tasks = [],
      middleware = defaultMiddleware;
    if (typeof args[0] === "string") {
      name = args[0];
      tasks = args[1] || tasks;
      middleware = args[2] || middleware;
    } else {
      tasks = args[0] || tasks;
      middleware = args[1] || middleware;
    }
    return payload => executor.bind(this)(name, tasks, middleware, payload);
  }
}
