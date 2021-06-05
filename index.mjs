function defaultConfig(){

    function onevent(){}
    function onerror(){}
    function onsuccess(){}
    function onflush(){}
    
    // eslint-disable-next-line no-undef
    
    const ourConsole = {
        log(){},
        error(){},
        warn(){}
    }

    function generateId(){
        return Math.random().toString(15).slice(2,8)
    }

    return { 
        onevent, onerror, onsuccess, onflush, console: ourConsole, generateId 
    }
}

function Main(config={}){

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
            ,startTime: Date.now()
            ,endTime: null
            ,data: { ...parentEvent.data || {}, ...data }
            ,error: null
            ,sync: parentEvent.sync || sync
        })
        const childP = Instance(event)
        return { childP, event }
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

        function handlerData({ data }){
            parentEvent.data = { ...parentEvent.data, ...data }
            return null
        }

        async function handlerAsync({ event, childP, callback }){
            if ( parentEvent.sync ) {
                throw new Error('Cannot use an async trace within a synchronous trace')
            }
            
            try {
                const dangling = callback(childP)
                const out = await dangling
                return out
            } catch (e) {
                event.error = e
                throw e
            } finally {
                event.endTime = Date.now()
                try {
                    await dispatchEvent(event)
                } catch (e) {
                    config.console.error('Failed to dispatch event', e)
                }
            }
    
        }

        function handlerSync({ callback, name, event, childP }){
            try {
                const out = callback(childP)
                if( out != null && 'then' in out ) {
                    config.console.warn(name, 'A call to trace.sync was made but the response was async.  This is likely a mistake and should be corrected.')
                }
                return out
            } catch (e) {
                event.error = e
                throw e
            } finally {
                event.endTime = Date.now()
                dispatchEvent(event)
                    .catch( e => config.console.error('Failed to dispatch event', e))
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
        return routerAsync
    }

    let rootEvent = RootEvent()
    let handlerInstance = Instance(rootEvent)
    handlerInstance.flush = rootEvent.flush
    handlerInstance.config = config
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