### remotepyjs

#### RemotePy JavaScript Client


#### Usage

Install package from npm.

`npm install --save remotepyjs`


Import JS2Py instance from remotepy script and assign serverName. `serverName` is your server URL which you want to connect to. 

    import JS2Py from 'remotepy'
    
    JS2Py.serverName = 'ws://localhost:8083';
    JS2Py.start();


Do not use `onclose` and `onopen` in your code directly. Instead use `subOnClose` and `subOnClose`.

    import JS2Py from 'remotepy'

    JS2Py.serverName = 'ws://localhost:8083'
    
    JS2Py.subOnOpen(() => {
        // your logic `onopen` here
    })

    JS2Py.subOnClose(() => {
        // your logic `onclose` here
    })
