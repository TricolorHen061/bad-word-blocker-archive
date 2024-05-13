module Wrappers.DiscordWrappers

open Discord
open Discord.WebSocket
open System.Linq
open Types
open Utils
open Wrappers.DatabaseWrappers
open System
open System.Collections.Generic
open MongoDB.Bson
open GlobalVariables
open System.Threading.Tasks


let getModalComponent (customId: string) (modal: SocketModal) =
    modal.Data.Components.ToList().First(fun x -> x.CustomId = customId)

let getRole (guild: SocketGuild) (roleId: uint64) =
    guild.GetRole(roleId) |> nullableToOption

let getChannel (guild: SocketGuild) (channelId: uint64) =
    guild.GetChannel(channelId) |> nullableToOption

let deleteMessage (message: SocketMessage) = toResult <| message.DeleteAsync()

let toTextStyleNumber =
    function
    | Paragraph -> Discord.TextInputStyle.Paragraph
    | Short -> Discord.TextInputStyle.Short

let toOptionType =
    function
    | SubCommand -> (ApplicationCommandOptionType.SubCommand, (fun _ -> ()))
    | SlashCommandOptionType.Channel channelType ->
        (ApplicationCommandOptionType.Channel,
         fun (optBuilder: SlashCommandOptionBuilder) -> ignore <| optBuilder.ChannelTypes <- channelType |> ResizeArray)
    | Role -> (ApplicationCommandOptionType.Role, (fun _ -> ()))
    | User -> (ApplicationCommandOptionType.User, (fun _ -> ()))
    | Number limitData ->
        (ApplicationCommandOptionType.Number,
         (fun builder ->
             if limitData.IsSome then
                 builder.MinValue <- fst limitData.Value
                 builder.MaxValue <- snd limitData.Value))
    | String choices ->
        (ApplicationCommandOptionType.String,
         (fun builder ->
             if choices.IsSome then
                 builder.Choices <-
                     choices.Value
                     |> Array.map (fun s ->
                         let choices = ApplicationCommandOptionChoiceProperties()
                         choices.Name <- fst s
                         choices.Value <- snd s
                         choices)
                     |> ResizeArray))

let createSlashCommand (commandData: DiscordSlashCommandData) =
    let builder = SlashCommandBuilder()
    builder.Name <- commandData.Name
    builder.Description <- commandData.Description

    if commandData.DefaultPermission.IsSome then
        builder.DefaultMemberPermissions <- commandData.DefaultPermission.Value
    // For the following, I am aware I can use a recursive function.
    // However, I am too lazy.
    for optData in commandData.Options do
        let optionBuilder = SlashCommandOptionBuilder()
        let optionType = toOptionType optData.OptionType
        optionBuilder.Type <- optionType |> fst
        optionType |> snd <| optionBuilder // Spaceship go brrrr
        optionBuilder.Name <- optData.Name
        optionBuilder.Description <- optData.Description
        optionBuilder.IsRequired <- optData.Required

        for subOptData in optData.Options do
            let subOptionBuilder = SlashCommandOptionBuilder()
            let subOptType = toOptionType subOptData.OptionType
            subOptionBuilder.Type <- subOptType |> fst
            subOptType |> snd <| subOptionBuilder
            subOptionBuilder.Name <- subOptData.Name
            subOptionBuilder.Description <- subOptData.Description
            subOptionBuilder.IsRequired <- subOptData.Required
            optionBuilder.AddOption(subOptionBuilder) |> ignore

        builder.AddOption(optionBuilder) |> ignore

    builder.Build()


