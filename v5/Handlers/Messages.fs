module Handlers.Messages

open Utils
open Discord.WebSocket
open GlobalVariables
open System.Threading.Tasks
open CommandData
open Types
open Handlers.MessageCreateFeatureHandlers
open Filters.English
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers

let processMessage (message: SocketMessage) =
  task {
    
    let guild = (message.Channel :?> SocketGuildChannel).Guild
    if message.Author.Id = uint64 "581965693130506263" then
      printfn "WOW"
      printfn $"{Array.contains (string guild.Id) jsonInfo.specialFeaturesServerIds.moderateBots}"
      printfn $"{guild.Id}"
      printfn $"{isUnknownUser message.Author}"
    let! commandChannels = getCommandChannels guild.Id
    let! cleanupBots = getCleanupBots guild.Id

    let blockBotMessages =
      Array.contains (string guild.Id) jsonInfo.specialFeaturesServerIds.moderateBots

    if
      not message.Author.IsBot
      && Array.contains (string message.Channel.Id) commandChannels
    then
      do! deleteMessage message :> Task
    if message.Author.Id = uint64 "581965693130506263" then
      printfn "Yes, is getting here"
      printfn $"{(not message.Author.IsBot || blockBotMessages) && isUnknownUser message.Author}"
    else if (not message.Author.IsBot || blockBotMessages) && isUnknownUser message.Author && not (message.Content.Contains("user")) then
      let! isUpdated = getDocument<ExactMatchData> ExactMatch guild.Id |> mapTask Option.isNone

      if not isUpdated then
        do! updateServer guild

      let socketUser = message.Author :?> SocketGuildUser

      let! (isBypass, isEveryoneBypassing) =
        isBypassing (Seq.toArray socketUser.Roles) (message.Channel :?> SocketChannel) guild.Id

      // Code for limit roles

      if
        pendingMuteRoles.ContainsKey(string message.Author.Id)
        && message.MentionedRoles.Count > 0
      then
        try
          let muteRoleEnumerator = message.MentionedRoles.GetEnumerator()
          muteRoleEnumerator.MoveNext() |> ignore
          let muteRole = muteRoleEnumerator.Current
          ()
        with e ->
          printfn $"----Yep it's that---- {e}"

        let muteRoleEnumerator = message.MentionedRoles.GetEnumerator()
        muteRoleEnumerator.MoveNext() |> ignore
        let muteRole = muteRoleEnumerator.Current

        let data = pendingMuteRoles[ string message.Author.Id ].Split(" ")
        let targetGuildId = data |> Array.item 0 |> uint64
        let amount = data |> Array.item 2 |> int
        let minutes = data |> Array.item 3 |> int

        if uint64 targetGuildId = guild.Id then
          let! res = addLimit (int amount) $"role {muteRole.Id}" (int minutes) targetGuildId
          let endDesc = if minutes <> -1 then $" for {minutes} minutes." else "."

          do!
            match res with
            | Ok _ ->
              pendingMuteRoles.Remove(string message.Author.Id) |> ignore

              send
                (Channel(message.Channel))
                { MessageType =
                    Embed
                      { Title = "Successful"
                        Description =
                          $"When a member reaches {amount} strikes, they will be given the {muteRole.Mention} role"
                          + endDesc
                        Footer = None
                        Color = Green }
                  Components = None }
              :> Task

            | Error errorMessage ->
              send
                (Channel(message.Channel))
                { MessageType =
                    Types.Embed
                      { Title = "Error"
                        Description = errorMessage
                        Footer = None
                        Color = Red }
                  Components = None }
              :> Task


      if
        message.Content = "!uploadcommands"
        && string message.Author.Id = "581965693130506263"
      then
        let! content =
          task {
            try
              for x in client.Shards do
                do! x.BulkOverwriteGlobalApplicationCommandsAsync(commands) :> Task

              return "Finished"
            with e ->
              return string e
          }

        do!
          send
            (Channel(message.Channel))
            { MessageType = Text content
              Components = None }
          :> Task
      if message.Author.Id = uint64 "581965693130506263" then
        printfn "Yes, is getting here 2"
        printfn $"{not isBypass || isEveryoneBypassing}"
      if not isBypass || isEveryoneBypassing then
        let! badWordData =
          getDocument<InexactMatchData> InexactMatch guild.Id
          |> taskDefaultValue
               { _id = string guild.Id
                 words = jsonInfo.defaultBlacklist.en.inexactmatch }

        let! badPhraseData =
          getDocument<PhrasesData> Phrases guild.Id
          |> taskDefaultValue
               { _id = string guild.Id
                 phrases = [||] }

        let! badLinkData =
          getDocument<LinksData> Links guild.Id
          |> taskDefaultValue { _id = string guild.Id; Links = [||] }

        let filterRes =
          englishFilter
            message.Content
            { BypassChars = jsonInfo.bypassCharacters
              AltChars = jsonInfo.alternativeCharacters
              BadWords = badWordData.words
              BadLinks = badLinkData.Links
              BadPhrases = badPhraseData.phrases
              LanguageWords = englishWords }


        if (Array.isEmpty >> not) filterRes then
          let willDeleteMessage =
            if isEveryoneBypassing || message.Author.IsBot then
              false
            else
              true

          let firstBlacklistedItem = (Array.head filterRes).BlacklistItem

          if message.Author.IsBot then // Only send log for bots
            do! handleLogSend firstBlacklistedItem willDeleteMessage message
          else
            let conWords =
              (Array.head filterRes).ConstructingWords
              |> Array.reduce (fun x y -> x + $", {y}")

            printfn
              $"
                        Blocked message: {message.Content}
                        Blacklisted Item: {firstBlacklistedItem}
                        CW: {conWords}
                        Guild ID: {guild.Id}"

            let! hasLimits = getLimits guild.Id |> mapTask (fun x -> length x > 0)

            if hasLimits then
              do! addOneStrike guild.Id message.Author.Id

            let! punishmentData = getPunishment message.Author.Id guild.Id
            let! newStrikes = getStrikes guild.Id message.Author.Id
            do! handleLogSend firstBlacklistedItem willDeleteMessage message
            do! saveMessage firstBlacklistedItem message

            do!
              handleMessageDelete
                newStrikes
                firstBlacklistedItem
                hasLimits
                willDeleteMessage
                message
                (Array.map (fun x -> x.BlacklistItem) filterRes)
              :> Task

            if punishmentData.IsSome then
              let! punRes = doPunishment punishmentData.Value socketUser
              let! allPunishments = getLimits guild.Id
              do! handleLimitMessageSend punRes punishmentData.Value message

              if (Array.last << Array.sortBy (fun x -> x.Amount) <| allPunishments).Amount = newStrikes then
                do! deleteStrikes guild.Id message.Author.Id

    match (Array.tryFind (fun data -> (Array.item 0 data) = string message.Author.Id) cleanupBots) with
    | Some data ->
      let seconds = Array.item 1 data

      Task.Run<unit>(fun () ->
        task {
          do! Async.Sleep(int seconds * 1000)
          do! deleteMessage message :> Task
        })
      |> ignore
    | None -> ()

  }
