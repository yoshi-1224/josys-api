class HrbrainApiClient {
  constructor(serverDomain, clientSecret, columnLabelsToFetch=[]) {
    this.baseUrl = `https://${serverDomain}.oapi.hrbrain.jp`;
    this.serverDomain = serverDomain;
    this.token = clientSecret;
    this.accessToken = null;
    this.columnsToFetch = columnLabelsToFetch;
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
    let columns = this.getMemberColumns();
    const columnIdsToFetch = columns
      .filter(column => this.columnsToFetch.includes(column.label))
      .map(column => column.id);

    let endpoint = "/members/v1/members";
    endpoint = this._buildUrl(endpoint, { columns:columnIdsToFetch });
    let members = this._paginateThrough(endpoint, 100, "get");

    if (!members) {
      return [];
    }

    columns = columns.reduce((acc, e) => {
      acc[e.id] = e;
      return acc;
    }, {});

    members = members.map(member => {
      const memberFields = member.fields.reduce((acc, field) => {
          if (field.type !== "organizationPulldown") {
              acc[columns[field.id].label] = field.value;
          } else {
            const organizationId = columns[field.id].organizationId;
            if (!this._itemsCache) {
              this._itemsCache = {};
            }
            if (!this._itemsCache[organizationId]) {
              this._itemsCache[organizationId] = this.getItemsInOrganizationPulldown(organizationId);
            }
            const [items, type] = this._itemsCache[organizationId];
            if (type === "list") {
              acc[columns[field.id].label] = items.find(item => item.id === field.value)?.value;
            } else if (field.alias === "MainTeam" && field.value && field.value !== "") {
              console.log(`${columns[field.id].label}: ${items[field.value]}`);
              acc[columns[field.id].label] = items[field.value];
            }
          }
        return acc;
      }, {});
      return { ...memberFields, id: member.id };
    });

    return members;
  }

  _createIdValueMap(dataArray) {
    const idValueMap = {};
  
    function traverse(node, path) {
      if (!node) return;
  
      // Add current node's value to the path
      path.push(node.value);
  
      // Create the path string
      const pathString = path.join('>');
  
      // Add to the map
      idValueMap[node.id] = pathString;
  
      // Traverse children if any
      if (node.items) {
        if (Array.isArray(node.items)) {
          node.items.forEach(child => traverse(child, path));
        } else if (typeof node.items === 'object') {
          traverse(node.items, path);
        }
      }
  
      // Backtrack: remove current node's value from the path
      path.pop();
    }
  
    // Since dataArray is an array, we iterate over each root node
    dataArray.forEach(rootNode => {
      traverse(rootNode, []);
    });
  
    return idValueMap;
  }

  getMemberColumns() {
    const endpoint = "/members/v1/fields";
    const result = this._makeApiRequest(endpoint).content;
    return result;
  }

  getItemsInOrganizationPulldown(id) {
    const endpoint = `/members/v1.1/organization/${id}/items`;
    const result = this._makeApiRequest(endpoint).content;
    if (result.type === "tree") {
      const list_items = this._createIdValueMap(result.items);
      result.items = list_items;
    }
    return [result.items, result.type];
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
      const url = endpoint.includes('?') ? `${endpoint}&limit=${perPage}&offset=${offset}` : `${endpoint}?limit=${perPage}&offset=${offset}`;
      if (method === 'get') {
        response = this._makeApiRequest(url);
      } else if (method === 'post') {
        response = this._makeApiRequest(url, 'post', postData);
      }
      totalCount = response.content.paging.totalCount;
      const members = response.content.data;
      results = [...results, ...members];
      offset += members.length;
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
}
