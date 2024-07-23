const MAIN_SHEET_NAME = "認証情報";
const NEW_EMPLOYEES_OUTPUT_SHEET_NAME = "new_employees";
const UPDATED_EMPLOYEES_OUTPUT_SHEET_NAME = "updated_employees";
const NEW_DEVICES_OUTPUT_SHEET_NAME = "new_devices";
const UPDATED_DEVICES_OUTPUT_SHEET_NAME = "updated_devices";
const JOSYS_MEMBERS_OUTPUT_SHEET_NAME = "josys_members";
const JOSYS_DEVICES_OUTPUT_SHEET_NAME = "josys_devices";
const JAMF_DEVICES_OUTPUT_SHEET_NAME = "jamf_devices";
const DEVICE_CONFIG_SHEET_NAME = "デバイス同期設定";
const FREEE_EMPLOYEES_OUTPUT_SHEET_NAME = "freee_members";
const errorOutputCell = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME).getRange("C1");

function getJosysCredentials() {
  const worksheet = SpreadsheetApp.getActiveSpreadsheet()
  const authSheet = worksheet.getSheetByName(MAIN_SHEET_NAME);
  const apiUserKey = authSheet.getRange("C6").getValue();
  const apiUserSecret = authSheet.getRange("C7").getValue();
  return [apiUserKey, apiUserSecret];
}

function mainFuncForMembers() {
  try {
    getJosysMembers();
    getFreeeMembers();
  } catch (error) {
    console.error(error);
    errorOutputCell.setValue(error  + ": 日時 " + new Date().toString());
  }
  syncMembersToJosys();
}

function mainFuncForDevies() {
  try {
    getJosysDevices();
    getJamfDevices();
  } catch (error) {
    console.error(error);
    errorOutputCell.setValue(error  + ": 日時 " + new Date().toString());
  }
  syncDevicesToJosys();
}

function syncMembersToJosys() {
  try {
    const [employeesToAdd, employeesToUpdate] = writeMemberDiffsToSheet();
    const [apiUserKey, apiUserSecret] = getJosysCredentials();
    const josysApiClient = new JosysApiClient(apiUserKey, apiUserSecret);
    if (employeesToAdd.length > 0) {
      postNewMembersToJosys(josysApiClient, employeesToAdd);
    }
    if (employeesToUpdate.length > 0) {
      updateMembersOnJosys(josysApiClient, employeesToUpdate);
    }
  } catch (error) {
    console.error(error);
    errorOutputCell.setValue(error  + ": 日時 " + new Date().toString());
  }
}

function syncDevicesToJosys() {
  try {
    const [devicesToAdd, devicesToUpdate] = writeDeviceDiffsToSheet();
    const [apiUserKey, apiUserSecret] = getJosysCredentials();
    const josysApiClient = new JosysApiClient(apiUserKey, apiUserSecret);
    if (devicesToAdd.length > 0) {
      postNewDevicesToJosys(josysApiClient, devicesToAdd);
    }
    if (devicesToUpdate.length > 0) {
      updateDevicesOnJosys(josysApiClient, devicesToUpdate);
    }
  } catch (error) {
    console.error(error);
    errorOutputCell.setValue(error  + ": 日時 " + new Date().toString());
  }
}

function getJosysMembers(target_sheet="") {
  if (target_sheet === "") {
    target_sheet = JOSYS_MEMBERS_OUTPUT_SHEET_NAME;
  }
  const [apiUserKey, apiUserSecret] = getJosysCredentials();
  const josysApiClient = new JosysApiClient(apiUserKey, apiUserSecret);
  writeJosysMembersToSheet(josysApiClient, target_sheet);
}

function getJosysDevices(target_sheet="") {
  if (target_sheet === "") {
    target_sheet = JOSYS_DEVICES_OUTPUT_SHEET_NAME;
  }
   const [apiUserKey, apiUserSecret] = getJosysCredentials();
  const josysApiClient = new JosysApiClient(apiUserKey, apiUserSecret);
  writeJosysDevicesToSheet(josysApiClient, target_sheet);
}

function getFreeeMembers(target_sheet="") {
  if (target_sheet === "") {
    target_sheet = FREEE_EMPLOYEES_OUTPUT_SHEET_NAME;
  }
  writeFreeeMembersToSheet(target_sheet, 1);
}

