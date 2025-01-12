function writeGoogleWorkspaceMembersToSheet(sheetName, headerRow = 1) {
    const apiClient = new GoogleWorkspaceClient();
    const results = apiClient.getMembers();
    if (!results) {
        return;
    }
    getNames(results);
    getExternalIds(results);
    formatDate(results);
    getOrganizationInfo(results);
    const columns = Utils.getColumnsFromSheet(sheetName, headerRow);
    const rowToWriteFrom = headerRow + 2;
    Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, rowToWriteFrom, 1, true);
}

function getNames(users) {
    users.forEach(user => {
        user["name.familyName"] = user["name"].familyName;
        user["name.givenName"] = user["name"].givenName;
    });
}

function getExternalIds(users) {
    users.forEach(user => {
        if (user["externalIds"] && user["externalIds"].length > 0) {
            const organizationId = user["externalIds"].find(id => id.type === "organization");
            if (organizationId) {
                user["externalIds.organization"] = organizationId.value;
            }
        }
    });
}

function formatDate(users) {
    users.forEach(user => {
        user.creationTime = Utils.formatDateToJosysFormat(new Date(user.creationTime));
    })
}

function getOrganizationInfo(users) {
    users.forEach(user => {
        if (user.organizations) {
            let organization;
            if (Array.isArray(user.organizations) && user.organizations.length > 0) {
                if (user.organizations.length === 1) {
                    organization = user.organizations[0];
                } else {
                    organization = user.organizations.find(org => org.primary);
                }
            } else {
                organization = user.organizations;
            }
            if (organization) {
                user["organizations.department"] = organization.department;
                user["organizations.title"] = organization.title;
            }
        }
    })
}