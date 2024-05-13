module CommandData

open Discord
open Types
open GlobalVariables
open Wrappers.DiscordWrappers

let (commands: ApplicationCommandProperties array) =
    [| { Name = "ping"
         Description = "Ping the bot"
         Options = [||]
         DefaultPermission = None }
       { Name = "blacklist"
         Description = "Edit the server's blacklist"
         Options = [||]
         DefaultPermission = Some GuildPermission.ManageMessages }
       { Name = "bypass"
         Description = "Parent bypass command"
         DefaultPermission = Some GuildPermission.ManageMessages
         Options =
           [| { OptionType = SubCommand
                Name = "channel"
                Description = "Ignores a channel"
                Required = false
                Options =
                  [| { OptionType =
                         SlashCommandOptionType.Channel
                             [ ChannelType.Text
                               ChannelType.PublicThread
                               ChannelType.PrivateThread
                               ChannelType.News
                               ChannelType.NewsThread
                               ChannelType.Forum ]
                       Name = "channel"
                       Description = "Channel that should be bypassed"
                       Required = true
                       Options = [||] } |] }
              { OptionType = SubCommand
                Name = "role"
                Description = "Add an ignored role"
                Required = false
                Options =
                  [| { OptionType = Role
                       Name = "role"
                       Description = "Role to add. Anyone with this role will be ignored by the bot"
                       Required = true
                       Options = [||] } |] }
              { OptionType = SubCommand
                Name = "manage"
                Description = "View and remove bypassing channels and roles"
                Required = false
                Options = [||] }

              |] }
       { Name = "strikes"
         Description = "Strikes parent command"
         DefaultPermission = Some GuildPermission.ManageMessages
         Options =
           [| { OptionType = SubCommand
                Name = "view"
                Description = "View a person's strikes"
                Required = false
                Options =
                  [| { OptionType = User
                       Name = "user"
                       Description = "User whose strikes you'd like to view"
                       Required = false
                       Options = [||] } |] }
              { OptionType = SubCommand
                Name = "edit"
                Description = "Sets a person's strikes"
                Required = false
                Options =
                  [| { OptionType = User
                       Name = "user"
                       Description = "User whose strikes you'd like to change"
                       Required = true
                       Options = [||] }
                     { OptionType = Number <| Some(0, 250)
                       Name = "amount"
                       Description = "Amount of strikes they should have"
                       Required = true
                       Options = [||] } |] } |] }

       { Name = "limits"
         Description = "Limits parent command"
         DefaultPermission = Some GuildPermission.ManageMessages
         Options =
           [| { OptionType = SubCommand
                Name = "add"
                Description = "Add a new limit on strikes"
                Required = false
                Options =
                  [| { OptionType = Number <| Some(1, 250)
                       Name = "amount"
                       Description = "Amount of strikes that should trigger this limit"
                       Required = true
                       Options = [||] }
                     { OptionType =
                         String
                         <| Some
                             [| ("Ban", "ban")
                                ("Kick", "kick")
                                ("Timeout", "timeout")
                                ("Use mute role", "role") |]
                       Name = "action"
                       Description = "What should be done to the user when they reach the amount of strikes"
                       Required = true
                       Options = [||] }
                     { OptionType = Number <| Some(1, jsonInfo.banLimit)
                       Name = "minutes"
                       Description = "How long the action should last"
                       Required = false
                       Options = [||] } |] }
              { OptionType = SubCommand
                Name = "manage"
                Description = "View and remove limits"
                Required = false
                Options = [||] } |] }
       { Name = "custom_embed"
         Description = "Customizes the embed that is sent when a message is blocked"
         Options = [||]
         DefaultPermission = Some GuildPermission.ManageMessages }
       { Name = "log"
         Description = "Parent log command"
         DefaultPermission = Some GuildPermission.ManageMessages
         Options =
           [| { OptionType = SubCommand
                Name = "set"
                Description = "Sets a channel that will be notified when a message is blocked"
                Required = false
                Options =
                  [| { OptionType =
                         SlashCommandOptionType.Channel
                             [ ChannelType.Text; ChannelType.PrivateThread; ChannelType.PublicThread ]
                       Name = "channel"
                       Description = "Channel that should be notified when a message is blocked"
                       Required = true
                       Options = [||] } |] }
              { OptionType = SubCommand
                Name = "manage"
                Description = "View log channel and optionally removes it via button"
                Required = false
                Options = [||] } |] }
       { Name = "get"
         Description = "Gets your last message back"
         Options = [||]
         DefaultPermission = None }
       { Name = "serverc"
         Description = "See how many servers Bad Word Blocker is in"
         Options = [||]
         DefaultPermission = None }
       { Name = "extras"
         Description = "Enables extra features that are unrelated to message filtering"
         Options = [||]
         DefaultPermission = Some GuildPermission.ManageMessages } |]

    |> Array.map createSlashCommand
    |> Array.map (fun x -> x :> ApplicationCommandProperties)

let (extrasCommands: ApplicationCommandProperties array) =
    [| { Name = "commchannel"
         Description = "Command channel parent command"
         DefaultPermission = Some GuildPermission.ManageMessages
         Options =
           [| { OptionType = SubCommand
                Name = "add"
                Description =
                  "(extras) Adds a channel where, upon a message being sent, it's deleted unless it's from a bot"
                Required = false
                Options =
                  [| { OptionType = SlashCommandOptionType.Channel [ ChannelType.Text ]
                       Name = "channel"
                       Description = "Channel to add to list of command channels"
                       Required = true
                       Options = [||] } |] }
              { OptionType = SubCommand
                Name = "manage"
                Description = "(extras) View and remove command channels"
                Required = false
                Options = [||] } |] }
       { Name = "cleanupbot"
         Description = "Cleanupbot parent command"
         DefaultPermission = Some GuildPermission.ManageMessages
         Options =
           [| { OptionType = SubCommand
                Name = "add"
                Description = "(extras) Add a bot whose messages will be deleted after a given amount of seconds"
                Required = false
                Options =
                  [| { OptionType = User
                       Name = "bot"
                       Description = "Bot whose messages should be deleted after the given seconds"
                       Required = true
                       Options = [||] }

                     { OptionType = Number <| Some(3, 1000)
                       Name = "seconds"
                       Description = "Amount of seconds that the bot's message should be deleted after"
                       Required = true
                       Options = [||] } |] }
              { OptionType = SubCommand
                Name = "manage"
                Description = "(extras) View and remove cleanup bots"
                Required = false
                Options = [||] } |] } |]
    |> Array.map createSlashCommand
    |> Array.map (fun x -> x :> ApplicationCommandProperties)
