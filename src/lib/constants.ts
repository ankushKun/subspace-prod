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

    static readonly WanderTiers = {
        1: { Icon: "Wkqi7dy73Yaw16g-kfpH2ZmzH8Di8J0M51M03OMt8yM", Label: "Prime", TextIcon: "cKsvUhHZmAq9MWMDtRkc40q4TViifVmAn0N46QknBNw" },
        2: { Icon: "R6_RzYzzwaxXGwCO6_lRK1IXJy8cQcMeqfBIIBAyLXo", Label: "Edge", TextIcon: "D7Ryj60DeH1DtNwKG-bNJRs5GLR4jV04gX89LD8INxE" },
        3: { Icon: "-9ihkAq8F8qqI-lB4PLjRzw_T2l2fbiao9def8BPHgQ", Label: "Reserve", TextIcon: "evHRTgPlXg9y4bvqfzUP7MN2eNTphIa9Qn8StkLl4Kc" },
        4: { Icon: "fl4ClA4y4XOGH5HKDMRFeFRf8N3d2hKR1PjoL93DdyY", Label: "Select", TextIcon: "FSmzoChL3Xl6KQdCBHyMt__nSRMYVrZWrojsyzUPleo" },
        5: { Icon: "hlbO16i54G1WEUcVXeLRweKJ9Y3oqADGJ5iITpA_pa4", Label: "Core", TextIcon: "HkUyxz7U7-7zzZaQ_2fhUX0Ol3_2vpqZ3ZioVJSgYOc" },
    };

    static readonly Icons = {
        DefaultServerIcon: "_t1djb15ncsDp04zyGC1U304NU9sFqfP9J9SPUMfYKM",
        ArnsLogo: "Sie_26dvgyok0PZD_-iQAFOhOd5YxDTkczOLoqTTL_A",
    };

    static readonly TKey = "AIzaSyAPpbqyilDRCuMQ-on7V76t6CS10lKTwUs";

    static readonly Scheduler = "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA";
    static readonly Module = "33d-3X8mpv6xYBlVB-eXMrPfH5Kzf6Hiwhcv0UA10sw";

    // Role colors
    static readonly DEFAULT_ROLE_COLOR = "#99AAB5";

    static readonly CuEndpoints = {
        Legacynet: "https://cu.ao-testnet.xyz",
        BetterIDEa: "https://cu.arnode.asia",
        Ardrive: "https://cu.ardrive.io",
        RandAO: "https://ur-cu.randao.net",
        "Localhost ⚠️": "http://localhost:6363"
    }

    static readonly HyperbeamEndpoints = {
        Forward: "https://forward.computer",
        BetterIDEa: "https://hb.arnode.asia",
        PermaDAO: "https://hb.arweave.asia",
        "Localhost ⚠️": "http://localhost:8173"
    }

    static readonly CommonTags: Tag[] = [
        { name: Constants.TagNames.AppName, value: Constants.TagValues.AppName },
        { name: Constants.TagNames.AppVersion, value: Constants.TagValues.AppVersion },
        { name: "Authority", value: "fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY" }
    ]

    static readonly SubspaceServer = "Uyg8d-jd4tbLWSD8oFyq3n28kQ72jlvrbmHqoHfemRY"
}