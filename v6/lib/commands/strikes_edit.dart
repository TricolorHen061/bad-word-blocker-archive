import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> strikesEditCommandHandler(
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
      Snowflake(getCommandArgument(event.interaction.options, 0));
  final targetStrikeAmount = int.parse(
      getCommandArgument(event.interaction.options, 1).replaceAll(".0", ""));
  await setMemberStrikes(targetStrikeAmount, targetUserId, guild.id);
  final embedBuilder = EmbedBuilder()
    ..title = "Strikes successfully set"
    ..description = "<@$targetUserId> now has **$targetStrikeAmount** strikes."
    ..color = greenEmbedColor;
  await event.respond(MessageBuilder.embed(embedBuilder), hidden: true);
}
