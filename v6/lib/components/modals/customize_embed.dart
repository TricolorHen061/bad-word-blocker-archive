import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:bad_word_blocker_dart/utils/wrappers/database.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

bool isColorValid(String input) => Option.fromNullable(int.tryParse(input))
    .map((t) => t >= 0)
    .getOrElse(() => false);
bool isCleanupSecondsValid(String input) =>
    Option.fromNullable(int.tryParse(input))
        .map((t) => t >= -1 && t < 10000)
        .getOrElse(() => false);

Future<void> customizeModalHandler(
    IModalInteractionEvent event, Guild guild) async {
  // All of the fields except the color and cleanup seconds should be assumed to be valid,
  // as Discord handles the validation
  final interaction = event.interaction;
  final isPremium = await isPremiumGuild(guild.id);
  final inputTitle =
      (interaction.components[0].first as IMessageTextInput).value;
  final inputDescription =
      (interaction.components[1].first as IMessageTextInput).value;
  final inputColor =
      (interaction.components[2].first as IMessageTextInput).value;
  final inputCleanupSeconds =
      (interaction.components[3].first as IMessageTextInput).value;
  final isInvalidColor = !isColorValid(inputColor);
  final isInvalidCleanupSeconds = !isCleanupSecondsValid(inputCleanupSeconds);
  final guildEmbedInfo = await getGuildCustomEmbedInfo(guild.id);
  if ((isInvalidColor || isInvalidCleanupSeconds) && isPremium) {
    final description = [
      "Sorry, but:",
      if (isInvalidColor)
        "- Color integer \"$inputColor\" needs to be a number that is above 0. ",
      if (isInvalidCleanupSeconds)
        "- \"$inputCleanupSeconds seconds\" needs to be a number that is above -2 and below 10,001"
    ].join("\n");
    final embed = EmbedBuilder()
      ..title = "Invalid"
      ..description = description
      ..color = redEmbedColor
      ..footer = EmbedFooterBuilder(text: "Everything else was saved.");
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  } else {
    final embed = EmbedBuilder()
      ..title = "Embed Updated"
      ..description = "The embed has been updated"
      ..color = greenEmbedColor
      ..author = isPremium ? premiumAuthorBuilder : null;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  }
  guildEmbedInfo.title = inputTitle;
  guildEmbedInfo.content = inputDescription;
  if (!isInvalidColor) {
    guildEmbedInfo.color = int.parse(inputColor);
  }
  print(isPremium);
  if (!isInvalidCleanupSeconds) {
    guildEmbedInfo.cleanupSecondsAmount = int.parse(inputCleanupSeconds);
  }
  // Override to default if not premium
  if (!isPremium) {
    guildEmbedInfo.color = redEmbedColor.value;
    guildEmbedInfo.title = "Blocked Message";
  }
  await setDbDocument(CustomMessages(), guildEmbedInfo, guild.id);
}
