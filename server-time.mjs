/* global setTimeout, localStorage */
async function calculateOffset(getServerTime, { 
    samples=3
    , delay=50
    , _setTimeout=setTimeout 
    , local: localTime
}={}){

    let times = []
    let sum = 0, min=Infinity, max=-Infinity;
    let tripSum = sum, tripMin=min, tripMax=max;

    // eslint-disable-next-line no-unused-vars
    for( let _ of Array(samples) ){
        await new Promise( Y => _setTimeout(Y, delay) )
        let t0 = localTime(); 
        let t1 = await getServerTime()
        let t2 = localTime()

        let roundTrip = t2 - t0
        tripSum += roundTrip
        tripMax = Math.max(roundTrip, tripMax)
        tripMin = Math.min(roundTrip, tripMin)
        let halfTrip = roundTrip / 2
        
        let clientPrediction = t0 + halfTrip
        let serverTime = t1
        times.push(serverTime - clientPrediction)
        let answer = serverTime - clientPrediction
        sum += answer
        max = Math.max(answer, max)
        min = Math.min(answer, min)
    }

    let avg = sum / samples
    let tripAvg = tripSum / samples

    let o = { 
        samples
        , delay
        , time: { avg, min, max }
        , trip: { avg: tripAvg, min: tripMin, max: tripMax } 
    }

    return o
}


function Time(options={}){
    let time = {
        async save(offset=time.offset){
            if ( typeof localStorage == 'undefined' ) return false;
            localStorage.setItem('stagnant.time.offset', JSON.stringify(offset) )
            localStorage.setItem('stagnant.time.expiry', Date.now() + time.expiry)
            return true
        }
        ,async clear(){
            if ( typeof localStorage == 'undefined' ) return false;
            
            localStorage.removeItem('stagnant.time.offset')
            && localStorage.removeItem('stagnant.time.expiry')

            time.offset = { avg: 0, min: 0, max: 0 }
            return true
        }
        ,async restore(){
            if ( typeof localStorage == 'undefined' ) return false;
            try {
                let x
                x= localStorage.getItem('stagnant.time.expiry')
                x= Number(x)
                if( Number.isNaN(x) ) {
                    return false;   
                }
                if( time.local() > x ) {
                    return false;
                }
                x= localStorage.getItem('stagnant.time.offset')
                x= JSON.parse(x)
                if( x == null ) return false
                time.offset = x
                time.restored = true
                return true
            } catch(e) {
                return false
            }
        }
        ,samples: 3
        ,delay: 50
        ,offset: { avg: 0, min: 0, max: 0 }
        ,setTimeout
        ,restored: false
        ,expiry: 86400 * 1000
        ,async server(){
            return Date.now()
        }
        ,local(){
            return Date.now()
        }
        ,now(offset=time.offset){
            return offset=time.offset - offset.avg
        }
        ,async sync(){
            
            if(!await time.restore()){
                let answer = await calculateOffset(time.server, time)
                time.offset = answer.time
                time.save(time.offset)
            }
            return time.offset
        }
    }

    time = {...time, ...options}

    return time
}

export default Time