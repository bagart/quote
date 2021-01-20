let tickerInstance;

class Ticker {
    symbolsData = {};
    socket = null;
    exchangeTable = null;
    exchangeTableRaw = null;
    constructor(table) {
        this.exchangeTableRaw = table;
    }
    init() {
        this.socket = new WebSocket("wss://api.exchange.bitcoin.com/api/2/ws");
        this.socket.onopen = (function (event) {
            this.onOpen(event);
        }).bind(this);
        this.socket.onmessage = (function (event) {
            this.onMessage(event);
        }).bind(this);
        this.socket.onclose = (function (event) {
            this.onClose(event);
        }).bind(this);
        this.socket.onerror = (function (event) {
            this.onError(event);
        }).bind(this);
    }

    addSymbol(symbol, table) {
        let symbolName = `${symbol.baseCurrency} / ${symbol.quoteCurrency}`
        this.symbolsData[symbol.id] = {
            name: symbolName
        }

        let tr = document.createElement('tr');
        tr.id = this.getTrName(symbolName);
        tr.innerHTML = '<td>' + symbolName + '</td>'
        for (let i = 0; i < 5; ++i) {
            tr.appendChild(document.createElement('td'))
        }
        table.appendChild(tr);
    }

    subscribeSymbol(symbolId) {
        this.socket.send(`{"method": "subscribeTicker","params": {"symbol": "${symbolId}"}, "id": "ticker"}`);
    }

    buildTable() {
        this.exchangeTable = this.exchangeTableRaw.DataTable( {
            "order": [[ 5, "desc" ]],
            "pageLength": 50,
            "lengthMenu": [[10, 50, 100, -1], [10, 50, 100, "All"]],
        } );
    }

    onMessage(event) {
        let response = JSON.parse(event.data);
        switch (response.id) {
            case 'getSymbols':
                let exchangeTbodyRaw = $('#symbolDash tbody')[0];
                for (let i in response.result) {
                    this.addSymbol(response.result[i], exchangeTbodyRaw)
                }

                for (let i in response.result) {
                    this.subscribeSymbol(response.result[i].id)
                }
                break;
            case 'ticker':
                //console.log('subscribe');
                break;
            case undefined:
                if (!response.method || response.method !== 'ticker') {
                    console.error('unknown response', response);
                    break;
                }
                let symbolValue = this.symbolsData[response.params.symbol];
                let columns = ['bid', 'ask', 'high', 'low', 'last'];

                for (let i in columns) {
                    let column = columns[i]
                    if (symbolValue[column] !== response.params[column]) {
                        let tr = $('#symbolDash #' + this.getTrName(symbolValue.name))[0];
                        if (tr) {
                            let td = tr.children[parseInt(i) + 1];
                            td.innerText = response.params[column];
                            if (typeof symbolValue.ask !== 'undefined' && (column === 'bid' || column === 'ask')) {

                                td.className = symbolValue[column] > response.params[column] ? 'tick_down' : 'tick_up';
                                //@todo unset timeout for new blink
                                setTimeout(fn => td.className = null, 100);
                            }
                        }
                        symbolValue[column] = response.params[column]
                    }
                }
                this.symbolsData[response.params.symbol] = symbolValue;
        }
    }

    onClose(event) {
        if (event.wasClean) {
            console.error(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
            console.error('[close] Connection died');
            this.init();
        }
    }

    onError(error) {
        console.error(error.message);
    }

    onOpen(e) {
        console.log('subscribe');
        this.socket.send('{"method": "getSymbols","params": {}, "id": "getSymbols"}');
    }

    getTrName(symbolName) {
        return 'tick_' + symbolName.replace(/[^A-Z0-9]+/i, '-')
    }
}

$(document).ready(function () {
    tickerInstance = new Ticker(
        $('#symbolDash')
    );
    tickerInstance.init();
});
