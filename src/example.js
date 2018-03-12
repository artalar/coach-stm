import React from "react";

import { Coach, rejectedByRaceCondition } from "./coach-stm";

const sleep = async (ms = 16) =>
  new Promise(resolve => setTimeout(() => resolve(), ms));

const coach = new Coach();

export class Counter extends React.Component {
  countMaxSize = 5;
  state = {
    fetching: false,
    count: 0,
    error: null
  };

  async setWaitState(updater) {
    return await new Promise(resolve =>
      this.setState(updater, state => resolve(this.state))
    );
  }

  clearError = payload => {
    this.setState(state => ({ error: null }));
    return payload;
  };

  fetchSetter = status => payload => {
    this.setState(state => ({ fetching: status }));
    return payload;
  };

  selectCount = payload => ({ payload, count: this.state.count });

  countSetter = count => this.setWaitState(state => ({ count }));

  addCount = ({ count, payload }) => count + payload;

  asyncLogic = async payload => {
    // do sum stuff
    await sleep(100);
    return payload;
  };

  tinyCount = coach.goal("the count must be tiny", [
    newCount => {
      console.log({ newCount, countMaxSize: this.countMaxSize });
      if (newCount >= this.countMaxSize) {
        throw new Error(`counter must be less than ${this.countMaxSize}`);
      }
      return newCount;
    }
  ]);

  changeCount = coach.goal("change count", [
    this.clearError,
    this.fetchSetter(true),
    this.selectCount,
    this.addCount,
    this.tinyCount,
    this.asyncLogic,
    this.fetchSetter(false),
    this.countSetter
  ]);

  handleChange = dif => async () => {
    try {
      await this.changeCount(dif);
    } catch (e) {
      if (e === rejectedByRaceCondition) return;
      this.setState(() => ({ fetching: false, error: e.message }));
    }
  };

  render() {
    return (
      <div>
        <h2>
          Try to click on the buttons more than 1 times at second and look in
          the console
        </h2>
        <button onClick={this.handleChange(1)}>increment</button>
        <span style={{ margin: "1rem" }}>{this.state.count}</span>
        <button onClick={this.handleChange(-1)}>decrement</button>
        <br />
        <br />
        {this.state.fetching && "fetching..."}
        {this.state.error && <span>Error: {this.state.error}</span>}
      </div>
    );
  }
}
