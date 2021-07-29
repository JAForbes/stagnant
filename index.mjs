function defaultConfig(){

    function onevent(){}
    function onerror(){}
    function onsuccess(){}
    function onflush(){}
    
    // eslint-disable-next-line no-undef
    
    const ourConsole = {
        log(){}
        ,error(){}
        ,warn(){}
    }

    function generateId(){
        return Math.random().toString(15).slice(2,8)
    }

    return { 
        onevent, onerror, onsuccess, onflush, console: ourConsole, generateId 
    }
}

export default function Main(config={}){

    config = { ...defaultConfig(), ...config }

    const { generateId } = config

    async function dispatchEvent(event){
        await config.onevent(event)
        if( event.error ) {
            await config.onerror(event)
        } else {
            await config.onsuccess(event)
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

        event.flush = async function flush(){
            delete event.flush
            event.endTime = Date.now()
            await dispatchEvent(event)
            await config.onflush(event)
            return event
        }

        return event
    }

    function setupEvent({ parentEvent, name, data, sync }){
        const event = Event({
            parentId: parentEvent.id
            ,id: generateId()
            ,name
            ,startTime: null
            ,endTime: null
            ,data: { ...parentEvent.data || {}, ...data }
            ,error: null
            ,sync: parentEvent.sync || sync
        })
        const childP = Instance(event)
        return { childP, event }
    }


    function Instance(parentEvent){

        let lastTrace = null;
        
        function handler(...args){
            const callbackIndex = args.findIndex( x => typeof x == 'function' )
            let cb = args[callbackIndex]
            let rest = callbackIndex > 0 ? args.slice(0,callbackIndex) : args

            let [name, data] = rest
            
            if (typeof name != 'string') {
                data = name
                if( cb ) {
                    name = data.name || cb.toString().replace( /\s/g, '' ).replace( /(.)*=>/, '' );
                }
            }

            if ( data == null ) data = {}

            return { name, data, callback: cb }
        }

        function handlerData({ data }){
            parentEvent.data = { ...parentEvent.data, ...data }
            return null
        }

        async function handlerAsync({ event, childP, callback }){
            if ( parentEvent.sync ) {
                throw new Error('Cannot use an async trace within a synchronous trace')
            }
            
            try {
                event.startTime = Date.now()
                lastTrace = event
                const out = await callback(childP)
                event.endTime = Date.now()
                return out
            } catch (e) {
                event.endTime = Date.now()
                event.error = e
                throw e
            } finally {
                dispatchEvent(event)
                    .catch( e => config.console.error('Failed to dispatch event', e))
                if (lastTrace && lastTrace.id == event.id ) {
                    lastTrace = null
                }
            }
    
        }

        function handlerSync({ callback, name, event, childP }){
            try {
                event.startTime = Date.now()
                lastTrace = event
                const out = callback(childP)
                event.endTime = Date.now()
                if( out != null && 'then' in out ) {
                    config.console.warn(name, 'A call to trace.sync was made but the response was async.  This is likely a mistake and should be corrected.')
                }
                return out
            } catch (e) {
                event.endTime = Date.now()
                event.error = e
                throw e
            } finally {
                dispatchEvent(event)
                    .catch( e => config.console.error('Failed to dispatch event', e))
                if (lastTrace && lastTrace.id == event.id ) {
                    lastTrace = null
                }
            }
        }

        function routerOptions({ sync }, ...args){
            const { data, callback, name } = handler(...args)
            
            const {event,childP} = 
                callback ? setupEvent({ parentEvent, name, data, sync }) : {}

            if( callback && sync ) {
                return handlerSync({ data, callback, childP, name, event })
            } else if ( callback && !sync ) {
                return handlerAsync({ data, callback, childP, name, event })
            } else {
                return handlerData({ data })
            }
        }

        async function routerAsync(...args){
            const out = await routerOptions({ sync: false }, ...args)
            return out
        }

        function routerSync(...args){
            const out = routerOptions({ sync: true }, ...args)
            return out
        }

        routerAsync.sync = routerSync
        routerAsync.activeTrace = function activeTrace(){
            return lastTrace;
        }
        routerAsync.activeTraceId = function activeTrace(){
            return lastTrace && lastTrace.id;
        }
        routerAsync.start = function startTrace(...args){
            let finish
            let child;
            let done = routerAsync( ... args.concat(I => {
                child = I
                return new Promise((Y) => {
                    finish = Y
                })
            }))
    
            return {
                finish(){
                    finish()
                    return done
                }
                , child
            }
        }
        return routerAsync
    }

    function start(){
        let rootEvent = RootEvent()
        let handlerInstance = Instance(rootEvent)
        handlerInstance.flush = rootEvent.flush
        handlerInstance.config = config
        return handlerInstance
    }

    function resume({ ...theirEvent }={}){
        let rootEvent = RootEvent()
        let flush = rootEvent.flush
        // so flush has access to the new data
        Object.assign(rootEvent, theirEvent)
        let handlerInstance = Instance(rootEvent)
        handlerInstance.flush = flush
        handlerInstance.config = config
        return handlerInstance
    }
    
    start.resume = resume
    start.start = function start(){
        return start().start()
    }
    
    return start
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

/**
 * Create a no-op trace if provided trace is null
 * 
 * Much like stagnant.call, useful when there are multiple entry points into a function and some are not
 * passing in a trace.
 * 
 * @param {*} trace 
 * @param  {...any} args 
 * @returns 
 */
function ensure(trace){
    if( trace ) {
        return trace
    } else {
        return (...args) => call(null, ...args)
    }
}

Main.ensure = ensure
Main.defaultConfig = defaultConfig