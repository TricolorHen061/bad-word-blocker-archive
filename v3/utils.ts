import {  InteractionCallbackTypes, MessageComponentButtonStyles, MessageFlags, Permissions } from "detritus-client/lib/constants";
import { InteractionContext } from "detritus-client/lib/interaction";
import { ChannelGuildText, Guild, Interaction, Member, Message, User, UserMe } from "detritus-client/lib/structures";
import { ComponentActionData, ComponentActionRow, ComponentContext, ComponentEmojiData, ComponentSelectMenuOptionData, Embed, EmbedField, InteractionModal, InteractionModalArgs, InteractionModalContext, InteractionModalOnTimeout} from "detritus-client/lib/utils";
import { PermissionChecks } from "detritus-client/lib/utils/permissions";
import { Db, MongoClient  } from "mongodb";
import { db } from "./bot";
import { alternativeCharacters, bypassCharacters, colors, databaseNames, limits, embedDefaults, voteLink, minimumAllowedEnglishWordLength, maximumAllowedEnglishWordLength, dbAddress} from "../.././information.json"
import { LimitAction, TemporaryBanEntry } from "./structures";
import { votedUsers } from "./votes";
import { newServers } from "./events";
import {exactMatch, inexactMatch, links} from "../../Filter/output/Filters"
const fs = require("fs") 
const axios = require("axios").default;
const unidecode = require("unidecode")
import { badWords } from "./badwords"
import { ShardClient } from "detritus-client";

let englishWords: Array<string>

fs.readFile("./../../EnglishWords.txt", "utf8", (error: Error, data: string) => englishWords = data.split("\n").filter((item: string) => ((item.length >= minimumAllowedEnglishWordLength) || item.length === 1)))


export class BotUtils {
    static createEmbed(title: string, description: string, author: User, fields: Array<{name : string, value : string, inline? : boolean}> = [], color: number = colors.blue, footer?: string, image?: string, thumbnailUrl?: string) {
        const embed = new Embed({
            title : title,
            description : description,
            author : {
                icon_url : author.avatarUrl,
                name : author.username,
            },
            color : color
        })
        if(footer) embed.setFooter(footer)
        if(image) embed.setImage(image)
        if(thumbnailUrl) embed.setThumbnail(thumbnailUrl)
        for(const field of fields ?? []) embed.addField(field.name, field.value, field.inline)
        return embed
    }
    static createModal(title: string, inputTextComponents: Array<ComponentActionData> = [], callback: (context: InteractionModalContext, args: InteractionModalArgs) => void, customId?: string, timeout?: number, onTimeout?: InteractionModalOnTimeout, onError?: (error:any) => void) {
        const modal = new InteractionModal({
            title: title,
            run : callback,
            timeout : timeout,
            onTimeout : onTimeout,
            onError : onError,
            customId : customId
        })
        for(const inputTextComponent of inputTextComponents) modal.addInputText(inputTextComponent)
        return modal
    }

    static createButton(actionRow: ComponentActionRow, customId: string, label: string, run: (context: ComponentContext) => any, disabled?: boolean, style?: MessageComponentButtonStyles, type?: number, url?: string, emoji?: ComponentEmojiData){
        actionRow.createButton({
            customId : customId,
            disabled : disabled,
            emoji : emoji,
            label : label,
            style : style,
            type : 2,
            url : url,
            run: run,
        })
        return actionRow
    }

    static createActionRow() {
        return new ComponentActionRow()
    }

    static hasAllPermissions(member: Member, permissions: Array<PermissionChecks>) {

        if(member.client.isOwner(member.id)) return true

        for(const permission of permissions) 
            if(!member.can(permission, {ignoreAdministrator : false, ignoreOwner : false})) return false
        
        return true
    }

    static createSelectMenu(actionRow: ComponentActionRow, label: string, options: Array<ComponentSelectMenuOptionData>, run: (context: ComponentContext) => any, minValues?: number, maxValues?: number, customId?: string) {
        actionRow.createSelectMenu({
            label : label,
            options : options,
            run : run,
            minValues : minValues,
            maxValues : maxValues,
            customId : customId || "something"
        })
        return actionRow
    }

