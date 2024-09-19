class HrbrainApiClient {
  constructor(serverDomain, clientSecret) {
    this.baseUrl = `https://${serverDomain}.oapi.hrbrain.jp`;
    this.serverDomain = serverDomain;
    this.token = clientSecret;
    this.accessToken = null;
    this.columnsToFetch = {
      "columns": ["EmploymentStatus", "LastName", "FirstName", "Email", "Job", "EmployeeNumber", "MainTeam", "EnrollmentStatus","EnteredDay", "EmploymentStatus", "193b946d-60be-49b8-9940-d9d2a5983ad5"] // aliasか、id
    };
  }

  _getAccessToken(forceRefresh=false) {
    if (this.accessToken && !forceRefresh) {
      return this.accessToken;
    }

    var options = {
      'method' : 'POST',
      'contentType': 'application/json',
      'headers': {'accept' : 'application/json'},
      'payload': JSON.stringify({
        "clientId": this.serverDomain,
        "clientSecret": this.token
      })
    };

    const response = UrlFetchApp.fetch(this.baseUrl + "/auth/token", options).getContentText();
    this.accessToken = JSON.parse(response).token;
    return this.accessToken;
  }

  getAllMembers() {
    let endpoint = "/members/v1/members";
    endpoint = this._buildUrl(endpoint, this.columnsToFetch);
    let results = this._paginateThrough(endpoint, 100, "get");

    if (!results) {
      return [];
    }

    results = results.map(member => {
      const memberFields = member.fields.reduce((acc, field) => {
        if (field.alias && field.alias !== "") {
          acc[field.alias] = field.value;
        } else {
          acc[field.id] = field.value;
        }
        return acc;
      }, {});
      return { ...memberFields, id: member.id };
    });

    return results;
  }

  _buildUrl(url, params) {
    var paramString = Object.keys(params).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(Array.isArray(params[key]) ? params[key].join(',') : params[key]);
    }).join('&');
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + paramString;
  }

  _paginateThrough(endpoint, perPage, method='get', postData={}) {
    let results = [];
    let totalCount = 0;
    let offset = 0;
    let response;
    do {
      if (method === 'get') {
        const url = endpoint.includes('?') ? `${endpoint}&page-size=${perPage}&page=${offset++}` : `${endpoint}?page-size=${perPage}&page=${offset++}`;
        response = this._makeApiRequest(url);
      } else if (method === 'post') {
        const url = endpoint.includes('?') ? `${endpoint}&page-size=${perPage}&page=${offset++}` : `${endpoint}?page-size=${perPage}&page=${offset++}`;
        response = this._makeApiRequest(url, 'post', postData);
      }
      totalCount = response.content.paging.totalCount;
      const members = response.content.data;
      results = [...results, ...members];
    } while (results.length < totalCount);
    return results;
  }

  _makeApiRequest(endpoint, method = 'get', postData = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(url);
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

    var response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 401) { // token error
      console.log("Refreshing token and tying again");
      headers['Authorization'] = `Bearer ${this._getToken(forceRefresh=true)}`;
      response = UrlFetchApp.fetch(url, options);
    }
    switch (response.getResponseCode()) {
      case 200: // OK
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
      case 404:
        console.log("404 Not Found");
        return;
      default:
        throw new Error(`${response.getResponseCode()} : ${response.getContentText()}`);
      }
    }

    getMemberColumns() {
      const endpoint = "/members/v1/fields";
      const result = this._makeApiRequest(endpoint).content;
      return result;
    }

    getItemsInOrganizationPulldown(id) {
      const endpoint = `/members/v1.1/organization/${id}/items`;
      const result = this._makeApiRequest(endpoint).content;
      return result;
    }
}
