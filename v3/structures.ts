export type LimitAction = "timeout" | "kick" | "ban"

export interface TemporaryBanEntry {
    guildId : string,
    userId : string
    endTime : number
}