import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> serverCCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  final embed = EmbedBuilder()
    ..title = "Server Count"
    ..description = "Bad Word Blocker is in ${client.guilds.length} servers."
    ..color = blueEmbedColor;
  await event.respond(MessageBuilder.embed(embed), hidden: true);
}
