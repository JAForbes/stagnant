/* globals console, setTimeout, process */
import Stagnant from './honeycomb.mjs'

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
    const { I } = event
    I({ 'someCallVerifiedData': 3 })

    event = I.sync( () => verifyParams(event) )
    const out = await I( { 'callData': 4 }, () => call(event) )
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
    const stagnant = Stagnant({
        name: 'testing-data'
        ,data: { 
            'root.data.example': 1
        }
        ,dataset: 'stagnant'
        ,config: { console }
    })

    // start trace
    let I = stagnant()
    try {
        let event = { fail }
        event = await I( 'parseEvent', { 'parseEventData.example': 2 }, () => parseEvent(event) )
        let result = await I( I => callVerified({ ...event, fail, I }) )
        result = await I( () => standardResult(event, result) )
        result = await I( () => filterResults(event, result) )
        return result
    } catch (e) {
        console.error(e)
    } finally {
        await I.flush()
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

