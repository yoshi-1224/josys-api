function writeJosysMembersToSheet(apiClient, sheetName, headerRow=1) {
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

function writeJosysDevicesToSheet(apiClient, sheetName, headerRow=1) {
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

function uploadMembers(apiClient, employees) {
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

function updateMembers(apiClient, employees) {
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