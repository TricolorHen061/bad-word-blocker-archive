import 'package:bad_word_blocker_dart/commands/bypass_channel.dart';
import 'package:bad_word_blocker_dart/commands/bypass_manage.dart';
import 'package:bad_word_blocker_dart/commands/bypass_role.dart';
import 'package:bad_word_blocker_dart/commands/customize_embed.dart';
import 'package:bad_word_blocker_dart/commands/get.dart';
import 'package:bad_word_blocker_dart/commands/help.dart';
import 'package:bad_word_blocker_dart/commands/limits_add.dart';
import 'package:bad_word_blocker_dart/commands/limits_manage.dart';
import 'package:bad_word_blocker_dart/commands/log_remove.dart';
import 'package:bad_word_blocker_dart/commands/log_set.dart';
import 'package:bad_word_blocker_dart/commands/log_view.dart';
import 'package:bad_word_blocker_dart/commands/premium_add.dart';
import 'package:bad_word_blocker_dart/commands/premium_manage.dart';
import 'package:bad_word_blocker_dart/commands/serverc.dart';
import 'package:bad_word_blocker_dart/commands/strike_view.dart';
import 'package:bad_word_blocker_dart/commands/strikes_edit.dart';
import 'package:bad_word_blocker_dart/globals.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';
import '../commands/ping.dart';
import '../commands/blacklist.dart';

Future<void> onSlashCommandInteraction(
    ISlashCommandInteractionEvent event) async {
  if (!botIsReady) return;
  print("------------Slash interaction event being run--------");
  final guildOpt = Option.fromNullable(event.interaction.guild);
  final subCommandOptions = event.interaction.options;
  final subCommandName = subCommandOptions.firstOption.map((t) => t.name);
  switch ((event.interaction.name, subCommandName, guildOpt)) {
    case ("ping", _, _):
      await pingCommandHandler(event);
    case ("blacklist", _, Some(value: final guild)):
      await blacklistCommandHandler(event, guild);
    case ("bypass", Some(value: "role"), Some(value: final guild)):
      await bypassRoleCommandHandler(event, guild);
    case ("bypass", Some(value: "channel"), Some(value: final guild)):
      await bypassChannelCommandHandler(event, guild);
    case ("bypass", Some(value: "manage"), Some(value: final guild)):
      await bypassManageCommandHandler(event, guild);
    case ("customize_embed", _, Some(value: final guild)):
      await customizeEmbedCommandHandler(event, guild);
    case ("strikes", Some(value: "view"), Some(value: final guild)):
      await strikesViewCommandHandler(event, guild);
    case ("strikes", Some(value: "edit"), Some(value: final guild)):
      await strikesEditCommandHandler(event, guild);
    case ("limits", Some(value: "add"), Some(value: final guild)):
      await limitsAddCommandHandler(event, guild);
    case ("limits", Some(value: "manage"), Some(value: final guild)):
      await limitsManageCommandHandler(event, guild);
    case ("log", Some(value: "set"), Some(value: final guild)):
      await logSetCommandHandler(event, guild);
    case ("log", Some(value: "remove"), Some(value: final guild)):
      await logRemoveCommandHandler(event, guild);
    case ("log", Some(value: "view"), Some(value: final guild)):
      await logViewCommandHandler(event, guild);
    case ("get", _, Some(value: final guild)):
      await getCommandHandler(event, guild);
    case ("serverc", _, Some(value: final guild)):
      await serverCCommandHandler(event, guild);
    case ("help", _, _):
      await helpCommand(event);
    // ^ The only command that can be invoked both in server and in DMs
    case ("premium", Some(value: "manage"), Some(value: final guild)):
      await premiumManageCommandHandler(event, guild);
    case ("premium", Some(value: "add"), Some(value: final guild)):
      await premiumAddCommandHandler(event, guild);
  }
  if (guildOpt case Some(value: final guild)) {
    if (isProduction) {
      (await client
              .fetchChannel<ITextChannel>(Snowflake(bwbCommandLogChannelId)))
          .sendMessage(MessageBuilder.content(
              "User ${event.interaction.userAuthor!.username} ran command ${event.interaction.name} in guild ${guild.getFromCache()!.name}"));
    }
  }
}
