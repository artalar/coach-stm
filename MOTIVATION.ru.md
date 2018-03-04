# [Coach - менеджер состояний](https://www.npmjs.com/package/coach-stm)

**_Coach_** (тренер) - поможет достич **_goals_** (целей), упрощая работу со связанными **tasks** (задачами)

### Что мы имеем

За последний год я повидал с десяток молодых проектов и проектов с наследием. Конечно в большинстве из них было множество плохих архитектурных решений (и от меня тоже), которые ухудшали DX и увеличивали время на отладку - поиск и исправление ошибок. Суммарно, может быть, утрируя, но получается нервный разработчик и удоражание продукта - что не есть хорошо. Моей последней каплей стал код, в котором использовалось сразу несколько классических паттернов для React в перемешку, плюс какие-то свои велосипеды. В итоге отладка каких-то полей в редакс сторе могла растянуться на часы, требуя за собой серьёзный рефакторинг или непонятные, с первого взгляда, костыли.

Мне захотелось понятного управления не просто состоянием приложения, но и всех обработчиков данных, которые могут на это состояние влиять. В итоге получился инструмент с невероятно простым и минималистичным апи, с нативной поддержкой асинхронности и исправления эффекта гонки, абсолютным и явным контролем над КАЖДЫМ связанным обработчиком данных, включая тотальное логирование и отлов ошибок, полностью типизируемый (привет `redux-act`) и отсутствием зависимостей, кроме самого React. Написал я его за одну ночь. Это возможно?

### Давайте сначала поговорим о Redux

