const MAIN_SHEET_NAME = "認証情報";
const CREDENTIALS_JAMF_SERVER_DOMAIN = "F5";
const CREDENTIALS_JAMF_LOGIN_ID = "F6";
const CREDENTIALS_JAMF_PASSWORD = "F7";
const CREDENTIALS_HRBRAIN_SUBDOMAIN = "I14";
const CREDENTIALS_HRBRAIN_TOKEN = "I15";
const CREDENTIALS_FREEE_CLIENT_ID = "I5";
const CREDENTIALS_FREEE_CLIENT_SECRET = "I6";
const CREDENTIALS_FREEE_SCRIPT_ID = "I7";
const CREDENTIALS_FREEE_COMPANY_NAME = "I8";
const CREDENTIALS_FREEE_COMPANY_ID = "I9";
const CREDENTIALS_JOSYS_USER_KEY = "C5";
const CREDENTIALS_JOSYS_USER_SECRET = "C6";
const CREDENTIALS_LANSCOPE_TOKEN = "F14";
const OUTPUT_SHEET_NAME_NEW_EMPLOYEES = "new_employees";
const OUTPUT_SHEET_NAME_UPDATED_EMPLOYEES = "updated_employees";
const OUTPUT_SHEET_NAME_NEW_DEVICES = "new_devices";
const OUTPUT_SHEET_NAME_UPDATED_DEVICES = "updated_devices";
const OUTPUT_SHEET_NAME_UNASSIGN_ACTIONS = "unassign_actions";
const OUTPUT_SHEET_NAME_ASSIGN_ACTIONS = "assign_actions";
const OUTPUT_SHEET_NAME_JOSYS_MEMBERS = "josys_members";
const OUTPUT_SHEET_NAME_JOSYS_DEVICES = "josys_devices";
const MEMBER_SOURCE_NAME_KEY_HRBRAIN = "hrbrain";
const MEMBER_SOURCE_NAME_KEY_FREEE = "freee";
const MEMBER_SOURCE_NAME_KEY_GWS = "gws";
const DEVICE_SOURCE_NAME_KEY_CHROMEOS_DEVICES = "chromeos";
const DEVICE_SOURCE_NAME_KEY_LANSCOPE = "lanscope";
const DEVICE_SOURCE_NAME_KEY_JAMF = "jamf";
const OUTPUT_SHEET_NAME_JAMF_DEVICES = `${DEVICE_SOURCE_NAME_KEY_JAMF}_devices`;
const OUTPUT_SHEET_NAME_LANSCOPE_DEVICES = `${DEVICE_SOURCE_NAME_KEY_LANSCOPE}_devices`;
const OUTPUT_SHEET_NAME_CHROMEOS_DEVICES = `${DEVICE_SOURCE_NAME_KEY_CHROMEOS_DEVICES}_devices`;
const OUTPUT_SHEET_NAME_FREEE_EMPLOYEES = `${MEMBER_SOURCE_NAME_KEY_FREEE}_members`;
const OUTPUT_SHEET_NAME_GWS_EMPLOYEES = `${MEMBER_SOURCE_NAME_KEY_GWS}_members`;
const OUTPUT_SHEET_NAME_HRBRAIN_EMPLOYEES = `${MEMBER_SOURCE_NAME_KEY_HRBRAIN}_members`;
const DEVICE_CONFIG_SHEET_NAME = "デバイス同期設定";
const MEMBER_CONFIG_SHEET_NAME = "メンバー同期設定";
const ERROR_OUTPUT_CELL = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME).getRange("C1");
const DEVICE_SOURCE_NAME = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DEVICE_CONFIG_SHEET_NAME).getRange("C3").getValue();
const MEMBER_SOURCE_NAME = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MEMBER_CONFIG_SHEET_NAME).getRange("C3").getValue();
const SYNC_NEW_MEMBERS_FLAG = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MEMBER_CONFIG_SHEET_NAME).getRange("B15").getValue() === "新規メンバーとして同期";
const SYNC_NEW_DEVICES_FLAG = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DEVICE_CONFIG_SHEET_NAME).getRange("B16").getValue() === "新規デバイスとして同期";

function mainFuncForMembers(memberSource) {
    if (memberSource === "") {
        memberSource = MEMBER_SOURCE_NAME;
    }
    try {
        switch (memberSource) {
            case MEMBER_SOURCE_NAME_KEY_HRBRAIN:
                getHRBrainMembers();
                break;
            case MEMBER_SOURCE_NAME_KEY_FREEE:
                getFreeeMembers();
                break;
            default:
                ERROR_OUTPUT_CELL.setValue(`対応していないメンバーソースの値です。"${MEMBER_SOURCE_NAME_KEY_FREEE}"か"${MEMBER_SOURCE_NAME_KEY_HRBRAIN}"と入力してください` + ": 日時 " + new Date().toString());
                return;
        }
        getJosysMembers();
        syncMembersToJosys();
    } catch (error) {
        console.error(error);
        ERROR_OUTPUT_CELL.setValue(error + ": 日時 " + new Date().toString());
    }
}

