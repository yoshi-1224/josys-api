namespace ComputeDeviceDiffs {
    const JOSYS_DEVICE_COLUMNS_ROW_NUM = 6;
    const MDM_DEVICE_COLUMNS_ROW_NUM = 7;
    const START_COL_OF_DEVICE_COLUMNS = 3;
    const MATCH_KEY_RANGE = "B12";
    const ASSET_NUMBER_COLUMN_RANGE = "B19";

    export const JosysDeviceDefaultColumnJP2EN = {
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
    }

    export const readColumnMappingsFromSheet = (sheetName: string) => {
        if (sheetName === "") {
            sheetName = DEVICE_CONFIG_SHEET_NAME;
        }
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
            throw new Error(`Sheet with name ${sheetName} not found`);
        }
        const lastColumn = ComputeMemberDiffs.getLastColumnNumber(sheet, JOSYS_DEVICE_COLUMNS_ROW_NUM);
        let range = sheet.getRange(JOSYS_DEVICE_COLUMNS_ROW_NUM, START_COL_OF_DEVICE_COLUMNS, 1, lastColumn - START_COL_OF_DEVICE_COLUMNS + 1);
        let josysColumns: string[] = range.getValues().flat();
        range = sheet.getRange(MDM_DEVICE_COLUMNS_ROW_NUM, START_COL_OF_DEVICE_COLUMNS, 1, lastColumn - START_COL_OF_DEVICE_COLUMNS + 1);
        let mdmColumns: string[] = range.getValues().flat();
        return [josysColumns, mdmColumns];
    }

    export const readMatchKeyFromSheet = (sheetName: string) => {
        if (sheetName === "") {
            sheetName = DEVICE_CONFIG_SHEET_NAME;
        }
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
            throw new Error(`Sheet with name ${sheetName} not found`);
        }
        return sheet.getRange(MATCH_KEY_RANGE).getValue();
    }

    export const readAssetNumberColumnFromSheet = (sheetName: string) => {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
            throw new Error(`Sheet with name ${sheetName} not found`);
        }

        if (SYNC_NEW_DEVICES_FLAG) {
            return null;
        }

        return sheet.getRange(ASSET_NUMBER_COLUMN_RANGE).getValue();
    }

    export const computeDeviceDiff = (sourceDevices, josysDevices) => {
        const [josysColumns, sourceColumns] = ComputeDeviceDiffs.readColumnMappingsFromSheet(DEVICE_CONFIG_SHEET_NAME);
        const assetNumberColumn = ComputeDeviceDiffs.readAssetNumberColumnFromSheet(DEVICE_CONFIG_SHEET_NAME);
        console.log(`asetNumberColumn = ${assetNumberColumn}`);
        let assetNumberColumnValues = [];
        if (assetNumberColumn) {
            assetNumberColumnValues = sourceDevices.map(device => device[assetNumberColumn]);
        }
        const matchKey = ComputeDeviceDiffs.readMatchKeyFromSheet(DEVICE_CONFIG_SHEET_NAME);
        console.log(`match key = ${matchKey}`);
        const columnMapping = {};
        for (let i = 0; i < josysColumns.length; i++) {
            columnMapping[josysColumns[i]] = sourceColumns[i];
        }
        console.log(columnMapping);
        let [entriesToAdd, entriesToUpdate] = ComputeDeviceDiffs.compareAndCategorize(sourceDevices, josysDevices, columnMapping, matchKey, assetNumberColumnValues);
        entriesToAdd = ComputeDeviceDiffs.dropEmptyColumns(entriesToAdd);
        ComputeDeviceDiffs.modifyObjectsByKeyMapping(entriesToAdd, ComputeDeviceDiffs.JosysDeviceDefaultColumnJP2EN);
        ComputeDeviceDiffs.modifyObjectsByKeyMapping(entriesToUpdate, ComputeDeviceDiffs.JosysDeviceDefaultColumnJP2EN);
        console.log(entriesToAdd);
        console.log(entriesToUpdate);
        return [entriesToAdd, entriesToUpdate];
    };

    export const dropEmptyColumns = (members: Array<{ [key: string]: any;}>) => {
        return members.map(member => {
            for (const key in member) {
                if (member[key] === "") {
                    delete member[key];
                }
            }
            return member;
        });
    }

    export const compareAndCategorize = (sourceDevices: Array<{ [key: string]: any }>, josysDevices: Array<{ [key: string]: any }>, josysCol2SourceCol: { [key: string]: string }, matchKey: string, assetNumberColumnValues: string[]) => {
        let entriesToAdd: Array<{ [key: string]: any }> = [];
        let entriesToUpdate: Array<{ [key: string]: any }> = [];

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
                    entriesToUpdate.push(diffObj);
                }
            }
        });

        return [entriesToAdd, entriesToUpdate];
    }

    export const modifyObjectsByKeyMapping = (objects, keyMapping) => {
        objects.forEach(obj => {
            let custom_fields: Array<object> = [];
            Object.keys(obj).forEach(key => {
                if (keyMapping.hasOwnProperty(key)) {
                    // Rename the key based on the mapping
                    obj[keyMapping[key]] = obj[key];
                    delete obj[key];
                } else {
                    custom_fields.push({ "name": key, "value": obj[key] });
                    delete obj[key];
                }
            });
            if (Object.keys(custom_fields).length > 0) {
                obj["custom_fields"] = custom_fields;
            }
        });
    }

    export const getLastColumnNumber = (sheet, row:number) => {
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