    static async addTemporaryBan(member: Member, ms: number, database: Database) {
        const timedPunishmentsDatabaseNames = databaseNames.timedBans
        const existingTimedPunishments: Array<TemporaryBanEntry> = await database.get(timedPunishmentsDatabaseNames.collectionName, timedPunishmentsDatabaseNames.keyName, [], member.guildId)
        existingTimedPunishments.push({
            guildId : member.guildId,
            userId : member.id,
            endTime: Date.now() + ms
        })
    }

    static async handleModerationPermissionError(error, channel: ChannelGuildText, targetMember: Member, action : LimitAction) {
        console.log("Had error below:")
        console.log(error)
        await channel.createMessage({embed : this.createEmbed(`Unable to perform ${action}`, `The bot tried to ${action} ${targetMember.mention}, but couldn't because of a permission error. Please give the bot admin, or the correct permission for the action. Error: \`\`\`${error}\`\`\` `, (targetMember.client as ShardClient).user as UserMe, undefined, colors.red)})
    }

    static createMemberMissingPermissionsEmbed(member: Member, permissionsName: string | Array<string>) {
        return this.createEmbed("Missing Permissions", `You are missing the ${permissionsName instanceof String ? permissionsName : (permissionsName as Array<string>).join(", ")} permission(s) needed to run this command`, member, undefined, colors.red)
    }

    static hasVoted(user: User) {
        // return votedUsers.includes(user.id)
        return true // Just for now
    }

