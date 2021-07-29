/* globals process */
import fetch from 'node-fetch'
import stagnant from './index.mjs'


export default function Main({ 
    name: rootName='root'
    , dataset='default'
    , writeKey=process.env.HONEYCOMB_WRITE_KEY
    // pass in traceId/parentId from an existing trace
    // e.g. to continue a trace from another server, or 
    // even the browser
    // otherwise leave blank
    , traceId= Math.random().toString(15).slice(2,8)
    , parentId= undefined
    , data={} 
    , config={}
}={}){


    config = { ...stagnant.defaultConfig(), ...config }
    delete config.onevent
    // Traces aren't nested, but a trace can contain nested spans.
    // We create a root trace for every invocation of Honey
    // every other event subsequently is a span within that root trace
    const root = stagnant({
        async onevent(event){
            const name = event.parentId ? event.name : rootName
            const body = JSON.stringify({
                ...event.data
                , ...data
                , name
                , error: event.error ? event.error.message : undefined
                ,'error.stack': event.error ? event.error.stack : undefined
                , 'trace.trace_id': 'trace-'+ traceId
                , 'trace.span_id': 'span-' + event.id
                , 'trace.parent_id': event.parentId ? 'span-' + event.parentId : parentId
                , service_name: 'stagnant'
                , duration_ms: event.endTime - event.startTime
            })

            try {

                // console.log(name, event.error, event.endTime - event.startTime)
                const response = await fetch(`https://api.honeycomb.io/1/events/${dataset}`, {
                    method: 'post'
                    ,headers: {
                        'X-Honeycomb-Team': writeKey
                        ,'X-Honeycomb-Event-Time': event.startTime
                        ,'Content-Type': 'application/json'
                    }
                    ,body
                })
                config.console.log(name, response.status, body);
                if( !event.parentId ) {
                    config.console.log('flushed', response.status )
                }
            } catch (e) {
                config.console.error(e)
            }

        }
        , ...config
    })

    return root
}