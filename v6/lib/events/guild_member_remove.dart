import 'package:bad_word_blocker_dart/globals.dart';
import 'package:nyxx/nyxx.dart';

Future<void> onGuildMemberRemove(IGuildMemberRemoveEvent event) async {
  final guild = event.guild;
  final data =
      customGuildCache.firstWhere((guildData) => guildData.id == guild.id);

  customGuildCache.removeWhere((guildData) => guildData.id == event.guild.id);
  // ^ Remove it

  customGuildCache.add((
    name: data.name,
    memberCount: data.memberCount - 1,
    iconUrl: data.iconUrl,
    id: guild.id
  ));
  // ^ Add it back
}