    static handleUnvotedUser(context: InteractionContext) {
        return BotUtils.createResponse(context, InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed: this.createEmbed("You haven't voted yet", "You need to vote for the bot at least one time this month to use this command.", context.user, undefined, colors.orange), components : [this.createButton(this.createActionRow(), "something", "Vote", (context) => {}, false, MessageComponentButtonStyles.LINK, undefined, voteLink)]})
    }

    static createResponse(context : InteractionContext | InteractionModalContext | ComponentContext, type:InteractionCallbackTypes, data) {
        data["flags"] = MessageFlags.EPHEMERAL
        return context.respond(type, data)
    }

    static async messageCreate(message: Message) {
        // console.log(message.guild.name)
        // console.log(message.author.name)
        if(message.guildId === undefined || message.guild === null) return
        if(message.member === undefined) {
            console.log("member is undefined")
            return
        }
        const guildExtraFeatures = await db.get(databaseNames.extras.collectionName, databaseNames.extras.keyName, {}, "1")
        if(message.author.bot && !guildExtraFeatures[message.guildId]) return
        const guildId = message.guildId

        const defaultValue = [false, ""]
        const blacklistNames = databaseNames.blacklist
        const exactMatchWords = await db.get(blacklistNames.exactmatch.collectionName, blacklistNames.exactmatch.keyName, [], guildId)
        const inexactMatchWords = await db.get(blacklistNames.inexactmatch.collectionName, blacklistNames.inexactmatch.keyName, [], guildId)
        const phrases = await db.get(blacklistNames.phrases.collectionName, blacklistNames.phrases.keyName, [], guildId)
        const links = await db.get(blacklistNames.links.collectionName, blacklistNames.links.keyName, [], guildId)
        const exactMatchWordsFound = exactMatchWords.length > 0 ? Filter.exactMatch(message.content, exactMatchWords) : defaultValue
        const inexactMatchWordsFound = inexactMatchWords.length > 0 ? Filter.inexactMatch(message.content, inexactMatchWords) : defaultValue
        const linksFound = links.length > 0 ? Filter.linkMatch(message.content, links) : defaultValue
        const phrasesFound = phrases.length > 0 ? Filter.phraseMatch(message.content, phrases) : defaultValue
        
        const results = [exactMatchWordsFound, inexactMatchWordsFound, linksFound, phrasesFound]
        const firstNonNullResult = results.filter((result: Array<boolean | string>) => result[0])?.[0]
        
        if(guildExtraFeatures[message.guildId]) {
            const data = guildExtraFeatures[message.guildId]
            if(data?.["command_channels"]?.find(item => item === message.channelId) && !message.fromBot) {
                await message.delete()
                return
            }
            const cleanupBotData = data?.["cleanup_bots"]
            // if(cleanupBotData) {console.log("Wow bro"); console.log(cleanupBotData[0][0]); console.log(message.author.id); console.log(cleanupBotData[0][0] === message.author.id)}
            for(const x of cleanupBotData || []) {
                /* console.log("wow bro")
                console.log(x[0])
                console.log(message.author.id) */
                if(x[0] === message.author.id) {
                    console.log("Goofy ahhh")
                    setTimeout(async () => await message.delete(), x[1] * 1000)
                    return
                }
            }
        }

        if(firstNonNullResult) {
            const foundItem = firstNonNullResult[1]
            if(foundItem.trim() === "") return // This is super important, do not remove
            const guildBypasses = await db.get(databaseNames.bypasses.collectionName, databaseNames.bypasses.keyName, {}, guildId)
            if(message.member.roles.find(role => guildBypasses?.roles?.includes(role?.id) ?? false) || guildBypasses?.channels?.includes(message.channelId)) return
            console.log(`Blocked: ${message.content} for word: ${foundItem}`)
            try {await Filter.blockMessage(message, db, foundItem)}
            catch(e) {
                if(!BotUtils.hasAllPermissions(message.guild.me as Member, [Permissions.MANAGE_MESSAGES])) {
                    await message?.channel?.createMessage({embed : BotUtils.createEmbed("Could not block message", "Please make sure the bot has the `Manage Messages` or `Administrator` permission.", message.author)})
                }
                return
            }
            await SavedMessages.save(message, foundItem, db)
            const logChannelId = await db.get(databaseNames.log.collectionName, databaseNames.log.keyName, null, message.guildId)
            if(logChannelId) {
                const logChannel = message.guild.channels.get(logChannelId)
                if(!logChannel) return await message.channel?.createMessage({embed : BotUtils.createEmbed("Can't see log channel", "The bot could not find the log channel. Make sure it has permission to view and send messages in it.", message.author, undefined, colors.red)})
                await logChannel.createMessage({embed : BotUtils.createEmbed("Message deleted", `A message by ${message.member.mention} was deleted in ${message.channel?.mention}`, message.author, [{name : "Content", value : message.content}], colors.red)})
            }
        }
     
    }

    static isAscii(text) {
        var ascii = true
        for(const x in text) {
            if(text.charCodeAt(x) > 127) {
                ascii = false
                break
            }
        }
        return ascii
    }

    static removeAllNonASCIICharacters(string: string) {
        return string.split("").filter(character => this.isAscii(character)).join("")
    }

    static createStringVariations(string: string) {
        return [string, Filter.removeBypassCharacters(string), Filter.useAlternativeCharacters(string), Filter.removeAllDuplicateWordCharacters(string.split(" ")).join(" "), this.removeAllNonASCIICharacters(string), this.unicodeToString(string)].map(stringValue => stringValue.toLowerCase()).filter(variant => variant !== "")
    }    

    static unicodeToString(string: string) {
        return unidecode(string)
    }

}

export class Filter {

    static exactMatch(string: string, wordList: Array<string>) {
        const [stringBoolRep, word] = exactMatch(string.toLocaleLowerCase())(wordList)(bypassCharacters)(alternativeCharacters)
        return [StringUtils.stringBooleanToBoolean(stringBoolRep), word]

        string = string.toLowerCase()
        const wordFound = ArrayUtils.getMutualItem(wordList, string.split(" "))
        return [Boolean(wordFound), wordFound]
    }

