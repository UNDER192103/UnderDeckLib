
class PC {
    id = String();
    name = String();
    mac = String();

    constructor(PC) {
        Object.assign(this, PC);
    }

}

class User {
    id = String();
    status = String();
    username = String();
    name = String();
    createdDate = String();
    email = String();
    avatar = String();
    emailVerified = String();
    premium = Boolean();
    premiumLevel  = Number();
    premiumStartDate = String();
    premiumFinishDate = String();
    friends = new Map();
    profileStyle = new ProfileStyle();
    tags = new Map();

    constructor(Account, friendRequestStatus = null) {
        Object.assign(this, Account);
        this.friends = new Friends(this.friends);
        this.tags = new Tags(this.tags);
        this.profileStyle = new ProfileStyle(this.profileStyle);
        if (friendRequestStatus) { this.friendRequestStatus = friendRequestStatus; }
    }

    GetAvatar() {
        return this.avatar ?? null;
    }
}

class ProfileStyle {
    theme = {
        uri: String(),
        color: String(),
        background: String(),
    };
    namePlate = String();
    namePlateColor = String();
    namePlateBackground = String();
    isDuplicateNamePlate = String();

    constructor(ProfileStyle) {
        Object.assign(this, ProfileStyle);
    }
}

class Friends extends Map {
    constructor(Friends) {
        super();
        if(Array.isArray(Friends)) {
            Friends.forEach(Friend => {
                const user = new User(Friend.user, {
                    friends: Friend.friends,
                    refused: Friend.refused,
                    blocked: Friend.blocked,
                    byId: Friend.requestBy,
                    acceptdBy: Friend.isAcceptdBy,
                    refusedBy: Friend.isRefusedBy,
                    RequestId: Friend.idP
                });
                this.set(user.id, user);
            });
        }
    }
}

class Tags extends Map {
    constructor(Tags) {
        super();
        if(Array.isArray(Tags)) {
            Tags.forEach(tag => {
                this.set(tag.key, tag);
            });   
        }
    }
}

class UsersList extends Map {
    constructor(Users) {
        super();
        if(Array.isArray(Users)) {
            Users.forEach(UserData => {
                const userOb = new User(UserData);
                this.set(userOb.id, userOb);
            });   
        }
    }
}

class UsersPcPermissionsList extends Map {
    constructor(List) {
        super();
        if(Array.isArray(List)) {
            List.forEach(Item => {
                Item.user = new User(Item.user);
                this.set(Item.pcId, Item);
            });   
        }
    }
}

export default { PC, User, UsersList, UsersPcPermissionsList };