class FreeeApiClient {
  constructor(clientId, clientSecret) {
    if (clientId === null || clientSecret === null) {
      Logger.log("Either token or secret is invalid. Please check");
      throw new Error("Either token or secret is invalid. Please check");
    }
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.service = this.getService_(clientId, clientSecret);
    this.columns = ["id", "last_name", "first_name", "display_name", "email", "num", "user_id", "entry_date", "retire_date"];
  }

  getService_(clientId, clientSecret) {
    if (this.service) {
      return this.service;
    }

    this.service = OAuth2.createService("freee")
      .setAuthorizationBaseUrl("https://accounts.secure.freee.co.jp/public_api/authorize")
      .setTokenUrl("https://accounts.secure.freee.co.jp/public_api/token")
      .setClientId(clientId)
      .setClientSecret(clientSecret)
      .setCallbackFunction("authCallback")
      .setPropertyStore(PropertiesService.getScriptProperties());

    return this.service;
  }

  _flatten_profile_rules(employee) {
    employee["last_name"] = employee.profile_rule.last_name;
    employee["first_name"] = employee.profile_rule.first_name;
    employee["email"] = employee.profile_rule.email;
    employee["employee_id"] = employee.profile_rule.employee_id;
    delete employee["profile_rule"];
  }

  _flatten_group_memberships(employee) {
    if (employee["group_memberships"] && employee["group_memberships"].length > 0) {
      employee["position"] = employee.group_memberships[0].position_name;
    } else {
      employee["position"] = "";
    }
    delete employee["group_memberships"];
  }

  _buildUrl(url, params) {
    var paramString = Object.keys(params).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    }).join('&');
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + paramString;
  }

  _paginateThrough(endpoint, params={}) {
    let results = [];
    var accessToken = this.getService_().getAccessToken();
    var headers = { "Authorization": "Bearer " + accessToken };
    var options = { "method": "get", "headers": headers };
    let response_length = -1;
    let cursor = 0;
    do {
      var finalParams = {
        limit: 100,
        offset: cursor,
        ...params
      };
      var response = UrlFetchApp.fetch(this._buildUrl(endpoint, finalParams), options);
      var parsedContent = JSON.parse(response.getContentText());
      if (endpoint.includes("group")) {
        parsedContent = parsedContent.employee_group_memberships;
      } else if (!endpoint.includes("companies")) {
        parsedContent = parsedContent.employees;
      }
      response_length = parsedContent.length;
      if (response_length > 0) {
        results = [...results, ...parsedContent];
      }
      cursor += response_length;
      if (response_length > 0) {
        Logger.log(this._buildUrl(endpoint, finalParams));
        Logger.log(`Fetched ${response_length} employees from freee`);  
      }
    } while (response_length > 0);
    return results;
  }

  getEmployees(companyId) {
    var requestUrl = `https://api.freee.co.jp/hr/api/v1/employees`;
    let params = { company_id: companyId, year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
    const results = this._paginateThrough(requestUrl, params);
    for (const r of results) {
      this._flatten_profile_rules(r);
      Utils.extract_columns(r, this.columns);
    };
    return results;
  }

  getAllEmployees(companyId) {
    var requestUrl = `https://api.freee.co.jp/hr/api/v1/companies/${companyId}/employees`;
    const results = this._paginateThrough(requestUrl);
    for (const r of results) {
      Utils.extract_columns(r, this.columns);
    };
    return results;
  }

  getCompanies() {
    var accessToken = this.getService_().getAccessToken();
    var requestUrl = "https://api.freee.co.jp/api/1/companies";
    var headers = { "Authorization": "Bearer " + accessToken };
    var options = {
      "method": "get",
      "headers": headers,
      "limit": 100
    };
    var res = UrlFetchApp.fetch(requestUrl, options).getContentText();
    return JSON.parse(res).companies;
  }

  getGroupMemberships(companyId) {
    var requestUrl = "https://api.freee.co.jp/hr/api/v1/employee_group_memberships";
    let params = { company_id: companyId, base_date: Utils.formatDateToYYYYMMDD(new Date())};
    var results = this._paginateThrough(requestUrl, params);
    for (const r of results) {
      Utils.extract_columns(r, ["id", "group_memberships"]);
      this._flatten_group_memberships(r);
    };
    return results;
  }
}
