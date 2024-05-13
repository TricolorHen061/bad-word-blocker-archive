import 'package:bad_word_blocker_dart/globals.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';
import 'events/slash_interaction.dart';

void registerCommands(
    INyxxWebsocket client, IInteractions interaction, bool upload) {
  final pingCommand = SlashCommandBuilder("ping", "Pings the bot", [])
    ..registerHandler(onSlashCommandInteraction);

  final blacklistCommand = SlashCommandBuilder(
      "blacklist", "Modify this server's blacklist", [],
      requiredPermissions: PermissionsConstants.manageMessages)
    ..registerHandler(onSlashCommandInteraction);

  final bypassCommand = SlashCommandBuilder(
      "bypass",
      "Manage bypasses",
      [
        CommandOptionBuilder(CommandOptionType.subCommand, "role",
            "Add a role that will bypass the bot",
            options: [
              CommandOptionBuilder(CommandOptionType.role, "role",
                  "Role to bypass. Anyone with this role will bypass the bot's filter.",
                  required: true)
            ])
          ..registerHandler(onSlashCommandInteraction),
        CommandOptionBuilder(CommandOptionType.subCommand, "channel",
            "Add a channel that will bypass the bot",
            options: [
              CommandOptionBuilder(CommandOptionType.channel, "channel",
                  "Channel to ignore. Every message sent in this channel will bypass the bot's filter.",
                  required: true, channelTypes: allowedCommandChannelTypes)
            ])
          ..registerHandler(onSlashCommandInteraction),
        CommandOptionBuilder(
          CommandOptionType.subCommand,
          "manage",
          "View/Remove current bypassing channels and roles",
        )..registerHandler(onSlashCommandInteraction)
      ],
      requiredPermissions: PermissionsConstants.manageMessages);

  final customizeEmbedCommand = SlashCommandBuilder("customize_embed",
      "Customize the embed that's sent when a message is blocked", [],
      requiredPermissions: PermissionsConstants.manageMessages)
    ..registerHandler(onSlashCommandInteraction);

  final strikesCommand = SlashCommandBuilder(
      "strikes",
      "Manage strikes",
      [
        CommandOptionBuilder(
          CommandOptionType.subCommand,
          "view",
          "View a person's strikes",
          options: [
            CommandOptionBuilder(CommandOptionType.user, "user",
                "User whose strikes you want to see",
                required: true)
          ],
        )..registerHandler(onSlashCommandInteraction),
        CommandOptionBuilder(CommandOptionType.subCommand, "edit",
            "Change someone's strikes to a desired amount",
            options: [
              CommandOptionBuilder(
                  CommandOptionType.user, "user", "User whose strike to change",
                  required: true),
              CommandOptionBuilder(CommandOptionType.number, "amount",
                  "Amount to change their strikes to",
                  required: true)
            ])
          ..registerHandler(onSlashCommandInteraction)
      ],
      requiredPermissions: PermissionsConstants.manageMessages);

  final limitsCommand = SlashCommandBuilder(
      "limits",
      "Manage limits",
      [
        CommandOptionBuilder(
            CommandOptionType.subCommand, "add", "Add a limit on strikes",
            options: [
              CommandOptionBuilder(CommandOptionType.integer, "amount",
                  "Amount of strikes that should trigger this limit",
                  required: true),
              CommandOptionBuilder(CommandOptionType.string, "action",
                  "What should be done when this limit is triggered",
                  choices: [
                    ArgChoiceBuilder("ban", "ban"),
                    ArgChoiceBuilder("kick", "kick"),
                    ArgChoiceBuilder("timeout", "timeout"),
                    ArgChoiceBuilder("assign mute role", "mute_role")
                  ],
                  required: true),
              CommandOptionBuilder(CommandOptionType.integer, "duration",
                  "If desired, how many minutes this action should last")
            ])
          ..registerHandler(onSlashCommandInteraction),
        CommandOptionBuilder(
            CommandOptionType.subCommand, "manage", "View/remove limits")
          ..registerHandler(onSlashCommandInteraction)
      ],
      requiredPermissions: PermissionsConstants.manageMessages);

  final logCommand = SlashCommandBuilder(
      "log",
      "Manages log channel",
      [
        CommandOptionBuilder(CommandOptionType.subCommand, "set",
            "Set channel that will receive updates when a message is blocked",
            options: [
              CommandOptionBuilder(CommandOptionType.channel, "channel",
                  "The channel you want the bot to sent messages in when a message is blocked",
                  required: true, channelTypes: allowedCommandChannelTypes)
            ])
          ..registerHandler(onSlashCommandInteraction),
        CommandOptionBuilder(CommandOptionType.subCommand, "view",
            "View the current log channel")
          ..registerHandler(onSlashCommandInteraction),
        CommandOptionBuilder(CommandOptionType.subCommand, "remove",
            "Remove the current log channel")
          ..registerHandler(onSlashCommandInteraction)
      ],
      requiredPermissions: PermissionsConstants.manageMessages);

  final getCommand = SlashCommandBuilder("get",
      "Get back your last deleted message, along with why it was deleted", [])
    ..registerHandler(onSlashCommandInteraction);

  final helpCommand =
      SlashCommandBuilder("help", "Get help with Bad Word Blocker", [])
        ..registerHandler(onSlashCommandInteraction);

  final serverCCommand = SlashCommandBuilder(
      "serverc", "See how many servers Bad Word Blocker is in", [])
    ..registerHandler(onSlashCommandInteraction);

  final premiumCommand = SlashCommandBuilder(
      "premium",
      "Manages premium aspects of the bot",
      [
        CommandOptionBuilder(
          CommandOptionType.subCommand,
          "manage",
          "Manage your premium status and data",
        )..registerHandler(onSlashCommandInteraction),
        CommandOptionBuilder(CommandOptionType.subCommand, "add",
            "Add this server to your premium subscription")
          ..registerHandler(onSlashCommandInteraction),
      ],
      requiredPermissions: PermissionsConstants.manageMessages);

  final i = interaction
    ..registerSlashCommand(pingCommand)
    ..registerSlashCommand(blacklistCommand)
    ..registerSlashCommand(bypassCommand)
    ..registerSlashCommand(customizeEmbedCommand)
    ..registerSlashCommand(strikesCommand)
    ..registerSlashCommand(limitsCommand)
    ..registerSlashCommand(logCommand)
    ..registerSlashCommand(getCommand)
    ..registerSlashCommand(helpCommand)
    ..registerSlashCommand(serverCCommand)
    ..registerSlashCommand(premiumCommand);
  if (upload) i.syncOnReady();
}
