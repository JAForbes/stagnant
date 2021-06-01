/* globals console, process */
import stagnant from './index.js'
import fetch from 'node-fetch'

export default function Honey({ 
    name='root'
    , dataset='default'
    , writeKey=process.env.HONEYCOMB_WRITE_KEY
    // pass in traceId/parentId from an existing trace
    // e.g. to continue a trace from another server, or 
    // even the browser
    // otherwise leave blank
    , traceId= Math.random().toString(15).slice(2,8)
    , parentId= undefined
    , data={} 
}={}){

    // Traces aren't nested, but a trace can contain nested spans.
    // We create a root trace for every invocation of Honey
    // every other event subsequently is a span within that root trace
    const root = stagnant({
        async onevent(event){
            const body = JSON.stringify({
                name: event.parentId ? event.name : name
                , ...data
                , ...event.data
                , error: event.error ? event.error.message : undefined
                ,'error.stack': event.error ? event.error.stack : undefined
                , 'trace.trace_id': 'trace-'+ traceId
                , 'trace.span_id': 'span-' + event.id
                , 'trace.parent_id': event.parentId ? 'span-' + event.parentId : parentId
                , service_name: 'stagnant'
                , duration_ms: event.endTime - event.startTime
            })

            const response = await fetch(`https://api.honeycomb.io/1/events/${dataset}`, {
                method: 'post'
                ,headers: {
                    'X-Honeycomb-Team': writeKey
                    ,'X-Honeycomb-Event-Time': event.startTime
                    ,'Content-Type': 'application/json'
                }
                ,body
            })

            console.log(response.status, event.name)
        }
    })

    return root
}
