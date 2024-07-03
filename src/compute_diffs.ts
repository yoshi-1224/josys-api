namespace ComputeDiffs {
    // This converts the headers in sheet to Josys columns. Used for both freee sheet and josys sheet.
    export const memberColumnsToJosysColumns = {
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

    export const devicecolumnsToJosysColumns = {
        "ID": "uuid",
        "資産番号": "asset_number",
        "シリアル番号": "serial_number",
        "メーカー": "manufacturer",
        "型番": "model_number",
        "デバイスの種類": "device_type",
        "デバイス名": "model_number",
        "OS": "operating_system",
        "調達日": "start_date",
        "廃棄日/解約日": "end_date",
        // "利用者uuid": "assignee_uuid",
        // "利用開始日": "assignment_start_date",
    }

    export const memberColumnsToCompareAndUpdate = ["status", "start_date", "end_date", "job_title", "user_id"];
    export const deviceColumnsToCompareAndUpdate = []; // TODO
    export const mandatoryMemberColumns = ["last_name", "first_name", "user_id"];
    export const mandatoryDeviceColumns = ["status", "asset_number"];

    export const computeDiff = (sourceMembers, josysMembers) => {
        ComputeDiffs.modifyObjectsByKeyMapping(josysMembers, ComputeDiffs.memberColumnsToJosysColumns);
        ComputeDiffs.modifyObjectsByKeyMapping(sourceMembers, {...ComputeDiffs.memberColumnsToJosysColumns, "表示名": "display_name" });
        sourceMembers = ComputeDiffs.removeMembersWithoutMandatoryColumns(sourceMembers, ComputeDiffs.mandatoryMemberColumns);
        ComputeDiffs.deleteKeys(sourceMembers, new Set(["uuid"]));

        Utils.changeDateFormatToString(josysMembers);
        Utils.changeDateFormatToString(sourceMembers);

        return ComputeDiffs.compareAndCategorize(sourceMembers, josysMembers, ComputeDiffs.memberColumnsToCompareAndUpdate);
    };

    export const computeDeviceDiff = (sourceDevices, josysDevices) => {
        ComputeDiffs.modifyObjectsByKeyMapping(josysDevices, ComputeDiffs.memberColumnsToJosysColumns);
        ComputeDiffs.modifyObjectsByKeyMapping(sourceDevices, {...ComputeDiffs.devicecolumnsToJosysColumns});
        sourceDevices = ComputeDiffs.removeMembersWithoutMandatoryColumns(sourceDevices, ComputeDiffs.mandatoryDeviceColumns);
        ComputeDiffs.deleteKeys(sourceDevices, new Set(["uuid"]));
        Utils.changeDateFormatToString(josysDevices);
        Utils.changeDateFormatToString(sourceDevices);
        return ComputeDiffs.compareAndCategorize(sourceDevices, josysDevices, ComputeDiffs.memberColumnsToCompareAndUpdate);
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

    export const removeMembersWithoutMandatoryColumns = (members, keys) => {
        return members.filter(member => {
            return keys.every(key => member.hasOwnProperty(key) && member[key] !== null && member[key] !== '');
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

    export const compareAndCategorize = (source: Array<{ [key: string]: any }>, josys: Array<{ [key: string]: any }>, ColumnsToCompareAndUpdate: Array<string>) => {
        let entriesToAdd: Array<{ [key: string]: any }> = [];
        let entriesToUpdate: Array<{ [key: string]: any }> = [];

        const josysByMatchKey = josys.reduce((acc, obj) => {
            let full_name = String(obj["last_name"]) + String(obj["first_name"]);
            full_name = full_name.replace(/\s/g, '');
            acc[full_name] = obj;
            return acc;
        }, {});

        source.forEach(srcObj => {
            let full_name = String(srcObj["display_name"]);
            full_name = full_name.replace(/\s/g, '');
            const josysObj = josysByMatchKey[full_name];

            if (!josysObj) {
                if (srcObj["status"] !== "退職済") {
                    // if new member, only add ones who are still active
                    delete srcObj["display_name"];
                    entriesToAdd.push(srcObj);
                }
            } else {
                const diffObj = { uuid: josysObj.uuid };
                let isDifferent = false;

                ColumnsToCompareAndUpdate.forEach(key => {
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