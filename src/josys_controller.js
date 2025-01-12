let josysApiClient = null;

class JosysController {
    static _getJosysApiCredentials() {
        const authSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME);
        const apiUserKey = authSheet.getRange(CREDENTIALS_JOSYS_USER_KEY).getValue();
        const apiUserSecret = authSheet.getRange(CREDENTIALS_JOSYS_USER_SECRET).getValue();
        return [apiUserKey, apiUserSecret];
    }

    static _getJosysApiClient() {
        if (josysApiClient) {
            return josysApiClient;
        }
        const [apiUserKey, apiUserSecret] = JosysController._getJosysApiCredentials();
        josysApiClient = new JosysApiClient(apiUserKey, apiUserSecret);
        return josysApiClient;
    }

    static writeJosysMembersToSheet(sheetName, apiHeaderRow = 1) {
        const apiClient = JosysController._getJosysApiClient();
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
        const columns = Utils.getColumnsFromSheet(sheetName, apiHeaderRow);
        const rowToWriteFrom = apiHeaderRow + 2;
        Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, rowToWriteFrom, 1, true);
    }

    static writeJosysDevicesToSheet(sheetName, apiHeaderRow = 1) {
        const apiClient = JosysController._getJosysApiClient();
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
        const columns = Utils.getColumnsFromSheet(sheetName, apiHeaderRow);
        const rowToWriteFrom = apiHeaderRow + 2;
        Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, rowToWriteFrom, 1, true);
    }

    static uploadMembers(members) {
        const apiClient = JosysController._getJosysApiClient();
        const results = [];
        JosysController._ensureDateFormatInJosysFormat(members);
        for (const e of members) {
            e["status"] = memberStatusMappingJp2En[e["status"]];
            if (e["user_category"]) {
                e["user_category"] = userCategoryMappingJp2En[e["user_category"]];
            }
            try {
                apiClient.createUserProfile(e);
                results.push("SUCCESSFUL");
            } catch (error) {
                results.push(error);
            }
        }
        return results;
    }

    static updateMembers(members) {
        const apiClient = JosysController._getJosysApiClient();
        const results = [];
        JosysController._ensureDateFormatInJosysFormat(members);
        for (const e of members) {
            if (e["status"]) {
                e["status"] = memberStatusMappingJp2En[e["status"]];
            }
            if (e["user_category"]) {
                e["user_category"] = userCategoryMappingJp2En[e["user_category"]];
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

    static uploadDevices(devices) {
        const apiClient = JosysController._getJosysApiClient();
        const results = [];
        for (const d of devices) {
            if (d["status"]) {
                delete d["status"]; // POST new does not accept status
            }
            try {
                apiClient.createDevice(d);
                results.push("SUCCESSFUL");
            } catch (error) {
                results.push(error);
            }
        }
        return results;
    }

    static unassignDevices(unassignActions) {
        const apiClient = JosysController._getJosysApiClient();
        const results = [];
        for (const a of unassignActions) {
            let uuid = a["ID"];
            let data = {
                "target_status": deviceStatusMappingJp2En[a["target_status"]],
                "assignment_end_date": new Date().toISOString().split('T')[0],
            }
            try {
                apiClient.unassignDeviceFromUser(uuid, data);
                results.push("SUCCESSFUL");
            } catch (error) {
                results.push(error);
            }
        }
        return results;
    }

    static assignDevices(assignActions) {
        const apiClient = JosysController._getJosysApiClient();
        const results = [];
        for (const a of assignActions) {
            let uuid = a["ID"];
            let data = {
                "assignment_start_date": a["assignment_date"],
                "assignee_key": "email",
                "value": a["assignment_email"]
            }
            try {
                apiClient.assignDeviceToUser(uuid, data);
                results.push("SUCCESSFUL");
            } catch (error) {
                results.push(error);
            }
        }
        return results;
    }

    static updateDevices(devices) {
        const apiClient = JosysController._getJosysApiClient();
        const results = [];
        for (const d of devices) {
            try {
                let uuid = d["uuid"];
                if (d["status"]) {
                    d["status"] = deviceStatusMappingJp2En[d["status"]];
                }
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

    static _ensureDateFormatInJosysFormat(members) {
        members.forEach(member => {
            if (member.hasOwnProperty("start_date") && member["start_date"] !== "") {
                console.log(member["start_date"]);
                member["start_date"] = Utils.formatDateToJosysFormat(new Date(member["start_date"]));
                console.log(member["start_date"]);
            }
            if (member.hasOwnProperty("end_date") && member["end_date"] !== "") {
                console.log(member["end_date"]);
                member["end_date"] = Utils.formatDateToJosysFormat(new Date(member["end_date"]));
                console.log(member["end_date"]);
            }
        })
    }
}