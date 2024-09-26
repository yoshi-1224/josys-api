class JamfApiClient {
  constructor(serverDomain, loginId, password) {
    this.baseUrl = `https://${serverDomain}.jamfcloud.com`;
    this.loginId = loginId;
    this.password = password;
    this.accessToken = null;
  }

  _getAccessToken(forceRefresh=false) {
    if (this.accessToken && !forceRefresh) {
      return this.accessToken;
    }

    const auth_data = Utilities.base64Encode(`${this.loginId}:${this.password}`);
    var options = {
      'method' : 'POST',
      'contentType': 'application/json',
      'headers': {'Authorization' : 'Basic ' + auth_data, 'accept' : 'application/json'},
    };

    const response = UrlFetchApp.fetch(this.baseUrl + "/api/v1/auth/token", options).getContentText();
    this.accessToken = JSON.parse(response).token;
    return this.accessToken;
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
    if (response.getResponseCode() === 401) { // token error
      console.log("Refreshing token and tying again");
      headers['Authorization'] = `Bearer ${this._getAccessToken(forceRefresh=true)}`;
      response = UrlFetchApp.fetch(url, options);
    }
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
      case 404:
        console.log("404 Not Found");
        return;
      default:
        throw new Error(`${response.getResponseCode()} : ${response.getContentText()}`);
      }
    }

  _paginateThrough(endpoint, perPage, method='get', postData={}) {
    let results = [];
    let totalCount = 0;
    let page = 0;
    let response;
    do {
      if (method === 'get') {
        const url = endpoint.includes('?') ? `${endpoint}&page-size=${perPage}&page=${page++}` : `${endpoint}?page-size=${perPage}&page=${page++}`;
        response = this._makeApiRequest(url);
      } else if (method === 'post') {
        const url = endpoint.includes('?') ? `${endpoint}&page-size=${perPage}&page=${page++}` : `${endpoint}?page-size=${perPage}&page=${page++}`;
        response = this._makeApiRequest(url, 'post', postData);
      }
      totalCount = response.content.totalCount;
      const computers = response.content.results;
      results = [...results, ...computers];
    } while (results.length < totalCount);
    return results;
  }

  getComputerInventoryRecords(perPage=100) {
    let results = this._paginateThrough('/api/v1/computers-inventory?section=GENERAL&section=PURCHASING&section=OPERATING_SYSTEM&section=HARDWARE', perPage, 'get');
    if (!results) {
      return [];
    }

    function flattenObject(obj, parentKey = '', res = {}) {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          let propName = parentKey ? `${parentKey}.${key}` : key;
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            flattenObject(obj[key], propName, res);
          } else {
            res[propName] = obj[key];
          }
        }
      }
      return res;
    }

    results = results.map(record => flattenObject(record));
    for (const r of results) {
      this._convertUTCToLocalTimezone(r, "general.lastContactTime");
    };
    return results;
  }

  _convertUTCToLocalTimezone(device, key) {
    if (device[key]) {
      device[key] = Utils.formatDateToJosysFormat(new Date(device[key]));
    }
  }
}
