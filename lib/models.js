
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

    constructor(Account) {
        Object.assign(this, Account);
        this.friends = new Friends(this.friends);
        this.tags = new Tags(this.tags);
        this.profileStyle = new ProfileStyle(this.profileStyle);
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
                const user = new User(Friend.user);
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

export default { User };