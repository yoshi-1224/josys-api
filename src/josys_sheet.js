function getJosysCredentials() {
  const worksheet = SpreadsheetApp.getActiveSpreadsheet()
  const authSheet = worksheet.getSheetByName("認証情報");
  const apiUserKey = authSheet.getRange("C6").getValue();
  const apiUserSecret = authSheet.getRange("C7").getValue();
  return [apiUserKey, apiUserSecret];
}

function writeJosysMembersToSheet(app, sheetName="josys", headerRow=1) {
  let params = {
    "status": {
        "operator": "equals",
        "value": ["ONBOARDED", "ONBOARD_INITIATED"]
    }
  }
  const results = app.searchUserProfiles(params, 1000);
  if (!results) {
    return;
  }
  const columns = Utils.getColumnsFromSheet(sheetName, headerRow);
  Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, headerRow + 2, 1, true);
}

function _uploadMembers(app, employees) {
  const results = [];
  for (const e of employees) {
    e["status"] = statusMappingJP2EN[e["status"]];    
    try {
      app.createUserProfile(e);
      results.push("SUCCESSFUL");
    } catch (error) {
      results.push(error);
    }
  }
  return results;
}

function _updateMembers(app, employees) {
  const results = [];
  for (const e of employees) {
    if(e["status"]) {
      e["status"] = statusMappingJP2EN[e["status"]];
    } 
    try {
      let uuid = e["uuid"];
      delete e["uuid"];
      let res = app.updateUserProfile(uuid, e);
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