    static inexactMatch(string: string, wordList: Array<string>) {
        const [stringBoolRep, word] = inexactMatch(string.toLowerCase())(wordList)(bypassCharacters)(alternativeCharacters)(englishWords)
        return [(StringUtils.stringBooleanToBoolean(stringBoolRep)), word]
        
        /* const stringNoSpaces = Filter.replaceAll(string, " ", "")
        const stringWithSpaces = Filter.removeDuplicateCharacters(string, " ")
        let nonSwearWord = false
        const stringWithSpacesSplit = stringWithSpaces.split(" ")
        
        for(let guildWord of wordList) {


            if(guildWord.startsWith("_")) {
                nonSwearWord = true
                guildWord = guildWord.replace("_", "")
            }

            if(stringNoSpaces.includes(guildWord)) {
                const wordFound = guildWord
                const surroundingWord = stringWithSpacesSplit.filter(word => word.includes(wordFound)).shift()
                const applicableEnglishWords = englishWords.filter(englishWord => {
                    for(const substring of substringsToRemove) {
                        if(englishWord.includes(substring)) return false
                    }
                    return true
                })
                if(surroundingWord) {
                    if(nonSwearWord) return [true, wordFound] // Word has a normal word in it
                    // Keeping the below line incase of needed debugging in the future
                    // console.log((applicableEnglishWords.filter(englishWord => surroundingWord.includes(englishWord) && !surroundingWord.endsWith(englishWord))))
                    return [!(applicableEnglishWords.filter(englishWord => surroundingWord.includes(englishWord) && !surroundingWord.endsWith(englishWord)).length > 0), wordFound] // If it's in the non-swear word dictionary, then it's probably ok
                }
                else { // Either made from multiple words, or an attempted bypass
                    if(string.trim() === "") return [true, wordFound]
                    const startingIndex = Filter.search(stringWithSpaces, wordFound, " ") - 1
                    const splitSubstringFromStartingIndex = stringWithSpaces.substring(startingIndex).split(" ")
                    const endingPiece = splitSubstringFromStartingIndex[1]
                    const startingPiece = stringWithSpacesSplit[stringWithSpacesSplit.indexOf(endingPiece) - 1]
                    if(!(applicableEnglishWords.filter(englishWord => startingPiece?.includes(englishWord)).length > 0) && !(applicableEnglishWords.filter(englishWord => endingPiece.includes(englishWord)).length > 0)) return [true, wordFound]
                }
            }
        }
        return [false, null] */
    }

    static linkMatch(string: string, linkList: Array<string>) {
       const [hasFoundLink, linkFound] = links(string.toLowerCase())(linkList)(bypassCharacters)(alternativeCharacters)
        return [StringUtils.stringBooleanToBoolean(hasFoundLink), linkFound]
    }

    static phraseMatch(string: string, phraseList: Array<string>) {
        const stringNoDupicateCharacters = Filter.removeDuplicateCharacters(string, " ")
        const foundPhrases = phraseList.filter(phrase => stringNoDupicateCharacters.includes(phrase))
        return [foundPhrases.length > 0, foundPhrases?.[0]]
    }

    static removeBypassCharacters(string: string) {
        string = string.toLowerCase()
        for(const character of bypassCharacters) string = this.replaceAll(string, character, "")
        return string
    }

    static useAlternativeCharacters(string: string) {
        for(const originalCharacter in alternativeCharacters) {
            const alternativeCharacter = alternativeCharacters[originalCharacter]
            string = this.replaceAll(string, originalCharacter, alternativeCharacter)
        }
        return string
    }

    static replaceAll(string: string, toReplace: string, replaceWith: string) {
        return string.split(toReplace).join(replaceWith) // Not the best way, but I can't use string#replaceAll  
    }

    static search(string: string, searchString: string, ignoredCharacter: string) {
        let n = 0
        const stringLength = string.length
        while(!(n > stringLength)) {
            const substring = Filter.replaceAll(string.substring(n, n + stringLength), " ", "")
            if(substring.startsWith(searchString)) return n + 1
            n++
        }
        return -1
    }

    static range(array: Array<any>, start, end) {
        let n = start
        while(n !== end) {
            array.push(n)
            n++
        }
        return array
    }

