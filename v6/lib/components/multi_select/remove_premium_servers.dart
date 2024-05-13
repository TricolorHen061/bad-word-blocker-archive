import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> removePremiumServersMultiselectHandler(
    IMultiselectInteractionEvent event, Guild guild) async {
  final guildIds = event.interaction.values;
  for (final guildId in guildIds) {
    await removePremium(Snowflake(guildId), event.interaction.userAuthor!.id);
  }
  final embed = EmbedBuilder()
    ..title = "Successfully Removed"
    ..description =
        "Successfully removed ${guildIds.length} server(s) from your premium account."
    ..color = greenEmbedColor;
  final componentMessageBuilder = ComponentMessageBuilder()
    ..componentRows = []
    ..embeds = [embed];
  await event.respond(componentMessageBuilder, hidden: true);
}
