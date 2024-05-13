import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/timers.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';

void onReady(IReadyEvent event) async {
  startTimers();
  print("Bot is ready");
  botIsReady = true;
  client.setPresence(PresenceBuilder.of(
      activity: ActivityBuilder.streaming(
          "New version out; please report any issues to support server",
          "https://discord.gg/hzrauvY")));

  if (isProduction) {
    await postStatsToTopgg();
  }
}
