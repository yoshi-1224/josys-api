let josysApiClient = null;

function getJosysApiCredentials() {
  const authSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME);
  const apiUserKey = authSheet.getRange(CREDENTIALS_JOSYS_USER_KEY).getValue();
  const apiUserSecret = authSheet.getRange(CREDENTIALS_JOSYS_USER_SECRET).getValue();
  return [apiUserKey, apiUserSecret];
}

function getJosysApiClient() {
  if (josysApiClient) {
    return josysApiClient;
  }
  const [apiUserKey, apiUserSecret] = getJosysApiCredentials();
  josysApiClient = new JosysApiClient(apiUserKey, apiUserSecret);
  return josysApiClient;
}

function writeJosysMembersToSheet(sheetName, apiHeaderRow=1) {
  const apiClient = getJosysApiClient();
  const params = {
    "status": {
        "operator": "equals",
        "value": ["ONBOARDED", "ONBOARD_INITIATED"]
    }
  }
  const results = apiClient.searchUserProfiles(params, 1000);
  if (!results) {
    return;
  }
  const columns = Utils.getColumnsFromSheet(sheetName, apiHeaderRow);
  const rowToWriteFrom = apiHeaderRow + 2;
  Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, rowToWriteFrom, 1, true);
}

function writeJosysDevicesToSheet(sheetName, apiHeaderRow=1) {
  const apiClient = getJosysApiClient();
  const params = {
    "status": {
      "operator": "equals",
      "value": ["AVAILABLE", "IN_USE", "DECOMMISSIONED", "UNKNOWN"]
    }
  }
  const results = apiClient.searchDevices(params, 1000);
  if (!results) {
    return;
  }
  const columns = Utils.getColumnsFromSheet(sheetName, apiHeaderRow);
  const rowToWriteFrom = apiHeaderRow + 2;
  Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, rowToWriteFrom, 1, true);
}

function uploadMembers(members) {
  const apiClient = getJosysApiClient();
  const results = [];
  ensureDateFormatInJosysFormat(members);
  for (const e of members) {
    e["status"] = memberStatusMappingJp2En[e["status"]];
    if(e["user_category"]) {
      e["user_category"] = userCategoryMappingJp2En[e["user_category"]];
    }
    try {
      apiClient.createUserProfile(e);
      results.push("SUCCESSFUL");
    } catch (error) {
      results.push(error);
    }
  }
  return results;
}

function updateMembers(members) {
  const apiClient = getJosysApiClient();
  const results = [];
  ensureDateFormatInJosysFormat(members);
  for (const e of members) {
    if(e["status"]) {
      e["status"] = memberStatusMappingJp2En[e["status"]];
    }
    if(e["user_category"]) {
      e["user_category"] = userCategoryMappingJp2En[e["user_category"]];
    }
    try {
      let uuid = e["uuid"];
      delete e["uuid"];
      let res = apiClient.updateUserProfile(uuid, e);
      if (!res) {
        results.push("404 NOT FOUND");
      } else {
        results.push("SUCCESSFUL");
      }
    } catch (error) {
      results.push(error);
    }
  }
  return results;
}

function uploadDevices(devices) {
  const apiClient = getJosysApiClient();
  const results = [];
  for (const d of devices) {
    try {
      apiClient.createDevice(d);
      results.push("SUCCESSFUL");
    } catch (error) {
      results.push(error);
    }
  }
  return results;
}

function updateDevices(devices) {
  const apiClient = getJosysApiClient();
  const results = [];
  for (const d of devices) {
    try {
      let uuid = d["uuid"];
      delete d["uuid"];
      let res = apiClient.updateDevice(uuid, d);
      if (!res) {
        results.push("404 NOT FOUND");
      } else {
        results.push("SUCCESSFUL");
      }
    } catch (error) {
      results.push(error);
    }
  }
  return results;
}

function synchronizeDepartments(sourceDepartments) {
  try {
    const currentDepartments = apiClient.getAllDepartments();
    var josysDeptMap = buildSystemBDeptPaths(currentDepartments);
    var sourceDeptHierarchy = buildDeptHierarchy(sourceDepartments);
    createDepartmentsRecursively(sourceDeptHierarchy, josysDeptMap, apiClient);
  } catch (error) {
    Logger.log('An error occurred during synchronization: ' + error);
  }
  return josysDeptMap;
}

function buildSystemBDeptPaths(systemBDepartments) {
  var deptMapByUUID = {};
  var deptPaths = {};

  systemBDepartments.forEach(function(dept) {
    deptMapByUUID[dept.uuid] = dept;
  });

  systemBDepartments.forEach(function(dept) {
    var path = [];
    var currentDept = dept;
    while (currentDept) {
      path.unshift(currentDept.name);
      if (currentDept.parent_department_uuid) {
        currentDept = deptMapByUUID[currentDept.parent_department_uuid];
      } else {
        currentDept = null;
      }
    }
    var fullPath = path.join('/');
    deptPaths[fullPath] = {
      uuid: dept.uuid,
      code: dept.code,
      parent_department_code: dept.parent_department_code,
      parent_department_uuid: dept.parent_department_uuid
    };
  });

  return deptPaths;
}

function buildDeptHierarchy(systemADepartments) {
  var deptHierarchy = {};
  systemADepartments.forEach(function(path) {
    var parts = path.split('/');
    parts.reduce(function(acc, part, index) {
      var fullPath = parts.slice(0, index + 1).join('/');
      if (!acc[part]) {
        acc[part] = {
          '__fullPath': fullPath,
          '__name': part,
          '__parentPath': parts.slice(0, index).join('/')
        };
      }
      return acc[part];
    }, deptHierarchy);
  });
  return deptHierarchy;
}

function createDepartmentsRecursively(node, systemBDeptMap, apiClient) {
  for (var key in node) {
    if (node.hasOwnProperty(key) && !key.startsWith('__')) {
      var deptNode = node[key];
      var fullPath = deptNode.__fullPath;
      var deptName = deptNode.__name;
      var parentPath = deptNode.__parentPath;

      if (!systemBDeptMap[fullPath]) {
        var parentDept = parentPath ? systemBDeptMap[parentPath] : null;
        var payload = {
          name: deptName,
          code: deptName
        };
        if (parentDept) {
          payload[parent_department_code] = parentDept.code;
          payload[parent_department_uuid] = parentDept.uuid;
        };
        var newDept = apiClient.createDepartment(payload);
        systemBDeptMap[fullPath] = {
          uuid: newDept.uuid,
          code: newDept.code,
          parent_department_code: newDept.parent_department_code,
          parent_department_uuid: newDept.parent_department_uuid
        };
      }
      createDepartmentsRecursively(deptNode, systemBDeptMap);
    }
  }
}

function ensureDateFormatInJosysFormat (members) {
  members.forEach(member => {
      if(member.hasOwnProperty("start_date") && member["start_date"] !== "") {
          console.log(member["start_date"]);
          member["start_date"] = Utils.formatDateToJosysFormat(new Date(member["start_date"]));
          console.log(member["start_date"]);
      }
      if(member.hasOwnProperty("end_date") && member["end_date"] !== "") {
          console.log(member["end_date"]);
          member["end_date"] = Utils.formatDateToJosysFormat(new Date(member["end_date"]));
          console.log(member["end_date"]);
      }
  })
}