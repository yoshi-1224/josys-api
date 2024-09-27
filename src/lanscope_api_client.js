class LanscopeApiClient {
    constructor(apiToken) {
        this.baseUrl = `https://api.lanscopean.com/v1`;
        this.token = apiToken;
    }

    _getAccessToken(forceRefresh = false) {
        return this.token;
    }

    _makeApiRequest(endpoint, method = 'get', postData = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this._getAccessToken()}`,
        };
        const options = {
            'method': method,
            'headers': headers,
            'muteHttpExceptions': true // to handle HTTP errors without throwing exceptions
        };

        if ((method !== 'get' || method !== 'delete') && Object.keys(postData).length) {
            options.payload = JSON.stringify(postData);
            options.headers['contentType'] = 'application/json';
        }

        let response = UrlFetchApp.fetch(url, options);
        switch (response.getResponseCode()) {
            case 200: // OK
            case 201: // POST successful
                if (response.getAllHeaders()["Content-Type"].includes("application/json")) {
                    return {
                        content: JSON.parse(response.getContentText("UTF-8")),
                        headers: response.getAllHeaders()
                    };
                } else {
                    return {
                        content: null,
                        headers: response.getAllHeaders()
                    };
                }
            case 204: // DELETE successful
                console.log("DELETE successful");
                return {
                    content: null,
                    headers: response.getAllHeaders()
                };
            case 401:
                console.log("INVALID TOKEN");
                return;
            case 404:
                console.log("404 Not Found");
                return;
            default:
                throw new Error(`${response.getResponseCode()} : ${response.getContentText()}`);
        }
    }

    _paginateThrough(endpoint, method = 'get', postData = {}) {
        let results = [];
        let response;
        let nextToken = null;
        do {
            let nextTokenParam = nextToken ? `next_token=${nextToken}`: "";
            const url = endpoint.includes('?') ? `${endpoint}&${nextTokenParam}` : `${endpoint}?${nextTokenParam}`;
            if (method === 'get') {
                response = this._makeApiRequest(url);
            } else if (method === 'post') {
                response = this._makeApiRequest(url, 'post', postData);
            }
            nextToken = response.content.next_token;
            const computers = response.content.data;
            results = [...results, ...computers];
        } while (nextToken);
        return results;
    }

    getDevices() {
        let results = this._paginateThrough('/devices', 'get');
        if (!results) {
            return [];
        }
        return results;
    }

    _convertUTCToLocalTimezone(device, key) {
        if (device[key]) {
            device[key] = Utils.formatDateToJosysFormat(new Date(device[key]));
        }
    }
}
