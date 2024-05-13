import 'package:bad_word_blocker_dart/globals.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> helpCommand(ISlashCommandInteractionEvent event) async {
  await event.respond(
      MessageBuilder.embed(EmbedBuilder()
        ..title = "Help"
        ..description = """
Bad Word Blocker is a Discord bot whose main function is to block bad words, links, and phrases in messages.

- You can read the help guide [here]($docsLink).
- You can join the support server [here]($serverInvite).
"""
        ..color = blueEmbedColor),
      hidden: true);
}
