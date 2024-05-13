module Handlers.Commands.Blacklist

open Types
open System.Threading.Tasks
open Discord.WebSocket
open GlobalVariables
open Utils
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers

let blacklistCommand (data: SocketSlashCommand) =
  task {
    let guildId = data.GuildId.Value

    let! badWords =
      getDocument<InexactMatchData> InexactMatch guildId
      |> taskDefaultValue
           { _id = string guildId
             words = jsonInfo.defaultBlacklist.en.inexactmatch }
      |> mapTask (fun x -> nullableToOption x.words)
      |> mapTask (Option.defaultValue [||])

    let! badPhrases =
      getDocument<PhrasesData> Phrases guildId
      |> taskDefaultValue { _id = string guildId; phrases = [||] }
      |> mapTask (fun x -> nullableToOption x.phrases)
      |> mapTask (Option.defaultValue [||])

    let! badLinks =
      getDocument<LinksData> Links guildId
      |> taskDefaultValue { _id = string guildId; Links = [||] }
      |> mapTask (fun x -> nullableToOption x.Links)
      |> mapTask (Option.defaultValue [||])

    do!
      send
        (Interaction(data, Some true))
        { MessageType =
            Modal
              { Title = "Blacklist"
                CustomId = "blacklist"
                TextInputs =
                  [| { Label = "Words"
                       CustomId = "words"
                       Placeholder = Some "word1, word2, word3, etc"
                       Required = false
                       Style = Paragraph
                       Value = Some(skipAfterLimit 3999 <| String.concat ", " badWords)
                       MaxLength = None
                       MinLength = None }
                     { Label = "Phrases"
                       CustomId = "phrases"
                       Placeholder = Some "some phrase 1, some phrase 2, some phrase 3"
                       Required = false
                       Style = Paragraph
                       Value = Some(skipAfterLimit 3999 <| String.concat ", " badPhrases)
                       MinLength = None
                       MaxLength = None }
                     { Label = "Links"
                       CustomId = "links"
                       Placeholder = Some "https://link1.com, http://link2.org, https://link3.edu, etc"
                       Required = false
                       Style = Paragraph
                       Value = Some(skipAfterLimit 3999 <| String.concat ", " badLinks)
                       MinLength = None
                       MaxLength = None } |] }
          Components = None }
      :> Task
  }