function mainFuncForDevices(deviceSource) {
    if (deviceSource === "") {
        deviceSource = DEVICE_SOURCE_NAME;
    }
    try {
        switch (deviceSource) {
            case DEVICE_SOURCE_NAME_KEY_JAMF:
                getJamfDevices();
                break;
            case DEVICE_SOURCE_NAME_KEY_CHROMEOS_DEVICES:
                getChromeOSDevices();
                break;
            case DEVICE_SOURCE_NAME_KEY_LANSCOPE:
                getLanscopeDevices();
                break;
            default:
                ERROR_OUTPUT_CELL.setValue(`対応していないデバイスソースの値です。"${DEVICE_SOURCE_NAME_KEY_JAMF}", "${DEVICE_SOURCE_NAME_KEY_CHROMEOS_DEVICES}", "${DEVICE_SOURCE_NAME_KEY_LANSCOPE}"と入力してください` + ": 日時 " + new Date().toString());
                return;
        }
        getJosysDevices();
        syncDevicesToJosys();
    } catch (error) {
        console.error(error);
        ERROR_OUTPUT_CELL.setValue(error + ": 日時 " + new Date().toString());
    }
}

function syncMembersToJosys() {
    try {
        const [employeesToAdd, employeesToUpdate] = writeMemberDiffsToSheet();
        if (employeesToAdd.length > 0 && SYNC_NEW_MEMBERS_FLAG) {
            postNewMembersToJosys(employeesToAdd);
        }
        if (employeesToUpdate.length > 0) {
            updateMembersOnJosys(employeesToUpdate);
        }
    } catch (error) {
        console.error(error);
        ERROR_OUTPUT_CELL.setValue(error + ": 日時 " + new Date().toString());
    }
}

function syncDevicesToJosys() {
    try {
        const [devicesToAdd, devicesToUpdate, unassignActions, assignActions] = writeDeviceDiffsToSheet();
        if (devicesToAdd.length > 0 && SYNC_NEW_DEVICES_FLAG) {
            postNewDevicesToJosys(devicesToAdd);
        }
        if (devicesToUpdate.length > 0) {
            updateDevicesOnJosys(devicesToUpdate);
        }
        if (unassignActions.length > 0) {
            unassignJosysDevices(unassignActions);
        }
        if (assignActions.length > 0) {
            assignJosysDevices(assignActions);
        }
    } catch (error) {
        console.error(error);
        ERROR_OUTPUT_CELL.setValue(error + ": 日時 " + new Date().toString());
    }
}

function assignJosysDevices(assignActions) {
    const lastRange = getLastRange(OUTPUT_SHEET_NAME_ASSIGN_ACTIONS, assignActions.length);
    let results = JosysController.assignDevices(assignActions);
    lastRange.setValues(results.map(function (item) {
        return [item]; // Wrap each item in an array
    }));
}

function unassignJosysDevices(unassignActions) {
    const lastRange = getLastRange(OUTPUT_SHEET_NAME_UNASSIGN_ACTIONS, unassignActions.length);
    let results = JosysController.unassignDevices(unassignActions);
    lastRange.setValues(results.map(function (item) {
        return [item]; // Wrap each item in an array
    }));
}

function getJosysMembers(target_sheet = "") {
    if (target_sheet === "") {
        target_sheet = OUTPUT_SHEET_NAME_JOSYS_MEMBERS;
    }
    JosysController.writeJosysMembersToSheet(target_sheet);
}

function getJosysDevices(target_sheet = "") {
    if (target_sheet === "") {
        target_sheet = OUTPUT_SHEET_NAME_JOSYS_DEVICES;
    }
    JosysController.writeJosysDevicesToSheet(target_sheet);
}

function getFreeeMembers(target_sheet = "") {
    if (target_sheet === "") {
        target_sheet = OUTPUT_SHEET_NAME_FREEE_EMPLOYEES;
    }
    writeFreeeMembersToSheet(target_sheet);
}

function getHRBrainMembers(target_sheet = "") {
    if (target_sheet === "") {
        target_sheet = OUTPUT_SHEET_NAME_HRBRAIN_EMPLOYEES;
    }
    HrbrainController.writeHrbrainMembersToSheet(target_sheet);
}