let toModal (data: ModalData) =
    let modal = new ModalBuilder()
    modal.Title <- data.Title
    modal.CustomId <- data.CustomId

    for textInputData in data.TextInputs do
        let textInput = new TextInputBuilder()
        textInput.Label <- textInputData.Label
        textInput.CustomId <- textInputData.CustomId
        textInput.Placeholder <- toNullable textInputData.Placeholder
        textInput.Required <- textInputData.Required
        textInput.Style <- toTextStyleNumber textInputData.Style

        if textInputData.MinLength.IsSome then
            textInput.MinLength <- textInputData.MinLength.Value

        if textInputData.MaxLength.IsSome then
            textInput.MaxLength <- textInputData.MaxLength.Value

        if textInputData.Value.IsSome then
            textInput.Value <- textInputData.Value.Value

        ignore <| modal.AddTextInput(textInput)

    modal.Build()

let toEmbed (embedData: EmbedData) =
    let builder = EmbedBuilder()
    builder.Title <- embedData.Title
    builder.Description <- embedData.Description
    builder.Footer <- EmbedFooterBuilder().WithText(embedData.Footer |> Option.defaultValue "")
    builder.WithColor(toColorCode embedData.Color).Build()




let toButton (buttonData: ButtonData) =
    let buttonBuilder = ButtonBuilder()
    buttonBuilder.Label <- buttonData.Label

    if buttonData.CustomId.IsSome then
        buttonBuilder.CustomId <- buttonData.CustomId.Value

    buttonBuilder.Style <- buttonData.Style

    if buttonData.Url.IsSome then
        buttonBuilder.Url <- buttonData.Url.Value

    buttonBuilder

let addSelectMenuOption (selectMenuBuilder: SelectMenuBuilder) (selectMenuOptionData: SelectMenuOptionData) =
    selectMenuBuilder.AddOption(
        selectMenuOptionData.Label,
        selectMenuOptionData.CustomId,
        selectMenuOptionData.Description
    )
    |> ignore

    ()

let toSelectMenu (selectMenuData: SelectMenuData) =
    let selectMenuBuilder = SelectMenuBuilder()
    selectMenuBuilder.CustomId <- selectMenuData.CustomId
    selectMenuBuilder.MaxValues <- selectMenuData.MaxValues
    selectMenuBuilder.MinValues <- selectMenuData.MinValues
    selectMenuBuilder.Placeholder <- selectMenuData.Placeholder
    selectMenuData.Options |> Array.iter (addSelectMenuOption selectMenuBuilder)
    selectMenuBuilder


let send (responseType:ResponseType) (sendData: MessageData) =
    task {

        let mutable sendTask = null

        let mutable componentBuilder = ComponentBuilder()

        if sendData.Components.IsSome then
            if sendData.Components.Value.Buttons.IsSome then
                for buttonData in sendData.Components.Value.Buttons.Value do
                    componentBuilder <- componentBuilder.WithButton(toButton buttonData)

            if sendData.Components.Value.SelectMenu.IsSome then
                componentBuilder <-
                    componentBuilder.WithSelectMenu(toSelectMenu sendData.Components.Value.SelectMenu.Value)


        match responseType with
        | Interaction (interaction, isEphemeral) ->
            sendTask <-
                match sendData.MessageType with
                | Embed embedData ->
                    interaction.RespondAsync(
                        null,
                        [| toEmbed embedData |],
                        components = componentBuilder.Build(),
                        ephemeral = Option.defaultValue false isEphemeral
                    )
                | Text textData -> interaction.RespondAsync(textData, components = componentBuilder.Build())
                | Modal modalData -> interaction.RespondWithModalAsync(toModal modalData)
        | Channel channel ->
            sendTask <-
                match sendData.MessageType with
                | Embed embedData ->
                    channel.SendMessageAsync(null, embed = toEmbed embedData, components = componentBuilder.Build())
                | Text textData -> channel.SendMessageAsync(textData, components = componentBuilder.Build())
                | Modal _ ->
                    // Not applicable
                    raise (Exception("You can't send a modal in a channel"))


        return! toResult sendTask
    }

let banMember (reason: string) (guildUser: SocketGuildUser) =
    guildUser.BanAsync(reason = reason) |> toResult

