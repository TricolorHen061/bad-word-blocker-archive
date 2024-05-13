import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

// It's ok if they put more than the limit before premium became a thing, but don't
// let them add any more

int getValueMaxLimit(String input, bool isPremium, bool isLinkSection) {
  if (isPremium) {
    return 4000;
  } else if (input.length > 230) {
    return input.length;
  } else {
    return isLinkSection ? 650 : 230;
  }
}

Future<void> blacklistCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  final currentBlacklist = await getBlacklist(guild.id);
  final isPremium = await isPremiumGuild(guild.id);

  final wordsValue = currentBlacklist.words.join(", ");
  final phrasesValue = currentBlacklist.phrases.join(", ");
  final linksValue = currentBlacklist.links.join(", ");

  final wordsInput = ComponentRowBuilder()
    ..addComponent(TextInputBuilder("words", TextInputStyle.paragraph, "words")
      ..required = false
      ..placeholder = "word1, word2, word3, etc"
      ..value = wordsValue
      ..maxLength = getValueMaxLimit(wordsValue, isPremium, false));

  final phraseInput = ComponentRowBuilder()
    ..addComponent(
        TextInputBuilder("phrase", TextInputStyle.paragraph, "phrases")
          ..required = false
          ..placeholder = "some phrase 1, some phrase 2, some phrase 3, etc"
          ..value = phrasesValue
          ..maxLength = getValueMaxLimit(phrasesValue, isPremium, false));

  final linkInput = ComponentRowBuilder()
    ..addComponent(TextInputBuilder("links", TextInputStyle.paragraph, "links")
      ..required = false
      ..placeholder =
          "http://link1.com, http://link2.org, https://link3.com/, etc"
      ..value = linksValue
      ..maxLength = getValueMaxLimit(linksValue, isPremium, true));

  final modal = ModalBuilder("blacklist", "Blacklist")
    ..componentRows = [wordsInput, phraseInput, linkInput];

  await event.respondModal(modal);
}
