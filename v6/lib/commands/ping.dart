import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';
import '../globals.dart';

Future<void> pingCommandHandler(ISlashCommandInteractionEvent event) async {
  final embed = EmbedBuilder()
    ..title = "Pong!"
    ..description =
        "Bad Word Blocker's ping is ${client.shardManager.gatewayLatency.inMilliseconds}ms"
    ..color = blueEmbedColor;
  await event.respond(MessageBuilder.embed(embed), hidden: true);
}
