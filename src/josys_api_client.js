class JosysApiClient {
  constructor(apiUserKey, apiSecretKey) {
    this.apiUserKey = apiUserKey;
    this.apiSecretKey = apiSecretKey;
    this.baseUrl = 'https://developer.josys.it/api';
    this.token = null;
  }

  _getToken(forceRefresh=false) {
    if (!forceRefresh) {
      if (this.token) {
        return this.token;  
      }
    }
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

  _makeApiRequest(endpoint, method = 'get', postData = {}) {
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

    if ((method !== 'get' || method !== 'delete') && Object.keys(postData).length) {
      options.payload = JSON.stringify(postData);
    }

    let response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 401) { // token error
      console.log("Refreshing token and tying again");
      headers['Authorization'] = `Bearer ${this._getToken(forceRefresh=true)}`;
      response = UrlFetchApp.fetch(url, options);
    }
    switch (response.getResponseCode()) {
      case 200: // OK
      case 201: // POST successful
        if (response.getAllHeaders()["Content-Type"].includes("application/json")) {
          return {
            content: JSON.parse(response.getContentText()),
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
    let page = 1;
    let totalPages = 1;
    let result = [];
    let response;

    while (page <= totalPages) {
      if (method === 'get') {
        response = this._makeApiRequest(`${endpoint}?per_page=${perPage}&page=${page}`);
      } else if (method === 'post') {
        response = this._makeApiRequest(`${endpoint}?per_page=${perPage}&page=${page}`, 'post', postData);
      }

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

  /**
   * Department endpoints
   **/
  getAllDepartments(perPage=1000) {
    return this._paginateThrough('/v1/departments', perPage);
  }

  getDepartment(uuid) {
    return this._makeApiRequest(`/v1/departments/${uuid}`).content.data;
  }

  createDepartment(params) {
    if (!params.name) {
      throw new Error('Error: "name" field is required for creating a department.');
    }
    return this._makeApiRequest('/v1/departments', 'post', params).content.data;
  }

  searchDepartments(searchParams, perPage=50) {
    return this._paginateThrough('/v1/departments/search', perPage, 'post', searchParams);
  }

  /**
   * User Profile endpoints
   **/
  getAllUserProfiles(perPage = 1000, returnEnumsInJapanese=true, getDepartments=true) {
    const results = this._paginateThrough('/v1/user_profiles', perPage);

    if (returnEnumsInJapanese) {
      for (const profile of results) {
        this._convertUserProfileEnumsToJapanese(profile);
      }
    };

    if (getDepartments) {
      const departments = this.getAllDepartments();
      this._appendDepartments(results, departments);
    }
    return results;
  }

  getUserProfile(uuid, returnEnumsInJapanese=true) {
    const result = this._makeApiRequest(`/v1/user_profiles/${uuid}`);
    if (result) {
      let userProfile = result.content.data;
      if (returnEnumsInJapanese) {
        return this._convertUserProfileEnumsToJapanese(userProfile);
      }
    } else {
      return;
    }
  }

  updateUserProfile(uuid, params) {
    console.log("UPDATING " + uuid);
    return this._makeApiRequest(`/v1/user_profiles/${uuid}`, "patch", params);
  }

  deleteUserProfile(uuid) {
    return this._makeApiRequest(`/v1/user_profiles/${uuid}`, "delete");
  }

  createUserProfile(params) {
    if (!params.last_name || !params.status) {
      throw new Error('Error: "last_name" and "status" fields are required for creating a user profile.');
    }
    if (!params.email && !params.user_id) {
      throw new Error('Error: "email" or "user_id" must be provided');
    }
    console.log("CREATING " + params.last_name);
    return this._makeApiRequest('/v1/user_profiles', 'post', params).content.data;
  }

  searchUserProfiles(search_params, perPage=500, returnEnumsInJapanese=true, getDepartmentNames=true) {
    let results = this._paginateThrough('/v1/user_profiles/search', perPage, 'post', search_params);
    if (!results) {
      return [];
    }
    
    if (returnEnumsInJapanese) {
      for (const profile of results) {
        this._convertUserProfileEnumsToJapanese(profile);
      }
    }

    if (getDepartmentNames) {
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

  _convertUserProfileEnumsToJapanese(profile) {
    profile["status"] = memberStatusMappingEn2Jp[profile["status"]];
    if (profile["user_category"]) {
      profile["user_category"] = userCategoryMappingEn2Jp[profile["user_category"]];
    }
  }

  /**
   * Device endpoints
   **/
  searchDevices(searchParams, perPage=100, returnCustomFields=true, returnMdmFields=true, returnEnumsInJapanese=true) {
    let results = this._paginateThrough('/v1/devices/search', perPage, 'post', searchParams);
    if (!results) {
      return [];
    }

    for (const device of results) {
      this._flattenAssignmentFields(device);
    }

    for (const device of results) {
      if (device.source.includes("intune")) {
        device.source = "intune";
      } else {
        device.source = "josys";
      }
    }

    if (returnEnumsInJapanese) {
      for (const device of results) {
        this._convertDeviceEnumsToJapanese(device);
      }
    }

    if (returnCustomFields) {
      for (const device of results) {
        this._flattenCustomFields(device);
      }
    } else {
      for (const device of results) {
        delete device["custom_fields"];
      }
    }

    if (returnMdmFields) {
      for (const device of results) {
        this._flattenMdmFields(device);
      }
    } else {
      for (const device of results) {
        delete device["mdm_fields"];
      }
    }
    return results;
  }

  _flattenAssignmentFields(device) {
    if (device.assignment_detail) {
      device["assignee.name"] = device.assignment_detail.assignee.last_name + " " + device.assignment_detail.assignee.first_name;
      device["assignee.uuid"] = device.assignment_detail.assignee.uuid;
      device["assignee.email"] = device.assignment_detail.assignee.email;
      device["assignee.user_id"] = device.assignment_detail.assignee.user_id;
      device["assignment.start_date"] = device.assignment_detail.assignment_start_date;
    }
    delete device["assignment_detail"];
  }

  _flattenCustomFields(device) {
    if (device.custom_fields) {
      for (const column of device.custom_fields) {
        device[`custom_fields.${String(column.name)}`] = column.value;
      }
    }
    delete device["custom_fields"];
  }

  _flattenMdmFields(device) {
    if (device.mdm_fields) {
      for (const column of device.mdm_fields) {
        device[`mdm_field.${String(column.name)}`] = column.value;
      }
    }
    delete device["mdm_fields"];
  }

  getDeviceCustomFields() {
    return this._makeApiRequest('/v1/devices/custom_field_definitions').content.data.map(item => item.name);
  }

  createDevice(params) {
    return this._makeApiRequest('/v1/devices', 'post', params).content.data;
  }

  updateDevice(device_uuid, params) {
    return this._makeApiRequest(`/v1/devices/${device_uuid}`, 'patch', params).content.data;
  }

  deleteDevice(device_uuid) {
    return this._makeApiRequest(`/v1/devices/${device_uuid}`, 'delete');
  }

  assignDeviceToUser(device_uuid, postData) {
    return this._makeApiRequest(`/v1/devices/assign/${device_uuid}`, 'post', postData);
  }

  unassignDeviceFromUser(device_uuid, postData) {
    return this._makeApiRequest(`/v1/devices/unassign/${device_uuid}`, 'post', postData);
  }

  _convertDeviceEnumsToJapanese(device) {
    device["status"] = deviceStatusMappingEn2Jp[device["status"]];
  }
}

const memberStatusMappingEn2Jp = {
  "ONBOARD_INITIATED": "入社前",
  "ONBOARDED": "在籍中",
  "TEMPORARY_LEAVE":"休職中",
  "OFFBOARD_INITIATED": "退職済",
  "UNKNOWN": "不明",
  "OTHERS": "その他",
};

const memberStatusMappingJp2En = {
  "入社前": "ONBOARD_INITIATED",
  "在籍中": "ONBOARDED",
  "休職中": "TEMPORARY_LEAVE",
  "退職済": "OFFBOARD_INITIATED",
  "不明": "UNKNOWN",
  "その他": "OTHERS",
};

const userCategoryMappingEn2Jp = {
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

const userCategoryMappingJp2En = {
  "役員": "BOARD_MEMBER",
  "正社員": "FULL_TIME",
  "派遣社員":"TEMPORARY_EMPLOYEE",
  "業務委託": "SUBCONTRACTOR",
  "パート・アルバイト": "PART_TIME",
  "出向社員": "TRANSFEREE",
  "契約社員": "CONTRACTOR",
  "その他": "OTHERS",
  "システム": "SYSTEM",
}

const deviceStatusMappingEn2Jp = {
  "AVAILABLE": "在庫",
  "IN_USE": "利用中",
  "DECOMMISSIONED": "廃棄/解約",
  "UNKNOWN": "不明"
}
