import 'package:bad_word_blocker_dart/globals.dart';
import 'package:nyxx/nyxx.dart';

Future<void> fixStuff() async {
  for(final e in client.guilds.entries.toList()) {
    print("GUILD: ${e.value.name}");
    for(final channel in e.value.channels.toList()) {
      if(wait != null && wait!) {
        await Future.delayed(Duration(minutes: 1));
        wait = false;
      }
      try {
        if(channel is ITextChannel) {
        print("CHANNEL: ${channel.name}");
        final messages = (channel as ITextChannel).downloadMessages(limit: 10);
        await for(final message in messages) {
          if(message.embeds.isNotEmpty && message.embeds.first.title == "Thanks For Inviting") {
            await message.delete();
            print("Deleted one");
          }
        }
      }
      }
      catch(_) {

      }
      
    }
  }
} 