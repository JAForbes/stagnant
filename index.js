function defaultConfig(){

    function onevent(){}
    function onerror(){}
    function onsuccess(){}
    function onflush(){}
    function generateId(){
        return Math.random().toString(15).slice(2,8)
    }
    return { onevent, onerror, onsuccess, onflush, generateId }
}

function Main(config={}){

    config = { ...defaultConfig(), ...config }

    const { generateId } = config

    function dispatchEvent(event){
        config.onevent(event)
        if( event.error ) {
            config.onerror(event)
        } else {
            config.onsuccess(event)
        }
    }

    function Event({
        parentId, id, startTime, endTime, name, data, error
    }){
        return { parentId, id, startTime, endTime, name, data, error }
    }

    function RootEvent(){
        const event = Event({
            parentId: null
            ,id: generateId()
            ,startTime: Date.now()
            ,endTime: Date.now()
            ,error: null
            ,data: {}
        })
        event.wait = Promise.resolve()

        event.flush = async function flush(){
            delete event.flush
            await event.wait.finally( () => {})
            delete event.wait
            event.endTime = Date.now()
            dispatchEvent(event)
            config.onflush(event)
            return event
        }

        return event
    }

    function processRequest(
        request, parentEvent
    ){
        const { name, data, callback } = request

        let event;
        let childP;
        if ( callback ) {
            event = Event({
                parentId: parentEvent.id
                ,id: generateId()
                ,name
                ,startTime: Date.now()
                ,endTime: null
                ,data: { ...parentEvent.data || {}, ...data }
                ,error: null
            })
            childP = Instance(event)
            event.wait = parentEvent.wait
        }

        if ( callback && parentEvent.sync ) {
            try {
                const out = callback(childP)
                return out
            } catch (e) {
                event.error = e
                throw e
            } finally {
                event.endTime = Date.now()
                dispatchEvent(event)
            }
        } else if ( callback && !parentEvent.sync ) {
            let dangling = (async function(){
                try {
                    return await callback(childP)
                } catch (e) {
                    event.error = e
                    throw e
                } finally {
                    event.endTime = Date.now()
                    dispatchEvent(event)
                }   
            })()

            // make it easy to wait before flushing
            parentEvent.wait = parentEvent.wait.finally( () => dangling )

            return dangling

        } else if (!callback && data) {
            parentEvent.data = { ...parentEvent.data, ...data }
            return null
        }
        return null
    }

    function Instance(parentEvent){
        
        function handler(...args){
            const callbackIndex = args.findIndex( x => typeof x == 'function' )
            let cb = args[callbackIndex]
            let rest = callbackIndex > 0 ? args.slice(0,callbackIndex) : args

            let [name, data] = rest
            
            if (typeof name != 'string') {
                data = name
                if( cb ) {
                    name = cb.toString().replace( /\s/g, '' ).replace( /(.)*=>/, '' )
                }
            }

            if ( data == null ) data = {}

            return { name, data, callback: cb }
        }

        function handlerAsync(...args){
            if ( parentEvent.sync ) {
                throw new Error('Cannot use an async trace within a synchronous trace')
            }
            return processRequest(handler(...args), parentEvent)
        }

        function handlerSync(...args){
            return processRequest(
                handler(...args), { ...parentEvent, sync: true }
            )
        }

        handlerAsync.sync = handlerSync
        return handlerAsync
    }

    let rootEvent = RootEvent()
    let handlerInstance = Instance(rootEvent)
    handlerInstance.flush = rootEvent.flush
    return handlerInstance
}

/**
 * Safely invoke a callback even if trace is null.
 * 
 * useful when there are multiple entry points into a function and some are not
 * passing in a trace.
 * 
 * @param {*} trace 
 * @param  {...any} args 
 * @returns 
 */
function call(trace, ...args){
    const cb = args.find( x => typeof x == 'function' )

    if ( trace ) {
        return trace( ...args )
    } else if ( cb ) {
        return cb( (...args) => call(null, ...args) )
    }
    return null
}

Main.call = call

export default Main