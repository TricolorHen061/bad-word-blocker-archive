import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> strikesViewCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  if (!await isCountingLimits(guild.id)) {
    await event.respond(
        MessageBuilder.embed(EmbedBuilder()
          ..title = "Not Applicable"
          ..description =
              "You need to set at least one limit (with `/limits add`) for strikes to work."
          ..color = blueEmbedColor),
        hidden: true);
    return;
  }
  final targetUserId =
      event.interaction.options.first.options.first.value.toString();
  final strikes = await getMemberStrikes(Snowflake(targetUserId), guild.id);
  final embedBuilder = EmbedBuilder()
    ..title = "Strikes"
    ..description = "<@$targetUserId> has **$strikes** strikes."
    ..color = blueEmbedColor;
  await event.respond(MessageBuilder.embed(embedBuilder), hidden: true);
}