Мне нравится Redux, я в восторге от его простого, но базово-мощного апи. Я даже [написал неплохой хелпер](https://www.npmjs.com/package/redux-act-dispatch-free), для другого хелпера, у которого все плохо стипизацией и не очень с ssr... Стоп, что? 
* Почему мне надо писать какие-то хелперы?
* Почему их так много и нельзя выбрать определенно лучший?
* Почему все спорят где делать сайд эффекты?
* Почему я не могу сделать `await` на action creator?
* Почему новички въезжают в Redux неделями?
* Почему на смену флага `fetching` у какого-нибудь статус-бара, срабатывают селекторы во всех примонтированных компонентах?
* Почему...

А, Redux DevTools - классные, это да. Правда умирают, когда бекенд не успел сделать пагинацию, ну да ладно...

В общем. Redux мне правда нравится, но я нутром чувствую - что нам нужно что-то лучшее.

### [React.Context](https://habrahabr.ru/company/ruvds/blog/348862/)

Он прекрасен. Мне не нравятся render property для children, но ничего, HOF наше все. Главное что это простой механизм глобального и при этом изолированного стора, который еще и умеет в автоматические селекторы (см. пункт 6 по Redux). Это нативное апи, которое, начиная с [React 16.3](https://habrahabr.ru/company/ruvds/blog/348862/), будет доступно всем, без каких-либо [враждебных предупреждений](https://reactjs.org/docs/context.html#why-not-to-use-context). И хотелось бы на этом остановиться, но, к сожалению, React.Context на столько простой, что не умеет ничего больше, как подписывать компоненты на обновления своего состояния. Т.е. никаких логеров, DevTools, миддлвар. Конечно все это можно написать самому... Ну я и написал.

> Небольшое отступление. Если вдруг, вы еще не слышали об этом или не уверены что понимаете до конца, почитайте про конечные автоматы (FSM - finite-state machine) function-tree - это здорово.

### **_Coach_**

Нативные оповещения (events), а после и экшены Redux приучили нас, что на одно событие есть один обратный вызов (callback) для него. Т.е. все, как бы, строго: одно событие и одно последствие. Но ведь на практике это совершенно не так. Даже если оповещение предполагает получить конкретный результат изменения одного значения, оно может, по пути, потребовать выполнения массы разнообразных действий: нормализация входных параметров, валидация параметров, нормализация выходных параметров, остаточный эффект инфраструктуры (в контексте Redux - это тригер всех connect). А если событие предполагает вариативную обработку асинхронно получаемых данных? Количество связанных обработчиков растер пропорционально и ошибка в любом из них, может вызвать (и скорее всего вызовет) крах всей цепочки. Что нам предлагает Redux для отлова таких ошибок? Возможно, залогированное событие ошибки в акшене. А дальше по стак трейсу...

Хочется просто взять и залогировать все на свете, каждую функцию, иметь полный контроль над каждым кусочком НАМИ написанного кода. Без необходимости бегать по всем файлам проекта и вдумываться в вариативность каждой ф-и и метода, ставить бесконечные brakepoint. И это возможно.

Но вернемся к событиям. В действительности каждая внешняя реакция для приложения, будь то нажатие кнопки пользователем или пришедший запрос от сетевого АПИ - это намерение, запрос на достижения какой-то цели. Это не единоразовый сигнал, а инициализатор цепочки задач - обработчиков, имплементированной в нашем коде, которые должны привести к получению какого-то результата.

Для этого я создал **_Coach_** - тренера, он поможет достич **_goals_** (целей / намерений), упрощая работу со связанными **tasks** (задачами). Я предлагаю простую концепцию: есть класс **_Тренер_**, которого можно попросить помочь выполнить какую-то **_Цель_**, путем последовательной реализации необходимых **_Задач_**. И вот как это выглядит:

```javascript
class Items extends Coach {
  state = { list: [] };

  fetchItems = this.goal(
    // первый параметр - просто комментарий, может быть абсолютно любым (и не уникальным)
    "fetch important items",
    // второй параметр - это последовательный набор необходимых задач - функций
    [ paramsSelector,
      paramsValidator,
      paramsConvertor,
      api.getItems,
      paramsSetter    ],
    // третий, опциональный, параметр ответственен за обработку ошибок
    error => this.state(() => ({ error: error.message }))
  )
}
```

Что здесь происходит. `fetchItems` - это цель, которая явно описана комментарием и имеет четкую последовательную структуру выполнения необходимых преобразований данных. Цель считается выполненной, когда все ее Задачи завершены успешно. Ф-и могут быть как синхронными, так и асинхронными, Тренер их будет вызвать и ожидать завершения. Первая ф-я `paramsSelector` принимает аргумент вызова `fetchItems`, а то что она возвращает попадает в первый аргумент следующей ф-и и так по цепочке до конца. При этом в каждой ф-и есть полноценный доступ к `this.state`. Так же важно, что `fetchItems` - это асинхронная ф-я и ее вызов возвращает промис, что в итоге позволяет быть любым Целям - Задачами для других целей. Т.е. в теории возможно создать сложную глубокую древовидную структуру Целей и их Задач, хотя я настоятельно рекоммендую максимально упрощать каждую Задачу - функцию и делать их цепь максимально плоской.

Тот кто уже работал с `async\await` может подумать, что нам не нужен массив и Задач и достаточно их вызвать просто поочередно в одной функции. Но здесь как раз и кроется фундаментальное превосходство **_Coach_** над другими менеджерами состояний (уже и далее кто-то мог бы вспомнить про Церебрал, но он слишком сложный, как массовый продукт). Т.к. все задачи храняться в виде массива, нам ничто не мешает сделать `map` по нему и обернуть ф-ии в декораторы - ф-и высшего порядка. Это похоже на _middlewares_ из Redux, но намного гибче и мощнее, т.к. декоратор имеет доступ к каждому Таску, а не только к ~~экшену~~ Цели. По умолчанию `this.middleware` указывает на массив с одним декоратором, который логирует каждую Таску с указанием времении ее выполнения и `this.state` на тот момент! Функции высшего порядка предоставляют максимальный контроль над ходом выполнений Задач и могут предоставлять максимальную отладочную информацию. Тем не менее, я бы не рекомендовал использовать _middlewares_ для иньекции какой-либо логики или преобразования данных \ сайд эффектов, а использовать цепочку Задач или обработчик ошибок. Кстати и тут мы получаем мошный инструмент - третий параметр - обработчик ошибок получает два аргумента: `error` - ошибку и `taskIndex` - индекс задачи в цепочке, на которой произошла ошибка. Благодарая индексу можно без труда локализовать ошибку и предпринять необходимые действия. Как? Обработчик ошибки может вернуть число - индекс следующей Задачи, которая будет выполнена. Т.е. это своеобразные GOTO, который позволяет, при возникновении ошибки, попробовать выполнить Задачу еще раз или перепрыгнуть несколько шагов, зависимых от этой части цепи.

Вишенкой на торте является встроенный механизм определения эффекта гонки - когда вызывается повторное выполнение Цели, при том что предыдущее выполнение еще не закончилось. В этом случае будет выброшена ошибка с флагом `rejectedByRaceCondition`, на который можно поставить фильтр для игнорирования этой ошибки.
> К сожалению, автоматическое игнорирвоание `rejectedByRaceCondition` не следует делать, т.к. в этом случае могут появится утечки памяти на ожидающих завершения Цели скоупах.

## Важно
Текущая демка была написана на скорую руку и грубо показывает большую часть API библиотеки, работа над которой еще не закончена (см. главу ниже). Кому-то может не понравится, что библиотека реализована через наследование от `React.Component` и использует стейт для хранения данных и `setState` для изменения. Здесь важно заметить, что: а) Стейт Тренера будет использоваться с новым `React.Context`; б) `setState` позволяет понизить порог вхождения, что подстегнет больше разработчиков использовать данную библиотеку и, Я надеюсь, сделает нашу жизнь [чуточку комфортнее](https://goo.gl/KjHgct).

### Работа над данной библиотекой еще не закончена
В [readme](https://github.com/artalar/coach-stm#todo) можно ознакомится со списком ожидающих задач. Размер всей кодовой базы библиотеки на современном синтаксисе - всего полторы сотни строчек кода. Если вы хотит поучавствовать в развитии библиотеки - [присылайте пул реквесты](https://github.com/artalar/coach-stm/issues), c радостью их рассмотрю.

### Демо

[![Demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/ykk9xoq87v)