    static removeDuplicateCharacters(string: string, characterToReplace:string) {
        return string.trim().split("").filter((character: string, index: number) => {
            if(character === characterToReplace && (string.at(index - 1)) === characterToReplace) return false 
            return true
        }).join("")
    }

    static async blockMessage(message: Message, database: Database, foundItem: string) {
        await message.delete({reason : `Contained blacklisted item`})
        const channel = message.channel
        const member = message.member as Member
        const newStrikes = await Strikes.addOneStrike(database, member)
        const fields:Array<any> = []
        "{username}, {tag}, {mention}, {deleted_message}, {strikes}, {strikes_remaining}, {date}, {blacklisted_item}, {next_limit_action} {next_limit_minutes} {next_limit_strikes}"
        const customizationSettings: Map<string, string | number> = await database.get(databaseNames.custom.collectionName, databaseNames.custom.keyName, {}, message.guildId)
        const upcomingLimits = (await Limits.get(message.guild as Guild, database)).filter(limitData => newStrikes < Number(limitData["amount"]))
        if((await Limits.get(message.guild as Guild, database)).length > 0) fields.push({name : "Strikes", value : String(newStrikes)})
        const embedContent = customizationSettings["content"] ? StringUtils.replaceCharacters(customizationSettings["content"], {"{username}" : message.author.username, "{tag}" : message.author.discriminator, "{mention}" : message.author.mention, "{deleted_message}" : message.content, "{strikes}" : String(newStrikes), "{strikes_remaining}" : ((Number(upcomingLimits[0] ? Number(upcomingLimits[0]?.["amount"]) : undefined)) - newStrikes) || "none", "{date}" : new Date().toDateString(), "{blacklisted_item}" : foundItem, "{next_limit_action}" : upcomingLimits[0]?.["action"] || "none", "{next_limit_minutes}" : upcomingLimits[0]?.["minutes"] || "forever", "{next_limit_strikes}" : upcomingLimits[0]?.["amount"] || "none"}) : embedDefaults.content
        if(!(await Limits.doPunishmentIfNecessary(channel as ChannelGuildText, member, newStrikes, database))[0]) {
            const sentMessage = await channel?.createMessage({embed : BotUtils.createEmbed("Message blocked", embedContent, message.author, fields, customizationSettings["color"] > 0 ? customizationSettings["color"] : embedDefaults.color, "Run /get to get your deleted message back")})
            if(Object.keys(customizationSettings).length === 0) return
            if(customizationSettings["cleanup"] > 0) setTimeout(async () => await sentMessage?.delete(), customizationSettings["cleanup"] * 1000)
        }
        
    }

    static removeAllDuplicateWordCharacters(wordArray: Array<string>) {
        const newArray:Array<any> = []
        for(const word of wordArray) newArray.push(word.split("").filter((character: string, index: number) => {
            if((word.at(index - 1)) === character) return false 
            return true
        }).join(""))
        return newArray
    }

}

export class Database {

    database: Db

    constructor() {
        const client = new MongoClient(dbAddress)
        console.log("1")
        client.connect()
        console.log("2")
        this.database = client.db("badwordblocker")
        console.log("3")
        console.log("Ahhhhhh")
    }

    getCollection(collectionName: string) {
        return this.database.collection(collectionName)
    }

    async get(collectionName: string, keyName: string, defaultValue: any = null, id: any) {
        const collection = this.getCollection(collectionName)
        const result = await collection.findOne({_id : id})
        return result?.[keyName] || defaultValue
    }

    async documentExists(collectionName: string, id: any) {
        const collection = this.getCollection(collectionName)
        const result = await collection.findOne({_id : id})
        return Boolean(result)
    }

    async set(collectionName: string, keyName: string, value: any, id: any) {
        const collection = this.getCollection(collectionName)
        if(!await this.documentExists(collectionName, id)) await this.add(collectionName, keyName, value, id) 
        return await collection.updateOne({_id : id}, {"$set" : {[keyName] : value}})
    }

