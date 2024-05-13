import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> addPremiumServerButtonHandler(
    IButtonInteractionEvent event, Cacheable<Snowflake, IGuild> guild) async {
  final authorId = event.interaction.userAuthor!.id;
  final isUserPremium = isPremiumUser(authorId);
  if (!isUserPremium ||
      event.interaction.message!.createdAt
          .isAfter(DateTime.now().add(Duration(minutes: 30)))) {
    final embed = EmbedBuilder()
      ..title = "Try again"
      ..description = "Please run the command and try again."
      ..color = greyEmbedColor;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  } else {
    // Is premium
    await premiumizeGuild(guild.id, authorId);
    final embed = EmbedBuilder()
      ..title = "Premium added to server"
      ..description = "You've successfully added premium to this server!"
      ..color = greenEmbedColor;
    final componentMessageBuilder = ComponentMessageBuilder()
      ..componentRows = []
      ..embeds = [embed];
    await event.respond(componentMessageBuilder, hidden: true);
  }
}
