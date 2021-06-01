# stagnant

Measure your slow code, make it _fast_.

> ⚠ This package is not stable at all, do not rely on it.

## Why?

- inferred traces from async stacks are buggy
- `console.time` has global label state and can have name collisions
- instrumenting code should follow the interpreter pattern so you can decide where the data goes later
- encourage writing fast code

## Quick Start

- npm install `stagnant`

```js
const trace = require('stagnant')

const traceOptions = {
    onevent({ id, name, data, parentId, startTime, endTime }){
        console.log('profit')
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

const P = require('stagnant')

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
    await trace.child('somethingElse', p => 
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

const trace = P(options)

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

### Trace

`Trace` is often aliased as `p` (for profile).  Usually you invoke trace with a callback.  stagnant
will time how long it takes for a promise returned from that callback to settle.

```js
const p = stagnant(options)

let output = await p( () => myAsyncFunction() )
```

You can also measure a synchronous function

```js
let output = p.sync( () => mySynchronousFunction() )
```
You can attach data to the current event and any child events via `trace( data )`.

```js
// all child events will have the url and method property attached to event.data
p({ url, method })
```

You can also pass in data when setting up a callback to be traced:

```js
p({ url, method }, () => callEndpoint() )
```

By default `stagnant` will name the event using the `Function::toString()` method of your callback.  But you can explicitly name an event as well via two approaches.

1. Passing a string as the first argument
2. Including a `name` attribute on the event data object

```js
// string as first arg
p('call the endpoint', { url, method }, () => callEndpoint())

// name attribute on the data object
p({ name: 'call the endpoint', url, method }, () => callEndpoint())
```

You can create detailed call graphs by taking advantage of the child span constructor passed in to all callbacks:

```js

p( 'outer', p => 
    p('inner', p => 
        p('core', () => ... )
    )
)
```

Each event will have a `parentId` set to the `id` of the previous event.  This is great for explicitly modelling async call stacks.

When you are done measuring your code call `trace.flush` to signal to stagnant that the trace is over.


```js
await p.flush()
```

It's best to not use `p` after calling flush as the total duration of rootEvent will be less than the summed duration of any child events... which would be weird.


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

## FAQ

### Why use callbacks for everything

It helps capture absolutely everything safely.  Everything that is measured can be wrapped in a try catch, and the execution itself can be deferred, or even skipped if required when you are debugging things.

It is a sensible default.

### But won't using anonymous functions introduce signifcantly delays?

All signs point to no.

### How do I continue a trace across multiple servers or contexts?

In your `onevent` callback, pass in your own `parentId` or `traceId` from a previous request.  When stagnant creates what it thinks is the root trace, it will leave the `parentId` property null.  You can use that fact to conditionally add a differnt `parentId` from a previous request.

See the [honeycomb implementation](./honeycomb.js) for ideas.

## Honeycomb integration

Stagnant can be used offline and with any 3rd party instrumentation toolkit you prefer to use.  I originally wrote this tool as I was continually having issues with the official node.js honeycomb beeline library.  I was often getting issues with missing traces, and missing parent spans and I couldn't figure it out.  After spending a lot of time on it, I figured it was easier to just write an adpater that is 100% explicit and doesn't rely on Node's [async_hooks](https://nodejs.org/api/async_hooks.html) module.

So here we are.  I share with you the same integration just in case it is useful for to you.  But stagnant can be used as a standalone library just as easily.

There is a simple [honeycomb](honeycomb.io) integration in `stagnant/honeycomb.js`.  Check out the [usage script](./honeycomb-usage.js) to set it up in your own project.