    private async add(collectionName: string, keyName: string, value: any, id: any) {
        const collection = this.getCollection(collectionName)
        return await collection.insertOne({_id : id, [keyName] : value})
    }

    async delete(collectionName: string, id:any) {
        const collection = this.getCollection(collectionName)
        return await collection.deleteOne({_id : id})
    }

}

export class ArrayUtils {
    static getMutualItem(array: Array<any>, searchElements: Array<any>) {
        
        try{for(const searchElement of searchElements) 
            if(array.includes(searchElement)) return searchElement
        return null}
        catch {console.log(array)}
    }

    static trimEveryItem(array: Array<string>) {
        return array.map(item => item.trim())
    }

}

export class Strikes {
    static async getStrikes(database: Database, member: Member): Promise<number> {
        const strikeDatabaseNameInfo = databaseNames.strikes
        return (await database.get(strikeDatabaseNameInfo.collectionName, strikeDatabaseNameInfo.keyName, {}, member.guildId))?.[member.id] ?? 0
    }

    static async setStrikes(database: Database, member: Member, newStrikeValue: number) {
        const strikeDatabaseNameInfo = databaseNames.strikes
        const guildStrikeData = await database.get(strikeDatabaseNameInfo.collectionName, strikeDatabaseNameInfo.keyName, {}, member.guildId)
        guildStrikeData[member.id] = newStrikeValue
        await database.set(strikeDatabaseNameInfo.collectionName, strikeDatabaseNameInfo.keyName, guildStrikeData, member.guildId)
        return newStrikeValue
    }

    static async addOneStrike(database: Database, member: Member) {
        return await this.setStrikes(database, member, (await this.getStrikes(database, member)) + 1)
    }

}

export class Limits {
    static async add(guild: Guild, amount: number, action: LimitAction, minutes: number | null, database: Database) {
        const limitsNameData = databaseNames.limits
        const guildLimits = await database.get(limitsNameData.collectionName, limitsNameData.keyName, {}, guild.id)
        guildLimits[String(amount)] = {
            action : action,
            minutes : minutes
        }
        return await database.set(limitsNameData.collectionName, limitsNameData.keyName, guildLimits, guild.id) 
    }

    static isValidData(amount: number, action: LimitAction, minutes: number | null) {
        if(action === "kick") return !Boolean(minutes)
        const numberLimitData = limits
        const min = numberLimitData[action].min
        const max = numberLimitData[action].max
        if(minutes != null && (minutes > max || minutes < min)) return false
        return true
    }

    static async get(guild: Guild, database: Database) {
        const limitsNameData = databaseNames.limits
        const guildLimits = await database.get(limitsNameData.collectionName, limitsNameData.keyName, {}, guild.id)
        const guildLimitsArray:Array<any> = []
        for(const strikes in guildLimits) {
            const data = guildLimits[strikes]
            guildLimitsArray.push({amount : strikes, action : data["action"], minutes : data["minutes"] ?? null})
        }
        return guildLimitsArray
    }

    static async remove(guild: Guild, amountArray: Array<string>, database: Database) {
        let guildLimits = await this.get(guild, database)
        guildLimits = guildLimits.filter(element => !amountArray.includes(element.amount))
        const limitsDatabaseNames = databaseNames.limits
        const databaseFormattedLimitData = {}
        for(const guildLimit of guildLimits) {
            databaseFormattedLimitData[guildLimit["amount"]] = {
                "action" : guildLimit["action"],
                "minutes" : Number(guildLimit["minutes"]) || null
            }
        }
        await database.set(limitsDatabaseNames.collectionName, limitsDatabaseNames.keyName, databaseFormattedLimitData, guild.id)
    }

