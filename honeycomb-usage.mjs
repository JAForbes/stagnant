/* globals console, setTimeout, process */
import Honey from './honeycomb.mjs'

function delay(ms){
    return new Promise( Y => setTimeout(Y, ms))
}
function randomDelay(min=0, max=300){
    return delay(min + Math.random() * max - min)
}

async function parseEvent(event){
    await randomDelay()
    return event
}
function verifyParams(event){
    for( let i = 0; i < 1e5; i ++) {
        Math.random()
    }
    return event
}
async function callVerified(event){
    const { p } = event
    p({ 'someCallVerifiedData': 3 })

    event = p.sync( () => verifyParams(event) )
    const out = await p( { 'callData': 4 }, () => call(event) )
    return out
}

async function call(event){
    await randomDelay()
    if( event.fail ) {
        throw new Error('This is an error')
    }
}

async function standardResult(result){
    await randomDelay()
    return result
}
async function filterResults(result){
    await randomDelay()
    return result
}

async function Usage({ fail }={}){
    const p = Honey({
        name: 'testing-data'
        ,data: { 
            'root.data.example': 1
        }
        ,dataset: 'stagnant'
    })

    try {
        let event = { fail }
        event = await p( 'parseEvent', { 'parseEventData.example': 2 }, () => parseEvent(event) )
        let result = await p( p => callVerified({ ...event, fail, p }) )
        result = await p( () => standardResult(event, result) )
        result = await p( () => filterResults(event, result) )
        return result
    } catch (e) {
        console.error(e)
        throw e
    } finally {
        await p.flush()
    }


}

Usage()
.catch( e => {
    console.error(e)
    process.exit(1)
})


Usage({ fail: true })
.catch( e => {
    console.error(e)
    process.exit(1)
})

