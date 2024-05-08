namespace ComputeDiffs {
    // This converts the headers in sheet to Josys columns. Used for both freee sheet and josys sheet.
    export const columnsToJosysColumns = {
        "ID": "uuid",
        "姓": "last_name",
        "名": "first_name",
        "従業員番号": "user_id",
        "入社日": "start_date",
        "退社日": "end_date",
        "ステータス": "status",
        "役職": "job_title",
        // "メールアドレス": "email",
        // "ユーザー名": "username"
    }

    export const columnsToUpdate = ["status", "start_date", "end_date", "job_title", "user_id"];
    export const mandatoryColumns = ["last_name", "first_name", "user_id"];

    export const computeDiff = (sourceSheetName = "freee", josysSheetName = "josys") => {
        let josysSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(josysSheetName);
        if (!josysSheet) {
            return
        }
        let josysMembers = josysSheet.getRange(2, 1, josysSheet.getLastRow(), josysSheet.getLastColumn()).getValues();
        let josysColumns = josysMembers.shift();
        josysMembers = Utils.createObjectArrayFrom2dArray(josysColumns, josysMembers);

        let sourceSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sourceSheetName);
        if (!sourceSheet) {
            return
        }
        let sourceMembers = sourceSheet.getRange(2, 1, sourceSheet.getLastRow(), sourceSheet.getLastColumn()).getValues();
        let sourceColumns = sourceMembers.shift();
        sourceMembers = Utils.createObjectArrayFrom2dArray(sourceColumns, sourceMembers);

        ComputeDiffs.modifyObjectsByKeyMapping(josysMembers, ComputeDiffs.columnsToJosysColumns);
        ComputeDiffs.modifyObjectsByKeyMapping(sourceMembers, ComputeDiffs.columnsToJosysColumns);
        sourceMembers = ComputeDiffs.removeEmployeesWithoutMandatoryColumns(sourceMembers, ComputeDiffs.mandatoryColumns);
        ComputeDiffs.deleteKeys(sourceMembers, new Set(["uuid"]));

        Utils.changeDateFormatToString(josysMembers);
        Utils.changeDateFormatToString(sourceMembers);

        return ComputeDiffs.compareAndCategorize(sourceMembers, josysMembers, ComputeDiffs.columnsToUpdate);
    };

    export const modifyObjectsByKeyMapping = (objects, keyMapping) => {
        objects.forEach(obj => {
            Object.keys(obj).forEach(key => {
                if (keyMapping.hasOwnProperty(key)) {
                    // Rename the key based on the mapping
                    obj[keyMapping[key]] = obj[key];
                    delete obj[key];
                } else {
                    // Remove the key not present in the mapping
                    delete obj[key];
                }
            });
        });
    }

    export const removeEmployeesWithoutMandatoryColumns = (employees, keys) => {
        return employees.filter(employee => {
            return keys.every(key => employee.hasOwnProperty(key) && employee[key] !== null && employee[key] !== '');
        });
    }

    export const deleteKeys = (objects, keys) => {
        objects.forEach(obj => {
            Object.keys(obj).forEach(key => {
                if (keys.has(key)) {
                    delete obj[key];
                }
            });
        });
    }

    export const compareAndCategorize = (source: Array<{ [key: string]: any }>, josys: Array<{ [key: string]: any }>, ColumnsToCompare: Array<string>) => {
        let entriesToAdd: Array<{ [key: string]: any }> = [];
        let entriesToUpdate: Array<{ [key: string]: any }> = [];

        const josysByMatchKey = josys.reduce((acc, obj) => {
            let full_name = obj["first_name"] + " " + obj["last_name"];
            acc[full_name] = obj;
            return acc;
        }, {});

        source.forEach(srcObj => {
            let full_name = srcObj["first_name"] + " " + srcObj["last_name"];
            const josysObj = josysByMatchKey[full_name];

            if (!josysObj) {
                if (srcObj["status"] !== "退職済") {
                    // if new member, only add ones who are still active
                    entriesToAdd.push(srcObj);
                }
            } else {
                const diffObj = { uuid: josysObj.uuid };
                let isDifferent = false;

                ColumnsToCompare.forEach(key => {
                    if (srcObj[key] !== josysObj[key]) {
                        diffObj[key] = srcObj[key];
                        isDifferent = true;
                    }
                });

                if (isDifferent) {
                    entriesToUpdate.push(diffObj);
                }
            }
        });

        return [entriesToAdd, entriesToUpdate];
    }

}