let unbanMember (userId: uint64) (guild: SocketGuild) =
    guild.RemoveBanAsync(userId) |> toResult

let kickMember (reason: string) (guildUser: SocketGuildUser) =
    guildUser.KickAsync(reason = reason) |> toResult

let timeoutMember (undoTime: TimeSpan) (guildUser: SocketGuildUser) =
    guildUser.SetTimeOutAsync(undoTime) |> toResult

let removeTimeout (guildUser: SocketGuildUser) =
    guildUser.RemoveTimeOutAsync() |> toResult

let addRole (roleId: uint64) (guildUser: SocketGuildUser) =
    guildUser.AddRoleAsync(roleId) |> toResult

let removeRole (roleId: uint64) (guildUser: SocketGuildUser) =
    guildUser.RemoveRoleAsync(roleId) |> toResult

let getGuild (guildId: uint64) =
    client.GetGuild(guildId) |> nullableToOption

let getGuildUser (guildUserId: uint64) (guild: SocketGuild) =
    guild.GetUser(guildUserId) |> nullableToOption

let getOption (data: IReadOnlyCollection<SocketSlashCommandDataOption>) (optionName: string) =
    data |> Seq.tryFind (fun x -> x.Name = optionName)

let doPunishment (punishmentData: PunishmentData) (guildUser: SocketGuildUser) =

    task {
        let reason = $"Reached {punishmentData.Amount} strikes"
        let timespan = TimeSpan.FromMinutes(double punishmentData.Minutes)

        let actionTask =
            match punishmentData.Action with
            | "ban" -> banMember reason guildUser
            | "kick" -> kickMember reason guildUser
            | "timeout" -> timeoutMember timespan guildUser
            | action when action |> toWords |> Array.item 0 = "role" ->
                addRole (action |> toWords |> Array.item 1 |> uint64) guildUser
            | _ -> raise <| Exception("Invalid punishment provided")

        let! res = actionTask

        if
            isOk res
            && punishmentData.Minutes <> -1
            && punishmentData.Action <> "kick"
            && punishmentData.Action <> "timeout" // Because it's done via the timeout function
        then
            let! timedPunishments =
                getDocument<TimedPunishmentsData> TimedPunishments guildUser.Guild.Id
                |> taskDefaultValue
                    { _id = string guildUser.Guild.Id
                      entries = [||] }

            let existingPunishments = timedPunishments.entries


            let newValue =
                existingPunishments
                |> addToArray
                    { guildId = string guildUser.Guild.Id
                      memberId = string guildUser.Id
                      action = punishmentData.Action
                      undoAt = (DateTime.Now + timespan).ToString() }
                |> Array.map (fun x -> x.ToBsonDocument())


            do! setDocument TimedPunishments (BsonArray newValue) guildUser.Guild.Id

        return res

    }

let handleError (responseType: ResponseType option) (res: Result<'a, 'b>) =
    task {

        do!
            match res with
            | Ok _ -> task { return () } :> Task
            | Error error ->
                match responseType with
                | Some resType ->
                    send resType
                        { MessageType =
                            Types.Embed
                                { Title = "Error"
                                  Description =
                                    $"An error occured. Please look at the following message for more info: {error}"
                                  Footer = None
                                  Color = Blue }
                          Components = None
                           }
                    :> Task
                | None -> task { () } :> Task
    }

let undoPunishment (guildUser: SocketGuildUser) (action: string) =
    match action with
    | "unban" -> unbanMember guildUser.Id guildUser.Guild
    | "remove_timeout" -> removeTimeout guildUser
    | ac when ac |> toWords |> Array.item 0 = "undo_role" ->
        removeRole (ac |> toWords |> Array.item 1 |> uint64) guildUser
    | l -> raise <| Exception($"Invalid undo action given: {l}")

let getPing (client: DiscordShardedClient) = client.Latency
