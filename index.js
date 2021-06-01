/* globals console */
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

function Library(config={}){

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
                ,data
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
            let rest = callbackIndex > 0 ? args.slice(callbackIndex) : []

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

function delay(ms){
    return new Promise( Y => setTimeout(Y, ms))
}
function randomDelay(min=0, max=300){
    return delay(min + Math.random() * max - min)
}

async function parseEvent(){
    await randomDelay()
}
async function verifyParams(){
    await randomDelay()
}
async function callVerified(event){
    const { p } = event

    event = p.sync( () => verifyParams(event) )
    const out = await p( () => call(event) )
    return out
}

async function call(event){
    await randomDelay()
}

async function standardResult(){
    await randomDelay()
}
async function filterResults(){
    await randomDelay()
}

const P = Library
async function Usage(){
    let events = []
    const p = P({
        onevent(event){
            events.push(event)
            console.log('onevent', event.name, event.endTime - event.startTime)
        }
    })

    let event = {}
    event = await p( () => parseEvent(event) )
    let result = await p( p => callVerified({ ...event, p }) )
    result = await p( () => standardResult(event, result) )
    result = await p( () => filterResults(event, result) )

    // you can perform custom logic in flush, or via onflush in the config
    // provides overall timing 
    p.flush().then( (event) => {
        console.log('flushed', event, events)
    })
    return result
}

Usage()
.catch( e => {
    console.error(e)
    process.exit(1)
})

