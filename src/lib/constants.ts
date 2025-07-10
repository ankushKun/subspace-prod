import type { Tag } from "@subspace-protocol/sdk";


export class Constants {
    static readonly TagNames = {
        AppName: "App-Name",
        AppVersion: "App-Version",
        SubspaceFunction: "Subspace-Function",
    };
    static readonly TagValues = {
        AppName: "Subspace-Chat",
        // @ts-ignore
        AppVersion: `${__VERSION__}`,

        CreateServer: "Create-Server",
        CreateCategory: "Create-Category",
        CreateChannel: "Create-Channel",
        SendMessage: "Send-Message",

        UpdateServer: "Update-Server",
        UpdateServerCode: "Update-Server-Code",
        UpdateProfile: "Update-Profile",
        UpdateMember: "Update-Member",
        UpdateCategory: "Update-Category",
        UpdateChannel: "Update-Channel",
        UpdateMessage: "Update-Message",

        DeleteServer: "Delete-Server",
        DeleteCategory: "Delete-Category",
        DeleteChannel: "Delete-Channel",
        DeleteMessage: "Delete-Message",
        DeleteMember: "Delete-Member",

        CreateRole: "Create-Role",
        UpdateRole: "Update-Role",
        DeleteRole: "Delete-Role",
        AssignRole: "Assign-Role",
        UnassignRole: "Unassign-Role",

        JoinServer: "Join-Server",
        LeaveServer: "Leave-Server",
        ReorderServers: "Reorder-Servers",

        DelegateUser: "Delegate-User",
        UndelegateUser: "Undelegate-User",

        SendFriendRequest: "Send-Friend-Request",
        AcceptFriendRequest: "Accept-Friend-Request",
        RejectFriendRequest: "Reject-Friend-Request",
        RemoveFriend: "Remove-Friend",

        InitiateDm: "Initiate-Dm",
        SendDm: "Send-Dm",

        UploadFileAR: "Upload-File-AR",
        UploadFileTurbo: "Upload-File-Turbo",
    };

    static readonly Icons = {
        DefaultServerIcon: "yClwNR7Pa6yxyEr5jnSLBY943rcsMQzrt_iX5GveZXM",
        ArnsLogo: ""
    };

    static readonly TKey = "AIzaSyAPpbqyilDRCuMQ-on7V76t6CS10lKTwUs";

    static readonly Scheduler = "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA";
    static readonly Module = "33d-3X8mpv6xYBlVB-eXMrPfH5Kzf6Hiwhcv0UA10sw";

    static readonly CuEndpoints = {
        ArnodeAsia: "https://cu.arnode.asia",
        Ardrive: "https://cu.ardrive.io",
        Randao: "https://ur-cu.randao.net"
    }

    static readonly CommonTags: Tag[] = [
        { name: Constants.TagNames.AppName, value: Constants.TagValues.AppName },
        { name: Constants.TagNames.AppVersion, value: Constants.TagValues.AppVersion },
        { name: "Authority", value: "fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY" }
    ]
}