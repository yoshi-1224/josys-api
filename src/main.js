const errorOutputCell = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("認証情報").getRange("F2");
const newEmployeeSheetName = "new_employees";
const updatedEmployeeSheetName = "updated_employees";
const josysTargetSheetName = "josys";
const freeeTargetSheetName = "freee";

function main() {
  try {
    getJosysMembers();
    getFreeeMembers();
    syncMembersToJosys();
  } catch (error) {
    console.error(error);
    errorOutputCell.setValue(error  + ": 同期日時 " + new Date().toString());
  }
}

function getJosysMembers(target_sheet="") {
  if (target_sheet === "") {
    target_sheet = josysTargetSheetName;
  }
   const [apiUserKey, apiUserSecret] = getJosysCredentials();
  const josysApp = new JosysApi(apiUserKey, apiUserSecret);
  writeJosysMembersToSheet(josysApp, target_sheet, 1);
}

function getFreeeMembers(target_sheet="") {
  if (target_sheet === "") {
    target_sheet = freeeTargetSheetName;
  }
  const [freeeClientId, freeeClientSecret] = getFreeeCredentials();
  const freeeApp = new FreeeApi(freeeClientId, freeeClientSecret);
  writeFreeeMembersToSheet(target_sheet, 1, getFreeCompanyId(), freeeApp);
}

function syncMembersToJosys(freee_sheet="", josys_sheet="") {
  if (freee_sheet === "") {
    freee_sheet = freeeTargetSheetName;
  }

  if (josys_sheet === "") {
    josys_sheet = josysTargetSheetName;
  }

  const [employeesToAdd, employeesToUpdate] = ComputeDiffs.computeDiff(freee_sheet, josys_sheet);
  const [apiUserKey, apiUserSecret] = getJosysCredentials();
  const josysApp = new JosysApi(apiUserKey, apiUserSecret);
  let lastRange, results;
  if (employeesToAdd.length > 0) {
    Utils.clearSheet(newEmployeeSheetName);
    lastRange = writeEmployeeDiffsToSheet(employeesToAdd, newEmployeeSheetName);
    results = uploadNewMembers(josysApp, employeesToAdd);
    lastRange.setValues(results);
  }

  if (employeesToUpdate.length > 0) {
    Utils.clearSheet(updatedEmployeeSheetName);
    lastRange = writeEmployeeDiffsToSheet(employeesToUpdate, updatedEmployeeSheetName);
    results = updateMembers(josysApp, employeesToUpdate);
    lastRange.setValues(results);
  }
  errorOutputCell.setValue("メンバー情報の連携に成功しました: 同期日時 " + new Date().toString());
}

function uploadNewMembers(app, employeesToAdd) {
  const results = _uploadMembers(app, employeesToAdd);
  return results.map(function (item) {
    return [item]; // Wrap each item in an array
  });
}

function updateMembers(app, employeesToUpdate) {
  const results = _updateMembers(app, employeesToUpdate);
  return results.map(function (item) {
    return [item]; // Wrap each item in an array
  });
}

function writeEmployeeDiffsToSheet(newEmployees, outputSheetName) {
  const keys = Utils.extractUniqueKeys(newEmployees);
  const data = Utils.createOrdered2dArrray(newEmployees, keys);
  data.unshift(keys);
  Utils.writeArrayToSheet(data, outputSheetName, 1, 1);
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(outputSheetName);
  return sheet.getRange(2, sheet.getLastColumn() + 1, newEmployees.length);
}