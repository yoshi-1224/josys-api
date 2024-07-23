let josysApiClient = null;

function getJosysApiCredentials() {
  const authSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME);
  const apiUserKey = authSheet.getRange("C6").getValue();
  const apiUserSecret = authSheet.getRange("C7").getValue();
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

function writeJosysMembersToSheet(sheetName, headerRow=1) {
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
  const columns = Utils.getColumnsFromSheet(sheetName, headerRow);
  const writeFromRow = headerRow + 2;
  Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, writeFromRow, 1, true);
}

function writeJosysDevicesToSheet(sheetName, headerRow=1) {
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
  const columns = Utils.getColumnsFromSheet(sheetName, headerRow);
  const writeFromRow = headerRow + 2;
  Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, writeFromRow, 1, true);
}

function uploadMembers(employees) {
  const apiClient = getJosysApiClient();
  const results = [];
  for (const e of employees) {
    e["status"] = statusMappingJP2EN[e["status"]];
    try {
      apiClient.createUserProfile(e);
      results.push("SUCCESSFUL");
    } catch (error) {
      results.push(error);
    }
  }
  return results;
}

function updateMembers(employees) {
  const apiClient = getJosysApiClient();
  const results = [];
  for (const e of employees) {
    if(e["status"]) {
      e["status"] = statusMappingJP2EN[e["status"]];
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