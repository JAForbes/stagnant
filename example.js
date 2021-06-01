/* globals console, setTimeout, process */
import stagnant from './index.js'

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

async function Usage(){
    let events = []
    const p = stagnant({
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

