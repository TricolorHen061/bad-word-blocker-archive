import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> logSetCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  final channelId = Snowflake(getCommandArgument(event.interaction.options, 0));
  await setGuildLogChannel(guild.id, channelId);
  await event.respond(
      MessageBuilder.embed(EmbedBuilder()
        ..title = "Log Channel Set"
        ..description =
            "<#$channelId> will receive notifications when a message is blocked"
        ..color = greenEmbedColor),
      hidden: true);
}