function getGoogleWorkspaceMembers(target_sheet = "") {
    if (target_sheet === "") {
        target_sheet = OUTPUT_SHEET_NAME_GWS_EMPLOYEES;
    }
    writeGoogleWorkspaceMembersToSheet(target_sheet);
}

function writeMemberDiffsToSheet(sourceSheet = "", josysSheet = "") {
    if (sourceSheet === "") {
        switch (MEMBER_SOURCE_NAME) {
            case MEMBER_SOURCE_NAME_KEY_FREEE:
                sourceSheet = OUTPUT_SHEET_NAME_FREEE_EMPLOYEES;
                break;
            case MEMBER_SOURCE_NAME_KEY_HRBRAIN:
                sourceSheet = OUTPUT_SHEET_NAME_HRBRAIN_EMPLOYEES;
                break;
            default:
                ERROR_OUTPUT_CELL.setValue(`対応していないメンバーソースの値です。"${MEMBER_SOURCE_NAME_KEY_FREEE}"か"${MEMBER_SOURCE_NAME_KEY_HRBRAIN}"と入力してください` + ": 日時 " + new Date().toString());
                break;
        }
    }
    if (josysSheet === "") {
        josysSheet = OUTPUT_SHEET_NAME_JOSYS_MEMBERS;
    }

    const sourceMembers = createObjectArrayFromSheet(sourceSheet);
    const josysMembers = createObjectArrayFromSheet(josysSheet);

    const [employeesToAdd, employeesToUpdate] = ComputeMemberDiffs.computeMemberDiff(sourceMembers, josysMembers)

    Utils.clearSheet(OUTPUT_SHEET_NAME_NEW_EMPLOYEES);
    Utils.clearSheet(OUTPUT_SHEET_NAME_UPDATED_EMPLOYEES);

    if (employeesToAdd.length > 0) {
        Utils.writeObjectArrayToSheet(employeesToAdd, OUTPUT_SHEET_NAME_NEW_EMPLOYEES, 1, 1, true);
    }
    if (employeesToUpdate.length > 0) {
        Utils.writeObjectArrayToSheet(employeesToUpdate, OUTPUT_SHEET_NAME_UPDATED_EMPLOYEES, 1, 1, true);
    }
    return [employeesToAdd, employeesToUpdate];
}

function writeDeviceDiffsToSheet(sourceSheet = "", josysSheet = "") {
    if (sourceSheet === "") {
        switch (DEVICE_SOURCE_NAME) {
            case DEVICE_SOURCE_NAME_KEY_CHROMEOS_DEVICES:
                sourceSheet = OUTPUT_SHEET_NAME_CHROMEOS_DEVICES;
                break;
            case DEVICE_SOURCE_NAME_KEY_JAMF:
                sourceSheet = OUTPUT_SHEET_NAME_JAMF_DEVICES;
                break;
            case DEVICE_SOURCE_NAME_KEY_LANSCOPE:
                sourceSheet = OUTPUT_SHEET_NAME_LANSCOPE_DEVICES;
                break;
            default:
                ERROR_OUTPUT_CELL.setValue(`対応していないデバイスソースの値です。"${DEVICE_SOURCE_NAME_KEY_JAMF}", "${DEVICE_SOURCE_NAME_KEY_CHROMEOS_DEVICES}", "${DEVICE_SOURCE_NAME_KEY_LANSCOPE}"と入力してください` + ": 日時 " + new Date().toString());
                break;
        }
    }

    if (josysSheet === "") {
        josysSheet = OUTPUT_SHEET_NAME_JOSYS_DEVICES;
    }

    const sourceDevices = createObjectArrayFromSheet(sourceSheet);
    const josysDevices = createObjectArrayFromSheet(josysSheet);

    const [devicesToAdd, devicesToUpdate, unassignActions, assignActions] = ComputeDeviceDiffs.computeDeviceDiff(sourceDevices, josysDevices);

    Utils.clearSheet(OUTPUT_SHEET_NAME_NEW_DEVICES);
    Utils.clearSheet(OUTPUT_SHEET_NAME_UPDATED_DEVICES);
    Utils.clearSheet(OUTPUT_SHEET_NAME_ASSIGN_ACTIONS);
    Utils.clearSheet(OUTPUT_SHEET_NAME_UNASSIGN_ACTIONS);

    if (devicesToAdd.length > 0) {
        Utils.writeObjectArrayToSheet(devicesToAdd, OUTPUT_SHEET_NAME_NEW_DEVICES, 1, 1, true);
    }
    if (devicesToUpdate.length > 0) {
        Utils.writeObjectArrayToSheet(devicesToUpdate, OUTPUT_SHEET_NAME_UPDATED_DEVICES, 1, 1, true);
    }
    if (assignActions.length > 0) {
        Utils.writeObjectArrayToSheet(assignActions, OUTPUT_SHEET_NAME_ASSIGN_ACTIONS, 1, 1, true);
    }
    if (unassignActions.length > 0) {
        Utils.writeObjectArrayToSheet(unassignActions, OUTPUT_SHEET_NAME_UNASSIGN_ACTIONS, 1, 1, true);
    }
    return [devicesToAdd, devicesToUpdate, unassignActions, assignActions];
}

