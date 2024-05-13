import { InteractionCommandClient } from "detritus-client";
import { Database } from "./utils";
import { databaseNames } from "../.././information.json"
import { TemporaryBanEntry } from "./structures";
import { Guild } from "detritus-client/lib/structures";

function startTimers(client: InteractionCommandClient, database: Database) {
    setTimeout(async () => {
        const timedPunishmentsDatabaseNames = databaseNames.timedBans
        const guildEntries: Array<TemporaryBanEntry> = await database.get(timedPunishmentsDatabaseNames.collectionName, timedPunishmentsDatabaseNames.keyName, [], "1")
        for(const entry of guildEntries) {
            const now = Date.now()
            if(now > entry.endTime) {
                const guild: Guild | undefined = await client.rest.fetchGuild(entry.guildId).catch()
                if(guild) {
                    await guild.removeBan(entry.userId, {reason : "Time's up"})
                }
                guildEntries.splice(guildEntries.indexOf(entry), 1)
                await database.set(timedPunishmentsDatabaseNames.collectionName, timedPunishmentsDatabaseNames.keyName, guildEntries, "1")
            }
        }
    }, 1000)
}
