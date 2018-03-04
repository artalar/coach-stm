# [Coach state manager](https://www.npmjs.com/package/coach-stm)

The Coach helps you achieve your goals, by simplifying your tasks

### Instal

```bash
npm i -S coach-stm
```
or
```bash
yarn add coach-stm
```

### Motivation
* Consider all associated data-driven functions and methods in one simple and predictable place.
* Don`t worry about race condition
* Wish to get simple and familiar state manager with deep debugging accessibility
* Inspiration from new React.Context API

Think about your usual case - you need to send user input from one place to another. So you create action and it must be simple, but you face difficulties like: normalizing and verifying data, branching to conditions, awaiting side effects and many other... And now the input from user ~~mutate~~ transforms into many slices of your code and it's really hard to debug.

### Explanation
You can write selectors, setters, business logic, middleware and connect it with DI in any place of your code structure, but all of them must be connected for the user case in one specific place. It gives you flexibility with modules and predictability for business logic and debugging.

With **_Coach_** - extremely simple state manager extended from _React.Component_, you get the **_goal_** - mechanism form compose, run and keep your chain of some **_tasks_** for achievement ~~actions~~ goals == intentions == user story.

Every task could be synchronous or asynchronous (promisify), as well as the goal. So you can combine goals if needed! If you need to break up the chain of tasks, just `throw` it, the goal will wrap it and save your application (as well as some unexpected error).

In redux you can log and debug only state changes. It's awful! With Coach middleware, you can perfectly control and debug EVERY step of your tasks by default ;) But you can write and add your own middleware.

> ### TODO
> * add real world example
> * create wrapper for new React.Context
> * create the connector, basic on reselect
> * rewrite middleware
> * complement documentation
> * add Flow types (and TS \ just JSDoc?)

### API example

[![Counter](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/ykk9xoq87v)

```javascript
import { Coach } from "./coach-stm";

const sleep = async (ms = 16) =>
  new Promise(resolve => setTimeout(() => resolve(), ms));

export class Counter extends Coach {
  state = {
    fetching: false,
    count: 0
  };

  fetchLens = status => payload => {
    this.setState(state => ({ fetching: status }));
    return payload;
  };

  countSelector = payload => ({ payload, count: this.state.count });

  countSetter = count => this.setWaitState(state => ({ count }));

  logic1 = ({ count, payload }) => count + payload;

  logic2 = async payload => {
    // do sum stuff
    await sleep(1000);
    return payload;
  };

  changeCount = this.goal("change count", [
    this.fetchLens(true),
    this.countSelector,
    this.logic1,
    this.logic2,
    this.fetchLens(false),
    this.countSetter
  ]);

  handleChange = dif => async () => {
    await this.changeCount(dif);
    // another goal?
  };

//......
```