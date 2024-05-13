import 'package:bad_word_blocker_dart/globals.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';
import 'package:fpdart/fpdart.dart';

Future<void> blacklistRetryButtonHandler(
    IButtonInteractionEvent event, Cacheable<Snowflake, IGuild> guild) async {
  switch (previousInvalidBlacklistAttempts.lookup(guild.id)) {
    case Some(value: final previousFailedBlacklist):
      {
        final wordsInput = ComponentRowBuilder()
          ..addComponent(
              TextInputBuilder("words", TextInputStyle.paragraph, "words")
                ..required = false
                ..placeholder = "word1, word2, word3, etc"
                ..value = previousFailedBlacklist.words.join(", "));

        final phraseInput = ComponentRowBuilder()
          ..addComponent(
              TextInputBuilder("phrase", TextInputStyle.paragraph, "phrases")
                ..required = false
                ..placeholder = "some phrase 1, some phrase 2, some phrase 3"
                ..value = previousFailedBlacklist.phrases.join(", "));

        final linkInput = ComponentRowBuilder()
          ..addComponent(
              TextInputBuilder("links", TextInputStyle.paragraph, "links")
                ..required = false
                ..placeholder =
                    "http://link1.com, http://link2.org, https://link3.com/"
                ..value = previousFailedBlacklist.links.join(", "));

        final modal = ModalBuilder(
            "blacklist_retried", "Blacklist (Previous Invalid Items Included)")
          ..componentRows = [wordsInput, phraseInput, linkInput];

        await event.respondModal(modal);
      }

    case None():
      {
        final componentBuilder = ComponentMessageBuilder()
          ..embeds = [
            EmbedBuilder()
              ..title = "Expired"
              ..description = "Sorry, you are no longer able to retry this."
              ..color = greyEmbedColor
          ]
          ..componentRows = [];

        await event.respond(componentBuilder, hidden: true);
      }
  }
}
