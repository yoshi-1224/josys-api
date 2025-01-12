const JOSYS_DEVICE_COLUMNS_ROW_NUM = 6;
const MDM_DEVICE_COLUMNS_ROW_NUM = 7;
const START_COL_OF_DEVICE_COLUMNS = 3;
const MATCH_KEY_RANGE = "B12";
const ASSET_NUMBER_COLUMN_RANGE = "B19";

const JosysDeviceDefaultColumnsJP2EN = {
    "ID": "uuid",
    "資産番号": "asset_number",
    "シリアル番号": "serial_number",
    "ステータス": "status",
    "メーカー": "manufacturer",
    "型番": "model_number",
    "デバイスの種類": "device_type",
    "デバイス名": "model_name",
    "OS": "operating_system",
    "調達日": "start_date",
    "廃棄日/解約日": "end_date",
    "調達方法": "device_procurement",
    "メモ": "additional_device_information",
    // "ソース": "source", // not writable
    // 利用者関連はTODO
};

class ComputeDeviceDiffs {
    static readColumnMappingsFromSheet(sheetName) {
        if (sheetName === "") {
            sheetName = DEVICE_CONFIG_SHEET_NAME;
        }
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
            throw new Error(`Sheet with name ${sheetName} not found`);
        }
        const lastColumn = ComputeDeviceDiffs.getLastColumnNumber(sheet, JOSYS_DEVICE_COLUMNS_ROW_NUM);
        let range = sheet.getRange(JOSYS_DEVICE_COLUMNS_ROW_NUM, START_COL_OF_DEVICE_COLUMNS, 1, lastColumn - START_COL_OF_DEVICE_COLUMNS + 1);
        let josysColumns = range.getValues().flat();
        range = sheet.getRange(MDM_DEVICE_COLUMNS_ROW_NUM, START_COL_OF_DEVICE_COLUMNS, 1, lastColumn - START_COL_OF_DEVICE_COLUMNS + 1);
        let mdmColumns = range.getValues().flat();
        return [josysColumns, mdmColumns];
    }

    static readMatchKeyFromSheet(sheetName) {
        if (sheetName === "") {
            sheetName = DEVICE_CONFIG_SHEET_NAME;
        }
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
            throw new Error(`Sheet with name ${sheetName} not found`);
        }
        return sheet.getRange(MATCH_KEY_RANGE).getValue();
    }

    static readAssetNumberColumnFromSheet(sheetName) {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
            throw new Error(`Sheet with name ${sheetName} not found`);
        }

        if (!SYNC_NEW_DEVICES_FLAG) {
            return null;
        }

        return sheet.getRange(ASSET_NUMBER_COLUMN_RANGE).getValue();
    }

    static computeDeviceDiff(sourceDevices, josysDevices) {
        const [josysColumns, sourceColumns] = ComputeDeviceDiffs.readColumnMappingsFromSheet(DEVICE_CONFIG_SHEET_NAME);
        const assetNumberColumn = ComputeDeviceDiffs.readAssetNumberColumnFromSheet(DEVICE_CONFIG_SHEET_NAME);
        console.log(`asetNumberColumn = ${assetNumberColumn}`);
        let assetNumberColumnValues = [];
        if (assetNumberColumn) {
            assetNumberColumnValues = sourceDevices.map(device => device[assetNumberColumn]);
        }
        const matchKey = ComputeDeviceDiffs.readMatchKeyFromSheet(DEVICE_CONFIG_SHEET_NAME);
        console.log(`match key = ${matchKey}`);
        const josysCol2SourceCol = {};
        for (let i = 0; i < josysColumns.length; i++) {
            josysCol2SourceCol[josysColumns[i]] = sourceColumns[i];
        }

        console.log(`sourceDevices`);
        console.log(sourceDevices);
        console.log(`josysDevices`);
        console.log(josysDevices);
        console.log(`Column Mappings:`);
        console.log(josysCol2SourceCol);
        let [devicesToAdd, devicesToUpdate, unassignActions, assignActions] = ComputeDeviceDiffs.compareAndCategorize(sourceDevices, josysDevices, josysCol2SourceCol, matchKey, assetNumberColumnValues);
        devicesToAdd = ComputeDeviceDiffs.dropEmptyColumns(devicesToAdd); // even drop assignments columns too
        console.log("ComputeDeviceDiffs: EntriesToAdd");
        console.log(devicesToAdd);
        console.log("ComputeDeviceDiffs: EntriesToUpdate");
        console.log(devicesToUpdate);
        ComputeDeviceDiffs.modifyObjectsByKeyMapping(devicesToAdd, JosysDeviceDefaultColumnsJP2EN);
        ComputeDeviceDiffs.modifyObjectsByKeyMapping(devicesToUpdate, JosysDeviceDefaultColumnsJP2EN);
        return [devicesToAdd, devicesToUpdate, unassignActions, assignActions];
    }

    static dropEmptyColumns(devices) {
        return devices.map(device => {
            for (const key in device) {
                if (device[key] === "") {
                    delete device[key];
                }
            }
            return device;
        });
    }

    static compareAndCategorize(sourceDevices, josysDevices, josysCol2SourceCol, matchKey, assetNumberColumnValues) {
        let entriesToAdd = [];
        let entriesToUpdate = [];
        let unassignActions = [];
        let assignActions = [];

        const josysDevicesByMatchValue = josysDevices.reduce((acc, obj) => {
            if (obj[matchKey] && obj[matchKey] !== "") {
                acc[obj[matchKey]] = obj;
            }
            return acc;
        }, {});

        const sourceCol2JosysCol = {};
        Object.keys(josysCol2SourceCol).forEach(key => {
            sourceCol2JosysCol[josysCol2SourceCol[key]] = key;
        });

        const sourceMatchKey = josysCol2SourceCol[matchKey];
        sourceDevices.forEach((srcDevice, index) => {
            const josysDevice = josysDevicesByMatchValue[srcDevice[sourceMatchKey]];
            if (!josysDevice) {
                if (assetNumberColumnValues.length > 0) {
                    const newDevice = {};
                    Object.keys(josysCol2SourceCol).forEach(josysColumn => {
                        const sourceColumn = josysCol2SourceCol[josysColumn];
                        let sourceValue = srcDevice[sourceColumn];
                        newDevice[josysColumn] = sourceValue;
                    });
                    delete newDevice["ステータス"];
                    delete newDevice["利用者メールアドレス"];
                    delete newDevice["利用開始日"];
                    entriesToAdd.push({ ...newDevice, "資産番号": assetNumberColumnValues[index] });
                }
            } else {
                const diffObj = { "ID": josysDevice.ID };
                let isDifferent = false;
                Object.keys(josysCol2SourceCol).forEach(josysColumn => {
                    const josysValue = josysDevice[josysColumn];
                    const sourceColumn = josysCol2SourceCol[josysColumn];
                    let sourceValue = srcDevice[sourceColumn];
                    if (sourceValue !== josysValue) {
                        isDifferent = true;
                        diffObj[josysColumn] = sourceValue;
                    }       
                });
                if (isDifferent) {
                    if (!("利用開始日" in josysCol2SourceCol) || !("利用者メールアドレス" in josysCol2SourceCol)) {
                        // Do nothing if both keys are not in josysCol2SourceCol
                    } else {
                        let statusColName = josysCol2SourceCol["ステータス"];
                        let assignmentStartDateName = josysCol2SourceCol["利用開始日"];
                        let assigneeEmail = josysCol2SourceCol["利用者メールアドレス"];
                        if (josysDevice["ステータス"] === "利用中") {
                            if (srcDevice[statusColName] !== "利用中" && !srcDevice[assignmentStartDateName] && !srcDevice[assigneeEmail]) {
                                unassignActions.push({ "ID": diffObj["ID"], "target_status": srcDevice[statusColName] });
                                delete diffObj["ステータス"];
                            } else if (srcDevice[statusColName] === "利用中") {
                                if (srcDevice[assigneeEmail] !== josysDevice["利用者メールアドレス"]) {
                                    delete diffObj["ステータス"];
                                    unassignActions.push({ "ID": diffObj["ID"], "target_status": "在庫" });
                                    assignActions.push({
                                        "ID": diffObj["ID"],
                                        "assignment_date": srcDevice[assignmentStartDateName],
                                        "assignment_email": srcDevice[assigneeEmail]
                                    });
                                }
                                // ignore case for same person
                            }
                        } else if (josysDevice["ステータス"] !== "利用中" && srcDevice[statusColName] === "利用中") {
                            assignActions.push({
                                "ID": diffObj["ID"],
                                "assignment_date": srcDevice[assignmentStartDateName],
                                "assignment_email": srcDevice[assigneeEmail]
                            });
                        }
                    }
                    delete diffObj["利用者メールアドレス"];
                    delete diffObj["利用開始日"];
                    entriesToUpdate.push(diffObj);
                }
            }
        });
        return [entriesToAdd, entriesToUpdate, unassignActions, assignActions];
    }

    static modifyObjectsByKeyMapping(objects, keyMapping) {
        objects.forEach(obj => {
            let custom_fields = [];
            Object.keys(obj).forEach(key => {
                if (keyMapping.hasOwnProperty(key)) {
                    // Rename the key based on the mapping
                    obj[keyMapping[key]] = obj[key];
                    delete obj[key];
                }
                else {
                    custom_fields.push({ "name": key, "value": obj[key] });
                    delete obj[key];
                }
            });
            if (Object.keys(custom_fields).length > 0) {
                obj["custom_fields"] = custom_fields;
            }
        });
    }

    static getLastColumnNumber(sheet, row) {
        const lastColumn = sheet.getLastColumn();
        const values = sheet.getRange(row, 1, 1, lastColumn).getValues()[0];
        for (let col = lastColumn - 1; col >= 0; col--) {
            if (values[col] !== "") {
                return col + 1;
            }
        }
        return 0; // If the row is empty, return 0
    }
}
