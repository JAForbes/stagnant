/* globals console, setTimeout, process */
import stagnant from './index.js'
import fetch from 'node-fetch'

export default function Honey({ name='root', dataset='default', writeKey=process.env.HONEYCOMB_WRITE_KEY, data={} }={}){

    // Traces aren't nested, but a trace can contain nested spans.
    // We create a root trace for every invocation of Honey
    // every other event subsequently is a span within that root trace
    const traceId = Math.random().toString(15).slice(2,8)
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
                , 'trace.parent_id': event.parentId ? 'span-' + event.parentId : undefined
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
