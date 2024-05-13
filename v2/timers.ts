import * as variables from "./variables"
import * as functions from "./functions"
export async function startActionsTimer(client) {
    if(client.user.id === 685705466764197888) {
        return
    }
    setInterval(async () => {
        const timedPunishmentsCollection = await functions.getCollection("timed_punishments")
        const timedPunishments = await timedPunishmentsCollection.find({})
        await timedPunishments.forEach(async x => {
        for(const item of x["entries"]) {
            const guildID = item["guildID"]
            if(item["time"] < new Date()) {
                const guild = await functions.getGuild(guildID, client)
                if(guild) {
                    const member = await functions.getMember(item["memberID"], guild)
                    if(item["action"] === "unban") {
                        const memberInfo = item["action"]["memberInfo"]?.split("#")
                        if(memberInfo && await functions.unbanMember(guild, memberInfo[0], memberInfo[1])) {
                            await member.send(functions.createEmbed("You've been unbanned!", `You've been unbanned in ${guild.toString()}.`, variables.colors["green"], member.user, {name : "Reason", value : "Time out"}, null)).catch()
                        }
                    }
                }
                await functions.remove(timedPunishmentsCollection, "entries", item, guildID)
            }
        }
    })
        
}, 5000)
}

export async function startUnverifiedMembersTimer(client) {
    if(client.user.id === 685705466764197888) {
        return
    }
    setInterval(async () => {
    const unverifiedMembersCollection = await functions.getCollection("unverified_members")
    const unverifiedMembers = await unverifiedMembersCollection.find({})
    await unverifiedMembers.forEach(async x => {
    for(const info of x["members"]) {
        const guild = await functions.getGuild(info["guildID"], client)
        if(info["time"] < new Date()) {
            if(guild) {
                const member = await functions.getMember(info["memberID"], guild)
                if(member) {
                    if(functions.isKickable(member)) {
                        await member.kick("Didn't verify within 24 hours").catch()
                    }
                }
            }
            await functions.remove(unverifiedMembersCollection, "members", info, info["guildID"])
        }
    }
    })
}, 5000)
}
    