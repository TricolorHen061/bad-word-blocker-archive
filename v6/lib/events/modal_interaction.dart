import 'package:bad_word_blocker_dart/components/modals/customize_embed.dart';
import 'package:bad_word_blocker_dart/globals.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';
import '../components/modals/blacklist.dart';

void onModalEvent(IModalInteractionEvent event) async {
  if (!botIsReady) return;
  print("------------Modal interaction event being run--------");
  switch (Option.fromNullable(event.interaction.guild)) {
    case Some(value: final guild):
      {
        switch (event.interaction.customId) {
          case "blacklist" || "blacklist_retried":
            await blacklistModalHandler(event, guild);
          case "customize_embed":
            await customizeModalHandler(event, guild);
        }
      }
    case None():
      ();
  }
}
