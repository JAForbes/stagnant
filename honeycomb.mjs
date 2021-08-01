/* globals process */
import stagnant from './index.mjs'


export default function Main({
    name: rootName='root'
    , serviceName: rootServiceName='stagnant'
    , dataset='default'
    , writeKey=process.env.HONEYCOMB_WRITE_KEY
    , parentId= undefined
    , data={}
    , config={}
}={}){

    async function onevent(event){
        const name = 
            event.parentId ? event.name : rootName

        const service_name = 
            config.serviceName || event.serviceName || rootServiceName

        const body = JSON.stringify({
            service_name
            , ...event.data
            , ...data
            , name
            , error: event.error ? event.error.message : undefined
            ,'error.stack': event.error ? event.error.stack : undefined
            , 'trace.trace_id': 'trace-'+ event.traceId
            , 'trace.span_id': 'span-' + event.id
            , 'trace.parent_id': event.parentId ? 'span-' + event.parentId : parentId
            , duration_ms: event.endTime - event.startTime
        })

        try {

            // console.log(name, event.error, event.endTime - event.startTime)
            const response = await config.fetch(`https://api.honeycomb.io/1/events/${dataset}`, {
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

    { // todo-james could have a deep merge maybe?
        let x = stagnant.defaultConfig()
        let time = Object.assign(x.time, config.time || {})
        config = { ...x, ...config, time }
    }
    
    // Traces aren't nested, but a trace can contain nested spans.
    // We create a root trace for every invocation of Honey
    // every other event subsequently is a span within that root trace
    const root = stagnant(config)

    return root
}

Main.ensure = stagnant.ensure
Main.call = stagnant.call