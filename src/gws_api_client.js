class GoogleWorkspaceClient {
    getMembers(domain='') {
        let results = [];
        let pageToken;
        do {
            let params = {
                maxResults: 500,
                pageToken: pageToken,
                orderBy: "EMAIL"
            };
            if (domain !== '') {
                params["domain"] = domain;
            } else {
                params["customer"] = "my_customer";
            }
            const response = AdminDirectory.Users.list(params);
            const users = response.users;
            if (users && users.length > 0) {
                results = [...results, ...users];
            }
            pageToken = response.nextPageToken;
        } while (pageToken);
        return results;
    }
}