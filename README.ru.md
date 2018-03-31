Под вдохновением от [function-tree](https://www.npmjs.com/package/function-tree), родилось это с двумя отличиями:

1.  Каждая ф-я оборачивается в `middleware`, которые предоставляют "экстра" функциональность.
2.  Не нужно мутировать контекст, что вернет ф-я, то и будет передано как первый аргумент в следующую ф-ю.

Таким образом исполняемые функции меньше зависят от контекста и могут быть полностью чистыми.

### Пример

#### Basic

```javascript
const authUser = goal(
  "authenticate user",
  {
    formValid, // the argument of first function is first argument from `authUser` call
    setStatusLoading, // the argument of other functions is returned result of previous functions
    fetchAuthUser, // the `goal` will wait every asynchronous function call (Promise)
    setPermissions,
    setStatusLoaded,
  },
  onError, // catch the error of any function
);
```

#### Advanced

```javascript
// workflow/auth.js

import { Coach, indent } from "coach-stm";
import middleware, { withMeta } from "coach-stm/middleware";

import { STATUS } from "reference";
import { isEmail, isPassword } from "service/validator";
import { Store } from "service/store";
import * as api from "service/api";

const store = new Store({
  permissions: [],
  status: STATUS.INITIAL,
  errorMsg: null
});

const coach = new Coach({
  middleware: {
    store: withMeta({ store }),
    api: withMeta({ api }),
    ...middleware
  }
});

const formValid = coach.goal({ isEmail, isPassword });

const setStatusLoading = indent((payload, { store }) =>
  store.merge({ status: STATUS.LOADING })
);

const fetchAuthUser = async (payload, { api }) => await api.authUser(payload);

const setPermissions = indent((payload, { store }) => store.merge(payload));

const setStatusLoaded = indent((payload, { store }) =>
  store.merge({ status: STATUS.LOADED })
);

const onError = error => {
  store.merge({ status: STATUS.ERROR, errorMsg: error.message });
  throw error;
};

export const authUser = coach.goal(
  "authenticate user",
  {
    formValid,
    setStatusLoading,
    fetchAuthUser,
    setPermissions,
    setStatusLoaded
  },
  onError
);
```

```javascript
// workflow/auth.test.js
import { withMeta } from "coach-stm/middleware";
import { authUser } from "./auth";

describe("auth", () => {
  const testData = { data: { permissions: ["test"] } };

  const fetchGetMeMocked = () => new Promise(r => setTimeout(r, 5, testData));

  const getMeMocked = getMe.replaceMiddleware({
    ...getMe.middleware,
    api: withMeta({ api: { getMe: fetchGetMeMocked } })
  });

  it("user authentication", async () =>
    expect(await getMeMocked()).toEqual(testData.data));
});
```

### Детали

> Каждый таск принимает вторым аргументом `meta`, которую могут менять только `middleware` - это и есть мощный, но безопасный функционал DI

___

> `middleware` не массивом, а объектом для того что бы их легко можно было заменить по ключу:

```javascript
someGoal.replaceMiddleware({
  ...someGoal.middleware,
  middlewareName: withMeta(anything)
});
```
