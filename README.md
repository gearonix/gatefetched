Gatefetched
=====================

[![npm](https://img.shields.io/npm/v/gatefetched)](https://www.npmjs.com/package/gatefetched)
<a href="https://github.com/gearonix/gatefetched" rel="nofollow">
<img src="https://img.shields.io/github/license/gearonix/gatefetched" alt="License">
</a>
<a href="https://github.com/gearonix/gatefetched" rel="nofollow">
<img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
</a>

An add-on for [farfetched](https://github.com/igorkamyshev/farfetched), providing integration of Socket.IO, WebSocket, and Server-Sent Events (SSE) protocols for seamless real-time data transmission.

> [!WARNING]
> This library is at an early stage of development.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Quick Features](#quick-features)
- [Installation](#installation)
- [Usage](#usage)
  - [Getting Started](#getting-started)
  - [Public API](#public-api)
  - [Adapter API](#adapter-api)
  - [Scoped Gateways](#scoped-gateways)
- [Examples](#examples)
- [Public API](#public-api-1)
  - [`createGateway`](#creategateway)
    - [BaseCreateGatewayParams Interface](#basecreategatewayparams-interface)
    - [ProtocolGateway Interface](#protocolgateway-interface)
  - [`listener`](#listener)
    - [BaseListenerConfig Interface](#baselistenerconfig-interface)
    - [Listener Interface](#listener-interface)
  - [`dispatcher`](#dispatcher)
    - [BaseDispatcherConfig Interface](#basedispatcherconfig-interface)
    - [Dispatcher Interface](#dispatcher-interface)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


Quick Features
-----

- Framework-agnostic
- Comprehensive TypeScript support
- Supports three protocols out of the box

## Installation

Depending on your package manager:

```bash
# using `pnpm`
$ pnpm add gatefetched

# using `yarn`
$ yarn add gatefetched

# using `npm`
$ npm install --save gatefetched
```


Usage
-----

### Getting Started

Create an instance of the desired protocol:

```typescript
import { io } from 'socket.io-client'

// using socket.io-client
const instance = io('http://localhost:6868')

// using native WebSocket API
const instance = new Websocket('http://localhost:6868')

// using EventSource (SSE)
const instance = new EventSource('http://localhost:6868')
```

Utilize the `createGateway` method, which creates a wrapper over each protocol, providing a uniform API.

```typescript
import { createGateway } from 'gatefetched'

const gateway = createGateway(instance)
```

`createGateway` automatically recognizes protocols and returns an object with `listener` and `dispatcher` methods, among other metadata.

```typescript
// underlying implementation socket.on
const channel = gateway.listener('my-channel')

// callback with socket.emit
const sendMessage = gateway.dispatcher('send-message')

console.info(gateway.adapter.kind) // socket.io

// triggered upon arrival of a response for the 'my-channel' event
channel.finished.done.watch(console.log)
// latest response data
channel.$data.watch(console.log)

sendMessage.$sent.watch(console.log)
sendMessage.$latestParams.watch(console.log)

// dispatch is an effector event;
// call it manually wherever needed
sendMessage.dispatch()
```

- `listener` creates a listening channel (similar to *socket.on*, *ws.onmessage*), adding farfetched functionality.
- `dispatcher` creates an API for sending messages to another party (*socket.emit*, *ws.send*). Not available in SSE.

### Public API

```typescript
createGateway({
  from: socket,
   // Allows intercepting incoming and outgoing operations
  intercept: console.info,
  // Specify a set of methods 
  events: ['my-channel', 'send-message'] as const,
  response: {
    // All data in incoming transactions will be mapped
    mapData: ({ payload }) => payload
  }
})
```

Most of the public API mirrors [farfetched](https://farfetched.pages.dev/tutorial/) – contracts, validators, mapping, etc.

Refer to the farfetched documentation for a better understanding.

```typescript
import { zodContract } from '@farfetched/zod'
import { declareParams } from '@farfetched/core'

const messageSent = gateway.listener({
  name: 'my-channel',
  response: {
    // Utilize contracts for validation and typing
    contract: zodContract(messageSentContract),
    validate: ({result}) => result.message.length > 0
  },
  initialData: {
    id: null,
    message: null
  },
  enabled: true,
  // Listening doesn't start automatically; 
  // manually call messageSend.listen event
  immediate: false,
})

const sendMessage = gateway.dispatcher({
  name: 'send-message',
  params: declareParams<string>(),
  // Modify instance behavior
  adapter: {
    withAck: true
  },
  request: {
    mapParams: (message) => ({message})
  }
})
```

### Adapter API

You can also listen for the *connect* and *disconnect* methods using the adapter API.

```typescript
console.info(gateway.adapter.kind) // socket.io
  
// Called upon connecting to the other party
gateway.adapter.bindConnect((msg) => console.log(msg))

// Called upon disconnection
gateway.adapter.bindDisconnect(console.info)
```

### Scoped Gateways

The library provides an `attachGate` method, accepting the old gateway and any effector gate, returning a new gateway.
This gateway launches listeners and dispatchers only when the gate is open.

```tsx
import { createGate } from 'effector-react'
import { attachGate } from 'gatefetched'

// Use any effector binding
const MyGate = createGate()

// Handlers and dispatchers are enabled only when the gate is open
const scopedGateway = attachGate(gateway, MyGate)

const dispatcher = scopedGateway.dispatcher({/* { ... } */})
  
// Calls queue up and execute only upon gate opening, 
// which occurs when the component is mounted.
dispatcher.dispatch()
dispatcher.dispatch()

const Parent = () => {
  useGate(MyGate)
  
  return null
}
```

Public API
-----

### `createGateway`

#### BaseCreateGatewayParams Interface

- `from`: The protocol instance.
  - Examples:
    - `io('localhost')`
    - `new WebSocket('localhost')`
    - `new EventSource('localhost')`
- `intercept` (optional): A callback invoked after any incoming or outgoing operation.
  - Type: `(InterceptResponse) => void`
- `response` (optional):
  - `mapData` (optional): Serializes data globally. Each incoming message is transformed by this callback.

#### ProtocolGateway Interface

- `instance`: The protocol instance.
  - Examples:
    - `io('localhost')`
- `adapter`: The adapter selected depending on the instance type. Provides deeper control over the provided instance.
  - Examples:
    - `IoAdapter`
    - `SseAdapter`
- `listener`: Method to create a listener API that listens to messages incoming from the other side.

### `listener`

#### BaseListenerConfig Interface

- `name` (optional): Name of the event to listen. Default is `ANY_WEBSOCKET_EVENT`.
- `initialData` (optional): Initial data. Default is `null`.
- `immediate` (optional): If true, starts listening to the channel automatically. If false, manual call through the 'listen' event is required. Default is `true`.
- `enabled` (optional): Indicates if the listener is enabled. If false, it stops accepting requests. Default is `true`.
- `response` (optional):
  - `contract` (optional): Contracts from farfetched. Default is `unknownContract`.
  - `validate` (optional): Validate function from farfetched. Default is `validValidator`.
  - `mapData` (optional): Serializes incoming data. Default is `identity`.
- `adapter` (optional): Adapter options for manual configuration of protocol instance behavior.

#### Listener Interface

- `$enabled`: Indicates if the listener is enabled. If false, it stops accepting requests.
- `$status`: Listener status. Possible values: 'initial', 'opened'. Default is 'initial'.
- `$opened`: Store indicating if the listener is opened.
- `$idle`: Store indicating if the listener is idle.
- `$closed`: Store indicating if the listener is closed.
- `$data`: Last data received from the other side. Default is `null`.
- `listen`: Starts listening to the channel. Automatically triggered when 'immediate' is true.
- `close`: Stops listening to the channel, changes $status to 'closed'.
- `done`: Callback triggered upon receiving a message from the other side.
- `finished`:
  - `done`: Event triggered when the operation is successful.
  - `skip`: Event triggered if `$enabled` is false during the call.
- `failed`: Event triggered in case of any failure.
- `@@unitShape`: Unit shape method providing a snapshot of the listener state.

### `dispatcher`


#### BaseDispatcherConfig Interface

- `name`: Name of the event to send data.
- `params` (optional): Declaration of parameters for sending data.
- `enabled` (optional): Indicates if the listener is enabled. If false, it stops accepting requests. Default is `true`.
- `request` (optional):
  - `mapParams` (optional): Serializes outgoing params. Default is `identity`.
- `adapter` (optional): Adapter options for manual configuration of protocol instance behavior.

#### Dispatcher Interface

- `$enabled`: Indicates if the dispatcher is enabled. If false, it stops accepting requests.
- `$status`: Dispatcher status.
- `$sent`: Store indicating if data has been sent.
- `$idle`: Store indicating if the dispatcher is idle.
- `dispatch`: Sends data to the other side.
- `done`: Callback triggered immediately after sending data.
- `finished`:
  - `done`: Event triggered when the dispatch is successful.
  - `skip`: Event triggered if `$enabled` is false during the call.
- `$latestParams`: Parameters at the time of the last call.
- `@@unitShape`: Unit shape method providing a snapshot of the dispatcher state.


Examples
-----
To better grasp its functionality, refer to the [examples](https://github.com/gearonix/gatefetched/tree/master/sample/).



*@grnx*
