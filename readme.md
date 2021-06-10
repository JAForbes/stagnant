# stagnant

Measure your slow code, make it _fast_.

## What

- A JS instrumentation library for measuring execution time across the stack
- No inference, 100% explicit instrumentation
- Easy to use - integrate any 3rd party metrics service
- Example honeycomb.io integration OOTB
- Browser = 0 Dependencies
- Server = 1 Polyfill (node-fetch)
- Runs in the [Browser](https://flems.io/#0=N4IgZglgNgpgziAXAbVAOwIYFsZJAOgAsAXLKEAGhAGMB7NYmBvEAXwvW10QICsEqdBk2J4A9ACoABAHMotAEYYocKULi1YFKXBjEAKhBy0ArsW0AHAE61q8VRLEAdNGBNpqxCPSkATGFAYAJ4AFFhwAJTALlKxUlZ6JlZoUmgwAO5SAAo2WBC6IVIAmlIAvAB8OnqGxmYhRdrhEREurC4ubh5ePlYYaL60WAAiAcFhEGilAAyNGAAepQDMU1NRMXEJxEkp-oGheSkA1FIAshjEhPi9-YMhEVLSWPNSALRSBy1obWguGHBBHiknU83hSFgwVl0AFEAG4iO7RFJxDDpDAQYjxPoDYajUKfb5-AHUIHuEE+OFWCBgIJZCHYOAI9axMC0KyFWAYiBlKRTADcUi5AB4pABGGAAVn5XMOh3uiLiCtO50u12xdyZUm+BP+gOB3RS1GUUAAajBKZAYL4QjA4Qw1kjYuoMcApBZNdybSINRYQi6AOQaHAAYSNpvNEEtQ3OGD9iCki01nw1noY3Is+B11EKdzKlQpVJpdPC1ttxHunwVTqkpgxpSkKLRGJ9Un9hqgUCjxBjcYALJrtDmKmojSWROWNZtttWzK12phMySuqDh+3R3b5cjUejMTccXt1V854TdaT9Tou-0Ib4AErwExQYiMh31rcY1WDEb7-G-Bd65eQB8zVvOB72IBl7QVBtt3fPcxm-H55yJRcyRSABVOAMBkGAn0reg4Cbbl8MwzAGF9DUFXoFNHxdTAcG0JhfBqGBtCIqwDCMGBEw3RU4gGagTBwBh8AUWhfCCfAJjSKwAAl9BOAAZKRDjrEJyJ4qQAANBQscoABJgFoziAB8jKkP1iFoLsoD9VgpH0himNec8IXYnBWEFMQdI0tSFQrdTvgVVgk2fDkpCo7lgACuJwrrKCm0KP1wUhGBYREP1tH9JLoVLTsMHwGA5mwCxYFjKQACZ+ykQdKiylLSzXMspD82JQoSECH25OLXUKN0hzbE0zSpCMrRdfAxqoyxEyaic7w62LX26qr7iHIjLysG9ZsfCb4k28dnza0DOoW5tqqBaBGCsYDQIZbaDofPbvXwMAoBMOBCAPBVJ2SHb2uIWcEPQzDsM+fBDWIah3rC3MWw1dRNBgfKrBsNkYGa10bDsOA4HyuZ0RCEV8WCygQF0WAUIQHgexFRAADYRTYDgQEMvBQax4mhEYZgeDYABdKgoAmABrCnUCZrg8CImQSNEKgknIHgSGICw4EQMQxHcCxBZkUHBjESXpYAASmfBjcWMRfHyYg9a7KW+mIfABN8fB+GJ4gggsbgSeoSkLFEVgedYIA) and the [Server](https://runkit.com/jaforbes/stagnant-server-side-usage)

## Builds

You can view all the latest builds on unpkg [here](https://unpkg.com/browse/stagnant@latest/dist/).

### Browser

Stagnant is built to trace performance across the entire stack.  You can begin a trace client side, continue tracing within the server and then pick up the trace client side again.

This makes it possible to get far deeper insights into your Time to Interactive (TTI) and Time to Load (TTL).

The browser version of stagnant has no dependencies, it simply uses the native fetch module to call out to honeycomb for each event.  The node version uses the same code but relies on the `node-fetch` polyfill.


- [Minified UMD Stagnant Honeycomb Module](https://unpkg.com/stagnant@latest/dist/stagnant-honeycomb.browser.min.js)
- [UMD Stagnant Honeycomb Module](https://unpkg.com/stagnant@latest/dist/stagnant-honeycomb.browser.js)
- [Minified UMD Stagnant Module](https://unpkg.com/stagnant@latest/dist/stagnant.browser.min.js)
- [UMD Stagnant Module](https://unpkg.com/stagnant@latest/dist/stagnant.browser.js)

### Node.js

Depending on your project structure node.js will either import the native ESM module or the CJS build automatically.

- Native ESM Stagnant Module: `import stagnant from 'stagnant'`
- CJS Stagnant Bundle: `const stagnant = require('stagnant')`

- Native ESM Stagnant Honeycomb Module: `import stagnant from 'stagnant/honeycomb.js'`
- CJS Stagnant Honeycomb Bundle: `const stagnant = require('stagnant/honeycomb.cjs')`

> 🤓 If anyone knows how to make `require('stagnant/honeycomb')` automatically point to the `honeycomb.cjs` file, please let me know!

## Quick Start

- npm install `stagnant`

```js
import trace from 'stagnant'

const traceOptions = {
    onevent({ id, name, data, parentId, startTime, endTime }){
        console.log(name, endTime - startTime)
    },

    // Advanced Options:
    //
    // onerror(){},
    // onsuccess(){},
    // onflush(){},
    // generateId(){},
    // traceId,
    // parentId
}

async function main(){
    const span = trace(traceOptions)

    const package = 
        await span( () => fs.promises.readFile('package.json', 'utf8') )

    const files = 
        await span( 'ls', () => fs.promises.readdir('.') )

    for( let file of files ) {
        const filedata = span.sync( 'read file: ' + file,  () =>
            fs.readFileSync(file)
        )
    }
    
    await span.flush()
}
```

## Demonstration


```js

import stagnant from 'stagnant'

async function main(trace){

    await trace(() => sql`
        select expensive_query()
    `)
    
    // trace is async by default to avoid Zalgo
    const file = await trace( () => fs.promises.readFile('package.json', 'utf8') )

    // for sync code, use trace.sync
    trace.sync( () => 2 + 2 )

    // add a meaningful name when the inferred name won't do 
    trace.sync('sequence loop', () => {

        for( let x of sequence() ) {
            someSyncCode(x)
        }
    })

    // create child traces, great for modelling the callstack
    await trace('somethingElse', p => 
        somethingElse(p)
    )


    await trace.flush()
}

async function somethingElse(trace){
    // this trace is a child trace 👆
    // you can use this data to create useful graphs with e.g. honeycomb/open tracing

    await trace( () => sql`
        select another_expensive_query()
    `)

    // by default, names are inferred from the `toString()` of the callback
    // but you can specify a name explicitly as well
    let data = trace('custom-name', async () => {
        return anotherExpensiveCall()
    })

    // you can also attach metadata to the trace (and any child events)
    let data = trace({ name: 'custom-name', x:1, y:2 }, async () => {
        return anotherExpensiveCall()
    })

    // passing an object with no function, will attach that data
    // to all subsequent events
    trace(data)

    return true
}


const events = []
const options = {
    onevent(event){
        // capture all events
        events.push(event)
    },
    async onsuccess({ name, parentId, id, data, startTime, endTime }){
        console.log(startTime, name, 'duration:', endTime - startTime )
    },
    async onerror({ name, error, parentId, id, data, startTime, endTime }){
        console.error(
            startTime, name + ' (failed)', 'duration:', endTime - startTime
            ,'error:', error
        )
    }
}

const trace = stagnant(options)

main(trace).finally( () => {
    // all events ready to inspect
    events

    // we've also been logging our events as they happened
    // we could be sending them to a tracing API if we prefer
})
```

## API

### stagnant

`stagnant(options: stagnant.Options ) -> Trace`

Initialize a trace.
### stagnant.call

`stagnant.call( trace?, ...args, () -> b ) -> b`

Safely invoke a trace callback even if the trace is null.  Fairly useful for writing wrappers around 3rd party libraries that may be invoked by code without a trace variable.

```js
async function something(event){

    // instead of:
    // await event.trace( 'normal invocation style', () => db.query('select 1+1') )
    await stagnant.call(event.trace, 'safer invocation style', () => db.query('select 1+1') )
}
```


### stagnant.ensure

> Stability: 💀 Unstable

`trace = stagnant.ensure( trace? )`

Much like stagnant.call, but instead of immediately invoking the trace (if it exists), a mock trace is returned that will execute just fine but will not actually create any events or traces behind the scenes.

```js
async function something(event){
    event.trace = stagnant.ensure(event.trace)

    await event.trace( 'will work even if event.trace is null', () => db.query('select 1+1') )
}
```

### Trace

`Trace` is often aliased as `I` (for _instrument_).  Usually you invoke trace with a callback.  stagnant
will time how long it takes for a promise returned from that callback to settle.

```js
const I = stagnant(options)

let output = await I( () => myAsyncFunction() )
```

You can also measure a synchronous function

```js
let output = I.sync( () => mySynchronousFunction() )
```
You can attach data to the current event and any child events via `trace( data )`.

```js
// all child events will have the url and method property attached to event.data
I({ url, method })
```

You can also pass in data when setting up a callback to be traced:

```js
I({ url, method }, () => callEndpoint() )
```

By default `stagnant` will name the event using the `Function::toString()` method of your callback.  But you can explicitly name an event as well via two approaches.

1. Passing a string as the first argument
2. Including a `name` attribute on the event data object

```js
// string as first arg
I('call the endpoint', { url, method }, () => callEndpoint())

// name attribute on the data object
I({ name: 'call the endpoint', url, method }, () => callEndpoint())
```

You can create detailed call graphs by taking advantage of the child span constructor passed in to all callbacks:

```js

I( 'outer', I => // rebind I
    I('inner', I => // to create nested traces
        I('core', () => ... )
    )
)
```

Each event will have a `parentId` set to the `id` of the previous event.  This is great for explicitly modelling async call stacks.

When you are done measuring your code call `trace.flush` to signal to stagnant that the trace is over.


```js
await I.flush()
```

It's best to not use `I` after calling flush as the total duration of rootEvent will be less than the summed duration of any child events... which would be weird.

Keep in mind, `flush` doesn't wait for other events to finish that is your responsibility.  Generally call `flush` in a `finally` that wraps your entrypoint.

That's a high level philisophical distinction in stagnant with other libraries, there's next to no magic, just a nice pure dose of sugar.


### stagnant.Options

#### generateId

`() -> string`

Control how stagnant generates identifiers, by default `Math.random().toString(15).slice(2,8)` is used.

#### onevent

`async onevent( event: Event ) -> void`

Dispatched whenever a callback settles, whether it throws an exception or returns a value.

#### onsuccess

`async onsuccess( event: Event ) -> void`

Dispatched whenever a callback does not throw an exception.

#### onerror

`async onerror( event: ErrorEvent ) -> void`

Dispatched whenever a callback throws an exception.
#### onflush

`async onflush( event: RootEvent ) -> void`

Dispatched `.flush()` is called on the root trace.  Calling `flush` implies the end of the parent trace.  This is helpful for measuring overall run time of a trace.

## Event

```typescript
{
    // id of the parent event
    parentId: string

    // reference to the parent event
    , parent: Trace

    // id of the current event 
    , id: string

    // event metadata, just a state bag with no schema
    , data: any

    // time is represented as a millisecond unix timestamp
    , startTime: number
    , endTime: number
}
```

## ErrorEvent

```typescript
Event & { error: Error }
```

Just like an event, but with an error attached.  This will be dispatched to your callback whenever a callback throws an exception.

## Advanced

### Logging

By default stagnant calls `config.console` for all logging.  These logs functions are just empty functions.  You can enable logging by specifying `console: console` when initializing stagnant.

When initializing honeycomb configuring stagnant options requires an outer key `config` so `{ config: { console } }`

## FAQ

### How do I instrument 3rd party libraries if everything is explicit?

Short answer, you don't.  

Long answer, instead of directly calling the 3rd party library, call your own function that calls the library and time that.

You can use `stagnant.call( trace, () => ...)` or `stagnant.ensure(trace)` instead of `trace( () => ... )` to safe guard against not having a trace variable.

If the trace is undefined, `stagnant` will just invoke the callback without creating a trace.  That way you can write code that will behave just fine even if there is no trace variable passed down.  This also means you can disable tracing in your codebase without having to restructure your code beyond not passing down a trace at the entry point.

```js
const stagnant = require('stagnant')

function query(query, values, p=null){
    const results = await stagnant.call(p, () => db.query(query,values))
    return results
}

// this will not perform a trace
await query('select * from users where user_id = ? ', [1], null)

// this will perform a span within the active trace
await query('select * from users where user_id = ? ', [1], p)
```

### Why use callbacks for everything

It helps capture absolutely everything safely.  Everything that is measured can be wrapped in a try catch, and the execution itself can be deferred, or even skipped if required when you are debugging things.

It is a sensible default.

### But won't using anonymous functions introduce signifcantly delays?

All signs point to no.

### How do I continue a trace across multiple servers or contexts?

In your `onevent` callback, pass in your own `parentId` or `traceId` from a previous request.  When stagnant creates what it thinks is the root trace, it will leave the `parentId` property null.  You can use that fact to conditionally add a different `parentId` from a previous request.

See the [honeycomb implementation](./honeycomb.js) for ideas.

## Honeycomb integration

![A visualization of a call graph as measured by stagnant using the honeycomb integration.](./assets/honeycomb-usage.png)
 
*A visualization of a call graph as measured by `stagnant` using the honeycomb integration.*

Stagnant can be used offline and with any 3rd party instrumentation toolkit you prefer to use.  I originally wrote this tool as I was continually having issues with the official node.js honeycomb beeline library.  I was often getting issues with missing traces, and missing parent spans and I couldn't figure it out.  After spending a lot of time on it, I figured it was easier to just write an adpater that is 100% explicit and doesn't rely on Node's [async_hooks](https://nodejs.org/api/async_hooks.html) module.

So here we are.  I share with you the same integration just in case it is useful for to you.  But stagnant can be used as a standalone library just as easily.

There is a simple [honeycomb](https://honeycomb.io) integration in [`stagnant/honeycomb.js`](./honeycomb.js).  Check out the [usage script](./honeycomb-usage.js) to set it up in your own project.
