module Handlers.MessageCreateFeatureHandlers

open Discord.WebSocket
open Utils
open Types
open System.Threading.Tasks
open GlobalVariables
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers

let handleMessageDelete
  (newStrikes: int)
  (firstBlacklistedItemFound: string)
  (limitsExist: bool)
  (shouldDelete: bool)
  (message: SocketMessage)
  (allBlacklistedItems: string array)
  =
  task {
    let! deleteRes =
      if shouldDelete then
        deleteMessage message
      else
        task { return Ok() }

    let guild = (message.Author :?> SocketGuildUser).Guild
    let guildId = guild.Id

    do!
      match deleteRes with
      | Ok _ ->
        task {
          let! customMessageData =
            getDocument<CustomMessagesData> CustomMessages guildId
            |> taskDefaultValue
                 { _id = string guildId
                   info =
                     { title =
                         defaultEmbedTitle
                         |> replaceAllInString "{verb}" (if shouldDelete then "deleted" else "flagged")
                       content =
                         defaultEmbedDescription
                         + if limitsExist then
                             "\nThey now have **{strikes}** strikes."
                           else
                             ""
                       color = toColorCode >> int <| Red
                       cleanup = 0 } }

          let! nextLimit =
            getLimits guildId
            |> mapTask (fun limits -> limits |> Array.tryFind (fun limit -> limit.Amount > newStrikes))

          let remainingStrikes =
            nextLimit
            |> Option.map (fun x -> x.Amount - newStrikes)
            |> Option.defaultValue 0

          let nextLimitAction =
            nextLimit
            |> Option.map (fun x -> if x.Action = "role" then "muted role" else x.Action)
            |> Option.defaultValue "(No upcoming limit)"

          let nextLimitMinutes =
            nextLimit
            |> Option.map (fun x -> if x.Minutes = -1 then "forever" else string x.Minutes)
            |> Option.defaultValue "(No upcoming limit)"

          let nextLimitStrikes =
            nextLimit
            |> Option.map (fun x -> string x.Amount)
            |> Option.defaultValue "(No upcoming limit)"

          let! description =
            customMessageData.info.content
            |> replaceAllInString "{username}" message.Author.Username
            |> replaceAllInString "{tag}" message.Author.Discriminator
            |> replaceAllInString "{mention}" message.Author.Mention
            |> replaceAllInString "{deleted_message}" message.Content
            |> replaceAllInString "{strikes}" (string newStrikes)
            |> replaceAllInString "{strikes_remaining}" (string remainingStrikes)
            |> replaceAllInString "{date}" (System.DateTime.Now.ToString())
            |> replaceAllInString "{blacklisted_item}" firstBlacklistedItemFound
            |> replaceAllInString "{next_limit_action}" nextLimitAction
            |> replaceAllInString "{next_limit_minutes}" nextLimitMinutes
            |> replaceAllInString "{next_limit_strikes}" nextLimitStrikes
            |> (fun x ->
              task {
                if guildId = uint64 "737428668816818216" then
                  let! customWord =
                    getDocument<CustomEmbedWordData> CustomEmbedWord (uint64 guildId)
                    |> taskDefaultValue
                         { _id = string guildId
                           word = "(censored)" }
                    |> mapTask (fun x -> x.word)

                  let wordList = message.Content.ToLower() |> toWords


                  let newString =
                    wordList
                    |> Array.map (fun word ->
                      if containsAnyOf (Array.map (fun (x: string) -> x.Replace("_", "")) allBlacklistedItems) word then
                        customWord
                      else
                        word)
                    |> String.concat " "

                  return x |> replaceAllInString "{content}" newString
                else
                  return x
              })



          if customMessageData.info.cleanup <> -1 then

            let! blockMessage =
              message.Channel.SendMessageAsync(
                embed =
                  toEmbed
                    { Title = customMessageData.info.title
                      Description = description
                      Footer =
                        if guildId = uint64 "737428668816818216" then
                          None
                        else
                          Some "Use /get command to get your message back"
                      Color = Custom customMessageData.info.color }
              )

            if customMessageData.info.cleanup <> 0 then
              Task.Run<unit>(fun () ->
                task {
                  do! Async.Sleep(customMessageData.info.cleanup * 1000)
                  do! blockMessage.DeleteAsync()
                })
              |> ignore

        }
        :> Task
      | Error err ->
        let formattedErr = err |> string |> split "\n" |> Array.item 0

        if not (formattedErr |> stringIncludes "Unknown Message") then
          send
            (Channel message.Channel)
            { MessageType =
                Embed
                  { Title = "Unable to delete message"
                    Description =
                      "Bad Word Blocker could not delete that message. This is usually because the bot does not have the `Manage Messages` permission. Refer to the error below:"
                      + $"\n ```{formattedErr}```"
                    Footer = None
                    Color = Red }
              Components = None }
          :> Task
        else
          task { return () }

    return deleteRes
  }


let handleLimitMessageSend (punRes: Result<unit, exn>) (limitData: PunishmentData) (message: SocketMessage) =
  task {

    match punRes with
    | Ok _ ->
      let pastTenseAction = getPastTenseAction limitData.Action

      do!
        send
          (Channel message.Channel)
          { MessageType =
              Embed
                { Title = "Limit triggered"
                  Description =
                    $"Bad Word Blocker has {pastTenseAction} {message.Author.Mention} because they reached {limitData.Amount} strikes."
                  Footer = None
                  Color = Blue }
            Components = None }
        :> Task
    | Error errorMessage ->
      let splString = " "

      do!
        send
          (Channel message.Channel)
          { MessageType =
              Embed
                { Title = "Couldn't trigger limit"
                  Description =
                    $"A limit of `{limitData.Amount}` was triggered, but Bad Word Blocker could not perform the action `{limitData.Action |> split splString |> Array.item 0}`. This is usually because of a permission error. Please reference the below error. \n ```{formatError errorMessage}```"
                  Footer = None
                  Color = Red }
            Components = None }
        :> Task

  }

let handleLogSend (blacklistedItem: string) (wasDeleted: bool) (message: SocketMessage) =
  task {
    let guild = (message.Author :?> SocketGuildUser).Guild

    let! logChannel =
      getDocument<LogsData> Logs guild.Id
      |> mapTask (fun v ->
        v
        |> Option.map (fun x -> getChannel guild <| uint64 x.Channel)
        |> Option.flatten)

    let verbAction = if wasDeleted then "deleted" else "flagged"

    if logChannel.IsSome then
      do!
        (logChannel.Value :?> SocketTextChannel)
          .SendMessageAsync(
            embed =
              toEmbed
                { Title = $"Message {verbAction}"
                  Description =
                    $"A message by {message.Author.Mention} was {verbAction} in <#{message.Channel.Id}> because it contained the blacklisted item `{blacklistedItem}`. Full message: \n ```{message.Content}```"
                  Footer = None
                  Color = Red }
          )
        :> Task
  }
