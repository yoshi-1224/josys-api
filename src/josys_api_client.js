class JosysApi {
  constructor(apiUserKey, apiSecretKey) {
    this.apiUserKey = apiUserKey;
    this.apiSecretKey = apiSecretKey;
    this.baseUrl = 'https://developer.josys.it/api';
    this.token = null;
  }

  // Private method to handle token generation and refresh
  _getToken() {
    if (this.token) return this.token;
    const url = `${this.baseUrl}/v1/oauth/tokens`;
    const payload = {
      'grant_type': 'client_credentials',
      'api_user_key': this.apiUserKey,
      'api_user_secret': this.apiSecretKey
    };
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload)
    };
    try {
      const response = JSON.parse(UrlFetchApp.fetch(url, options).getContentText());
      this.token = response.id_token;
      return this.token;
    } catch (error) {
      throw new Error("ジョーシスのトークンを取得できませんでした。認証情報が正しくない可能性があります");
    }
  }

  /*
    if 200/201, returns { content, headers}
    if 204 or 404, returns null
    else raises Error
   */
  _apiRequest(endpoint, method = 'get', params = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this._getToken()}`,
      'Content-Type': 'application/json'
    };
    const options = {
      'method': method,
      'headers': headers,
      'muteHttpExceptions': true // to handle HTTP errors without throwing exceptions
    };

    if ((method !== 'get' || method !== 'delete') && Object.keys(params).length) {
      options.payload = JSON.stringify(params);
    }

    // call, and if 401, call again
    // if other than 401, raise error
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 401) {
      console.log("Refreshing token");
      this.token = null; // Reset token
      headers['Authorization'] = `Bearer ${this._getToken()}`;
      options.headers = headers;
      response.UrlFetchApp.fetch(url, options);
    }

    if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
      // 201 = Data creation is successful
      return {
        content: JSON.parse(response.getContentText()),
        headers: response.getAllHeaders()
      };
    } else if (response.getResponseCode() === 204) {
      // 204 = Data deletion is successful
      console.log("DELETE successful, nothing to return");
      return;
    } else if (response.getResponseCode() === 404) {
      console.log("404 Not Found");
      return;
    } else {
      throw new Error(`${response.getResponseCode()} : ${response.getContentText()}`);
    }
  }

  _paginateThrough(endpoint, per_page) {
    let page = 1;
    let totalPages = 1;
    let result = [];

    while (page <= totalPages) {
      const response = this._apiRequest(`${endpoint}?per_page=${per_page}&page=${page}`);

      if (response && response.content) {
        result = result.concat(response.content.data || []);
        totalPages = parseInt(response.headers['x-total-pages'] || '-1');
        const totalRecords = parseInt(response.headers['x-total'] || '0');
        console.log(`Fetching page: ${page} of ${totalPages}, Total Records: ${totalRecords}`);
        page++;
      } else {
        break; // Exit loop if no response or an error occurred
      }
    }

    return result;
  }

  _paginatePostThrough(endpoint, postData, per_page) {
    let page = 1;
    let totalPages = 1;
    let result = [];

    while (page <= totalPages) {
      const response = this._apiRequest(`${endpoint}?per_page=${per_page}&page=${page}`, 'post', postData);

      if (response && response.content) {
        result = result.concat(response.content.data || []);
        totalPages = parseInt(response.headers['x-total-pages'] || '1');
        const totalRecords = parseInt(response.headers['x-total'] || '0');
        console.log(`Fetching page: ${page} of ${totalPages}, Total Records: ${totalRecords}`);
        page++;
      } else {
        break; // Exit loop if no response or an error occurred
      }
    }

    return result;
  }

  _convertUserProfileEnumsToJapanese(profile) {
    profile["status"] = statusMappingEn2JP[profile["status"]];
    if (profile["user_category"]) {
      profile["user_category"] = statusMappingEn2JP[profile["user_category"]];
    }
  }

  // Departments Endpoints
  getAllDepartments(per_page = 50) {
    return this._paginateThrough('/v1/departments', per_page);
  }

  getDepartment(uuid) {
    return this._apiRequest(`/v1/departments/${uuid}`).content.data;
  }

  createDepartment(params) {
    if (!params.name) {
      throw new Error('Error: "name" field is required for creating a department.');
    }
    return this._apiRequest('/v1/departments', 'post', params).content.data;
  }

  searchDepartments(search_params, per_page = 50) {
    return this._paginatePostThrough('/v1/departments/search', search_params, per_page);
  }

  getAllUserProfiles(per_page = 100, return_enums_in_japanese=true, get_department_names=true) {
    const results = this._paginateThrough('/v1/user_profiles', per_page);

    if (return_enums_in_japanese) {
      for (const profile of results) {
        this._convertUserProfileEnumsToJapanese(profile);
      }
    };

    if (get_department_names) {
      const departments = this.getAllDepartments();
      this._appendDepartments(results, departments);
    }
    return results;
  }

  getUserProfile(uuid, return_in_japanese=true) {
    const result = this._apiRequest(`/v1/user_profiles/${uuid}`);
    if (result) {
      let userProfile = result.content.data;
      if (return_in_japanese) {
        return this._convertUserProfileEnumsToJapanese(userProfile);
      }
    } else {
      return;
    }
  }

  updateUserProfile(uuid, params) {
    console.log("UPDATING " + uuid);
    console.log(params);
    return this._apiRequest(`/v1/user_profiles/${uuid}`, "patch", params);
  }

  deleteUserProfile(uuid) {
    return this._apiRequest(`/v1/user_profiles/${uuid}`, "delete");
  }

  createUserProfile(params) {
    if (!params.last_name || !params.status) {
      throw new Error('Error: "last_name" and "status" fields are required for creating a user profile.');
    }
    if (!params.email && !params.user_id) {
      throw new Error('Error: "email" or "user_id" must be provided');
    }
    console.log("CREATING " + params.last_name);
    return this._apiRequest('/v1/user_profiles', 'post', params).content.data;
  }

  searchUserProfiles(search_params, per_page = 100, return_in_japanese=true, get_department_names=true) {
    let results = this._paginatePostThrough('/v1/user_profiles/search', search_params, per_page);
    if (!results) {
      return [];
    }
    
    if (return_in_japanese) {
      for (const profile of results) {
        this._convertUserProfileEnumsToJapanese(profile);
      }
    }

    if (get_department_names) {
      const departments = this.getAllDepartments();
      this._appendDepartments(results, departments);
    }
    
    return results;
  }

  _appendDepartments(employees, departments) {
    const results = this._constructDepartmentPaths(departments);
    for (let emp of employees) {
      if (emp.department_uuids.length === 0) {
        continue;
      }
      emp.departments = emp.department_uuids.map((uuid)=> {
        return results[uuid];
      });
    }
  }
  
  _constructDepartmentPaths(departments) {
    const departmentMap = departments.reduce((map, dept) => {
      map[dept.uuid] = dept;
      return map;
    }, {});

    function getFullPath(uuid, path = []) {
      const dept = departmentMap[uuid];
      if (!dept) return path.join(' > '); // Return the constructed path if no more parents
      path.unshift(dept.name); // Add current department name at the beginning of the path
      if (dept.parent_department_uuid) {
        return getFullPath(dept.parent_department_uuid, path); // Recurse if there's a parent
      }
      return path.join(' > '); // Base case: no parent
    }

    const fullPathDictionary = {};
    departments.forEach(dept => {
      fullPathDictionary[dept.uuid] = getFullPath(dept.uuid);
    });
    return fullPathDictionary;
  }
}

const statusMappingEn2JP = {
  "ONBOARD_INITIATED": "入社前",
  "ONBOARDED": "在籍中",
  "TEMPORARY_LEAVE":"休職中",
  "OFFBOARD_INITIATED": "退職済",
  "UNKNOWN": "不明",
  "OTHERS": "その他",
};

const statusMappingJP2EN = {
  "入社前": "ONBOARD_INITIATED",
  "在籍中": "ONBOARDED",
  "休職中": "TEMPORARY_LEAVE",
  "退職済": "OFFBOARD_INITIATED",
  "不明": "UNKNOWN",
  "その他": "OTHERS",
};

const userCategoryMapping = {
  "BOARD_MEMBER": "役員",
  "FULL_TIME": "正社員",
  "TEMPORARY_EMPLOYEE":"派遣社員",
  "SUBCONTRACTOR": "業務委託",
  "PART_TIME": "パート・アルバイト",
  "TRANSFEREE": "出向社員",
  "CONTRACTOR": "契約社員",
  "OTHERS": "その他",
  "SYSTEM": "システム",
}