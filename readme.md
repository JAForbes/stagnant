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
const P = require('stagnant')

async function main(){
    const root = P()

    const package = 
        await root( () => fs.promises.readFile('package.json', 'utf8') )

    const files = 
        await root( 'ls', () => fs.promises.readdir('.') )

    for( let file of files ) {
        const filedata = root.traceSync( () =>
            fs.readFileSync(file)
        )
    }
    
    root.events[0]
    //=> { parentId: 1, id: 2, name: 'fs.promises.readFile(...)', data: null }
}
```

## Demonstration


```js

const P = require('stagnant')

async function main(trace){

    await trace(() => sql`
        select expensive_query()
    `)
    
    // trace is always async to avoid Zalgo
    const file = await trace( () => fs.promises.readFile('package.json', 'utf8') )

    // for sync code, use trace.sync
    trace.sync( () => 2 + 2 )

    // you can manually start and end a trace
    // when absolutely required, but make sure you handle errors!
    let x = trace.start('sequence loop')
    for( let x of sequence() ) {
        someSyncCode(x)
    }
    x.end()

    // create child traces, great for modelling the callstack
    const child = trace.child('somethingElse')

    await trace( ({ p }) => somethingElse(p) )

    // you can inspect the trace data at any time
    child.events[0]
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

const options = {
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
    trace.events

    // we've also been logging our events as they happened
    // we could be sending them to a tracing API if we prefer
})
```

## API

### stagnant

`stagnant({ options: stagnant.Options }) -> Trace`

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

## Event

```typescript
{
    // id of the parent trace
    parentId: string

    // reference to the parent trace
    , parent: Trace

    // id of the current event 
    , id: string

    // event metadata, just a state bag with no schema
    , data: any

    // time is represented as a millisecond unix timestagnant
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

For just measuring "something happened" there is `trace.marker(label)`

## Honeycomb integration

```js
const stagnant = require('stagnant')

const Honeycomberino = ({ write_key, dataset, service_name, url }) => {
    function startTrace(options){
        const root = stagnant({
            async onevent({ parentId, id, name, startTime, endTime }){

                const honeycombEvent = {
                    name
                    // stagnant just thinks in terms of events
                    // where events can have children events
                    // honeycomb has a notion of spans and traces
                    // a trace contains spans
                    , 'trace.span_id': 'span-' + id
                    , 'trace.trace_id': 'trace-'+ id
                    , 'trace.parent_id': 'span-' + parentId
                    , service_name
                    , duration_ms: endTime - startTime
                    , timestagnant: startTime
                }

                await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content Type': 'application/json',
                        'Authorization': 'Bearer ' + write_key
                    },
                    body: JSON.stringify(honeycombEvent)
                })
            }
            ,...options
        })

        return root
    } 

    return startTrace
}


H = Honeycomberino({ apiKey: '...' })
```