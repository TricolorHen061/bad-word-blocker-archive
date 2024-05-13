import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> logRemoveCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  await removeGuildLogChannel(guild.id);
  await event.respond(
      MessageBuilder.embed(EmbedBuilder()
        ..title = "Log Channel Removed"
        ..description = "The log channel has been removed"
        ..color = greenEmbedColor),
      hidden: true);
}