function postNewDevicesToJosys(devicesToAdd) {
    const lastRange = getLastRange(OUTPUT_SHEET_NAME_NEW_DEVICES, devicesToAdd.length);
    let results = JosysController.uploadDevices(devicesToAdd);
    lastRange.setValues(results.map(function (item) {
        return [item]; // Wrap each item in an array
    }));
}

function updateDevicesOnJosys(devicesToUpdate) {
    const lastRange = getLastRange(OUTPUT_SHEET_NAME_UPDATED_DEVICES, devicesToUpdate.length);
    let results = JosysController.updateDevices(devicesToUpdate);
    lastRange.setValues(results.map(function (item) {
        return [item]; // Wrap each item in an array
    }));
}

function postNewMembersToJosys(employeesToAdd) {
    const lastRange = getLastRange(OUTPUT_SHEET_NAME_NEW_EMPLOYEES, employeesToAdd.length);
    let results = JosysController.uploadMembers(employeesToAdd);
    lastRange.setValues(results.map(function (item) {
        return [item]; // Wrap each item in an array
    }));
}

function updateMembersOnJosys(employeesToUpdate) {
    const lastRange = getLastRange(OUTPUT_SHEET_NAME_UPDATED_EMPLOYEES, employeesToUpdate.length);
    let results = JosysController.updateMembers(employeesToUpdate);
    lastRange.setValues(results.map(function (item) {
        return [item]; // Wrap each item in an array
    }));
}

function getJamfDevices(target_sheet = "") {
    if (target_sheet === "") {
        target_sheet = OUTPUT_SHEET_NAME_JAMF_DEVICES;
    }
    writeJamfDevicesToSheet(target_sheet);
}

function getLanscopeDevices(target_sheet = "") {
    if (target_sheet === "") {
        target_sheet = OUTPUT_SHEET_NAME_LANSCOPE_DEVICES;
    }
    writeLanscopeDevicesToSheet(target_sheet);
}

function getChromeOSDevices(target_sheet = "") {
    if (target_sheet === "") {
        target_sheet = OUTPUT_SHEET_NAME_CHROMEOS_DEVICES;
    }
    writeChromeosDevicesToSheet(target_sheet);
}

function getLastRange(sheetName, length) {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    return sheet.getRange(2, sheet.getLastColumn() + 1, length);
}

function createObjectArrayFromSheet(sheetName) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
        return;
    }
    const columnRowNum = 2;
    const dataStartRow = columnRowNum + 1;
    const columns = Utils.getColumnsFromSheet(sheetName, columnRowNum);
    const lastRowNum = Utils.getMaxRowNumAtIDColumn(sheetName, columns);
    console.log(lastRowNum);
    let sheetData = sheet.getRange(dataStartRow, 1, lastRowNum - dataStartRow + 1, columns.length).getDisplayValues();

    data = Utils.createObjectArrayFrom2dArray(columns, sheetData);
    return data;
}

function clearAllOutputSheets() {
    let sheets = [OUTPUT_SHEET_NAME_CHROMEOS_DEVICES, OUTPUT_SHEET_NAME_FREEE_EMPLOYEES, OUTPUT_SHEET_NAME_GWS_EMPLOYEES, OUTPUT_SHEET_NAME_HRBRAIN_EMPLOYEES, OUTPUT_SHEET_NAME_JAMF_DEVICES, OUTPUT_SHEET_NAME_JOSYS_DEVICES, OUTPUT_SHEET_NAME_JOSYS_MEMBERS, OUTPUT_SHEET_NAME_LANSCOPE_DEVICES];
    sheets.forEach(sheetName => {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (sheet.getLastRow() !== 0) {
            sheet.getRange(3, 1, sheet.getLastRow(), Utils.getLastColumnNumber(sheet, 1)).clearContent();
        }
    });

    sheets = [OUTPUT_SHEET_NAME_NEW_DEVICES, OUTPUT_SHEET_NAME_NEW_EMPLOYEES, OUTPUT_SHEET_NAME_UPDATED_DEVICES, OUTPUT_SHEET_NAME_UPDATED_EMPLOYEES];
    sheets.forEach(sheetName => {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        sheet.clearContents();
    });
}