    static async doPunishmentIfNecessary(channel: ChannelGuildText, member: Member, memberStrikes: number, database: Database) {
        const guildStrikeData = await this.get(member.guild as Guild, database)
        let triedPunishment = false
        let isPunishmentDone = false
        let embed
        for(const data of guildStrikeData) {
            if(Number(data["amount"]) === memberStrikes) {
                const minutes = Number(data["minutes"])
                const action = data["action"]
                switch (action) {
                    case "timeout":
                        triedPunishment = true
                        member.edit({communicationDisabledUntil : DateUtils.addMilliseconds(60000 * minutes).toISOString()}).then(() => {isPunishmentDone = true}).catch(error => BotUtils.handleModerationPermissionError(error, channel, member, action))
                        embed = BotUtils.createEmbed("Member muted", `${member.mention} was put in timeout for **${minutes}** minutes because they reached **${memberStrikes}** strikes.`, channel.client.user as User, undefined, colors.yellow)
                        break
                    case "kick":
                        triedPunishment = true
                        await member.remove().then(() => {isPunishmentDone = true}).catch(error => BotUtils.handleModerationPermissionError(error, channel, member, action))
                        embed = BotUtils.createEmbed("Member kicked", `${member.mention} was kicked for reaching **${memberStrikes}** strikes`, channel.client.user as User, undefined, colors.orange)
                        break
                    case "ban":
                        triedPunishment = true
                        member.ban({reason : `Reached ${memberStrikes}`}).then(() => {isPunishmentDone = true}).catch(error => BotUtils.handleModerationPermissionError(error, channel, member, action))
                        embed = BotUtils.createEmbed("Member banned", `Member was banned for ${minutes} minutes because they reached **${memberStrikes}** strikes`, channel.client.user as User, undefined, colors.red)
                        break
                }
            }
            if(isPunishmentDone && embed) await channel.createMessage({embed : embed})   
                             
            if(memberStrikes >= Number(guildStrikeData[guildStrikeData.length - 1]["amount"])) {
                await Strikes.setStrikes(database, member, 0)
            }
        }
        return [triedPunishment, isPunishmentDone]
    }

}

export class StringUtils {
    static capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1)
    }

    static replaceCharacters(string, dictionaryOrArray, replaceWithIfArray="") {
        if(dictionaryOrArray instanceof Array) {
            for(let x of dictionaryOrArray) {
                string = string.replaceAll(x, replaceWithIfArray)
            }
        }
    
        else {
            for(const k in dictionaryOrArray) {
                const v = dictionaryOrArray[k]
                string = string.replaceAll(k, v)   
            }
    
        }
    
        return string
    
       
    }
    
    static containsOnlyNumbers(string: string){
        for(const character of this.replaceCharacters(string.trim(), {"-" : ""}).split("")) {
            if(!Number(character) && character != "0" && character != "1") return false
        }

        return true
    }

    static stringBooleanToBoolean(stringRep: "true" | "false") {
        return stringRep === "true"
    }

    static containsAnyOf(searchString:string, items:Array<string>) {
        return Boolean(items.find(item => searchString.includes(item)))
    }

}

export class DateUtils {
    static addMilliseconds(milliseconds: number) {
        return new Date(Date.now() + milliseconds)
    }

    static getDate() {
       return new Date().toISOString().slice(0, 10)
    }

}

export class SavedMessages {
    static async save(message: Message, blacklistedItemFound, database: Database) {
        const guildSavedMessages = await database.get(databaseNames.savedMessages.collectionName, databaseNames.savedMessages.keyName, {}, message.guildId)
        guildSavedMessages[message.author.id] = {
            content : message.content,
            time : DateUtils.getDate(),
            blacklistedItem : blacklistedItemFound
        }
        await database.set(databaseNames.savedMessages.collectionName, databaseNames.savedMessages.keyName, guildSavedMessages, message.guildId)
    }

    static async get(member: Member, database: Database) {
        return (await database.get(databaseNames.savedMessages.collectionName, databaseNames.savedMessages.keyName, {}, member.guildId))?.[member.id] ?? null
    }

}

class Interop {
    static getMatchResult(interopCallResult) {
        const resultJSONString = JSON.stringify({"result" : interopCallResult})
        const value = JSON.parse(resultJSONString).result?.value0
        const result = value !== undefined ? value : null
        return [Boolean(result), result]
    }
}