function writeMemberDiffsToSheet(sourceSheet="", josysSheet="") {
  if (sourceSheet === "") {
    sourceSheet = FREEE_EMPLOYEES_OUTPUT_SHEET_NAME;
  }

  if (josysSheet === "") {
    josysSheet = JOSYS_MEMBERS_OUTPUT_SHEET_NAME;
  }

  const sourceMembers = createObjectArrayFromSheet(sourceSheet);
  const josysMembers = createObjectArrayFromSheet(josysSheet);

  const [employeesToAdd, employeesToUpdate] = ComputeDiffs.computeDiff(sourceMembers, josysMembers);

  Utils.clearSheet(NEW_EMPLOYEES_OUTPUT_SHEET_NAME);
  Utils.clearSheet(UPDATED_EMPLOYEES_OUTPUT_SHEET_NAME);

  if (employeesToAdd.length > 0) {
    Utils.writeObjectArrayToSheet(employeesToAdd, NEW_EMPLOYEES_OUTPUT_SHEET_NAME, 1, 1, true);
  }
  if (employeesToUpdate.length > 0) {
    Utils.writeObjectArrayToSheet(employeesToUpdate, UPDATED_EMPLOYEES_OUTPUT_SHEET_NAME, 1, 1, true);
  }
  return [employeesToAdd, employeesToUpdate];
}

function writeDeviceDiffsToSheet(sourceSheet="", josysSheet="") {
  if (sourceSheet === "") {
    sourceSheet = JAMF_DEVICES_OUTPUT_SHEET_NAME;
  }

  if (josysSheet === "") {
    josysSheet = JOSYS_DEVICES_OUTPUT_SHEET_NAME;
  }

  const sourceDevices = createObjectArrayFromSheet(sourceSheet);
  const josysDevices = createObjectArrayFromSheet(josysSheet);

  const [devicesToAdd, devicesToUpdate] = ComputeDeviceDiffs.computeDeviceDiff(sourceDevices, josysDevices);

  Utils.clearSheet(NEW_DEVICES_OUTPUT_SHEET_NAME);
  Utils.clearSheet(UPDATED_DEVICES_OUTPUT_SHEET_NAME);

  if (devicesToAdd.length > 0) {
    
    Utils.writeObjectArrayToSheet(devicesToAdd, NEW_DEVICES_OUTPUT_SHEET_NAME, 1, 1, true);
  }
  if (devicesToUpdate.length > 0) {
    Utils.writeObjectArrayToSheet(devicesToUpdate, UPDATED_DEVICES_OUTPUT_SHEET_NAME, 1, 1, true);
  }

  return [devicesToAdd, devicesToUpdate];
}

function postNewDevicesToJosys(josysApiClient, devicesToAdd) {
  const lastRange = getLastRange(NEW_DEVICES_OUTPUT_SHEET_NAME, devicesToAdd.length);
  let results = uploadDevices(josysApiClient, devicesToAdd);
  lastRange.setValues(results.map(function (item) {
    return [item]; // Wrap each item in an array
  }));
}

function updateDevicesOnJosys(josysApiClient, devicesToUpdate) {
  const lastRange = getLastRange(UPDATED_DEVICES_OUTPUT_SHEET_NAME, devicesToUpdate.length);
  let results = updateDevices(josysApiClient, devicesToUpdate);
  lastRange.setValues(results.map(function (item) {
    return [item]; // Wrap each item in an array
  }));
}

function postNewMembersToJosys(josysApiClient, employeesToAdd) {
    const lastRange = getLastRange(NEW_EMPLOYEES_OUTPUT_SHEET_NAME, employeesToAdd.length);
    let results = uploadMembers(josysApiClient, employeesToAdd);
    lastRange.setValues(results.map(function (item) {
      return [item]; // Wrap each item in an array
    }));
}

function updateMembersOnJosys(josysApiClient, employeesToUpdate) {
  const lastRange = getLastRange(UPDATED_EMPLOYEES_OUTPUT_SHEET_NAME, employeesToUpdate.length);
  let results = updateMembers(josysApiClient, employeesToUpdate);
  lastRange.setValues(results.map(function (item) {
    return [item]; // Wrap each item in an array
  }));
}

function getJamfDevices(target_sheet="") {
  if (target_sheet === "") {
    target_sheet = JAMF_DEVICES_OUTPUT_SHEET_NAME;
  }
  writeJamfDevicesToSheet(target_sheet);
}

function getLastRange(sheetName, length) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  return sheet.getRange(2, sheet.getLastColumn() + 1, length);
}

function createObjectArrayFromSheet(sheetName) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
      return;
  }
  const startRow = 2;
  let sheetData = sheet.getRange(startRow, 1, sheet.getLastRow() - startRow + 1, sheet.getLastColumn()).getDisplayValues();
  let columns = sheetData.shift();
  data = Utils.createObjectArrayFrom2dArray(columns, sheetData);
  return data;
}
