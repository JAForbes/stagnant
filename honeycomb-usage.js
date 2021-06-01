/* globals console, setTimeout, process */
import Honey from './honeycomb.js'

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
    for( let i = 0; i < 1e5; i ++) {
        Math.random()
    }
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
}

async function standardResult(){
    await randomDelay()
}
async function filterResults(){
    await randomDelay()
}

async function Usage(){
    const p = Honey({
        name: 'testing-data'
        ,data: { 
            'root.data.example': 1
        }
        ,dataset: 'stagnant'
    })

    let event = {}
    event = await p( 'parseEvent', { 'parseEventData.example': 2 }, () => parseEvent(event) )
    let result = await p( p => callVerified({ ...event, p }) )
    result = await p( () => standardResult(event, result) )
    result = await p( () => filterResults(event, result) )

    p.flush()
    return result
}

Usage()
.catch( e => {
    console.error(e)
    process.exit(1)
})

