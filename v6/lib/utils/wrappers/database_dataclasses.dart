import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';

abstract class DatabaseWrapper {
  DBResult toMap();
}

class InexactMatchDbWrapper extends DatabaseWrapper {
  final _keyName = "words";
  late List<String> words;
  Snowflake id;
  InexactMatchDbWrapper(this.id, Option<DBResult> dbResult) {
    words = dbResult
        .flatMap((t) => t.lookup(_keyName))
        .map((t) => List<String>.from(t))
        .getOrElse(() => List<String>.from([]));
  }
  @override
  DBResult toMap() {
    return {"_id": id.toString(), _keyName: words};
  }
}

class PhrasesDbWrapper extends DatabaseWrapper {
  final _keyName = "phrases";
  late List<String> phrases;
  Snowflake id;
  PhrasesDbWrapper(this.id, Option<DBResult> dbResult) {
    try {
      phrases = dbResult
          .flatMap((t) => t.lookup(_keyName))
          .map((t) => List<String>.from(t))
          .getOrElse(() => List<String>.from([]));
    } catch (e) {
      // Don't know why it's null
      phrases = [];
    }
  }
  @override
  DBResult toMap() {
    return {"_id": id.toString(), _keyName: phrases};
  }
}

class LinksDbWrapper extends DatabaseWrapper {
  final _keyName = "Links";
  late List<String> links;
  Snowflake id;
  LinksDbWrapper(this.id, Option<DBResult> dbResult) {
    try {
      links = dbResult
          .flatMap((t) => t.lookup(_keyName))
          .map((t) => List<String>.from(t))
          .getOrElse(() => List<String>.from([]));
    } catch (e) {
      // Don't know why it's null
      links = [];
    }
  }
  @override
  DBResult toMap() {
    return {"_id": id.toString(), _keyName: links};
  }
}

class BypassesDbWrapper extends DatabaseWrapper {
  final _keyName = "bypasses";
  final _rolesKeyName = "roles";
  final _channelsKeyName = "channels";
  late List<String> roles;
  late List<String> channels;
  Snowflake id;
  BypassesDbWrapper(this.id, Option<DBResult> dbResult) {
    roles = dbResult
        .flatMap((t) => t.lookup(_keyName))
        .flatMap((t) => (t as DBResult).lookup(_rolesKeyName))
        .map((t) => List<String>.from(t))
        .getOrElse(() => <String>[]);

    channels = dbResult
        .flatMap((t) => t.lookup(_keyName))
        .flatMap((t) => (t as DBResult).lookup(_channelsKeyName))
        .map((t) => List<String>.from(t))
        .getOrElse(() => <String>[]);
  }
  @override
  DBResult toMap() {
    return {
      "_id": id.toString(),
      _keyName: {_rolesKeyName: roles, _channelsKeyName: channels}
    };
  }
}

class CustomMessagesWrapper extends DatabaseWrapper {
  final _keyName = "info";
  final _titleKeyName = "title";
  final _contentKeyName = "content";
  final _colorKeyName = "color";
  final _cleanupKeyName = "cleanup";
  late String title;
  late String content;
  late int color;
  late int cleanupSecondsAmount;
  Snowflake id;
  CustomMessagesWrapper(this.id, Option<DBResult> dbResult) {
    final data = dbResult.flatMap((t) => t.lookup(_keyName));
    title = data
        .flatMap((t) => (t as DBResult).lookup(_titleKeyName))
        .getOrElse(() => "Message Blocked");
    content = data
        .flatMap((t) => (t as DBResult).lookup(_contentKeyName))
        .getOrElse(() => defaultEmbedValue);
    color = data
        .flatMap((t) => (t as DBResult).lookup(_colorKeyName))
        .getOrElse(() => redEmbedColor.value);
    cleanupSecondsAmount = data
        .flatMap((t) => (t as DBResult).lookup(_cleanupKeyName))
        .getOrElse(() => 0);
  }
  @override
  DBResult toMap() {
    return {
      "_id": id.toString(),
      "info": {
        _titleKeyName: title,
        _contentKeyName: content,
        _colorKeyName: color,
        _cleanupKeyName: cleanupSecondsAmount
      }
    };
  }
}

class StrikesDBWrapper extends DatabaseWrapper {
  final _keyName = "strikes";
  late Map<String, int> strikes;
  Snowflake id;
  StrikesDBWrapper(this.id, Option<DBResult> dbResult) {
    try {
      strikes = dbResult
          .flatMap((t) => t.lookup(_keyName))
          .map((t) => (t as Map)
              .map((key, value) => MapEntry(key as String, value as int)))
          .getOrElse(() => {});
    } catch (e) {
      print("STRIKES ERROR. DATA IS:");
      print(dbResult);
      print("ERROR:");
      print(e);
      strikes = {}; // Temp fix, remove ASAP
    }
  }
  @override
  DBResult toMap() {
    return {"_id": id.toString(), _keyName: strikes};
  }
}

class PunishmentData extends DatabaseWrapper {
  String action;
  Option<int> minutes;
  PunishmentData(this.action, this.minutes);
  @override
  DBResult toMap() {
    return {"action": action, "minutes": minutes.toNullable()};
  }
}

class LimitsDBWrapper extends DatabaseWrapper {
  Snowflake id;
  final _keyName = "punishments";
  final _actionKeyName = "action";
  final _minutesKeyName = "minutes";
  late Map<String, PunishmentData> punishments;
  LimitsDBWrapper(this.id, Option<DBResult> dbResult) {
    punishments = dbResult
        .flatMap((t) => t.lookup(_keyName))
        .map((t) => Map<String, Map<String, dynamic>>.from(t))
        .map((t) => t.mapValue((value) => PunishmentData(value[_actionKeyName],
            Option.fromNullable(value[_minutesKeyName]))))
        .getOrElse(() => {});
  }
  @override
  DBResult toMap() {
    return {
      "_id": id.toString(),
      _keyName: punishments.mapValue((value) => value.toMap())
    };
  }
}

class TimedPunishmentEntryDBWrapper extends DatabaseWrapper {
  late String undoAt;
  late String guildId;
  late String memberId;
  late String action;
  TimedPunishmentEntryDBWrapper(
      this.guildId, this.undoAt, this.memberId, this.action);
  @override
  DBResult toMap() {
    return {
      "undoAt": undoAt,
      "guildId": guildId,
      "memberId": memberId,
      "action": action
    };
  }
}

class TimedPunishmentsDBWrapper extends DatabaseWrapper {
  final _keyName = "entries";
  final _guildIdKeyName = "guildId";
  final _memberIdKeyName = "memberId";
  final _undoAtKeyName = "undoAt";
  final _actionKeyName = "action";
  Snowflake id;
  late List<TimedPunishmentEntryDBWrapper> entries;
  TimedPunishmentsDBWrapper(this.id, Option<DBResult> dbResult) {
    entries = dbResult
        .flatMap((t) => t.lookup(_keyName))
        .map((t) => t as List)
        .map((t) => t
            .map((e) => TimedPunishmentEntryDBWrapper(e[_guildIdKeyName],
                e[_undoAtKeyName], e[_memberIdKeyName], e[_actionKeyName]))
            .toList())
        .getOrElse(() => []);
  }
  @override
  DBResult toMap() {
    return {
      "_id": id.toString(),
      _keyName: entries.map((e) => e.toMap()).toList()
    };
  }
}

class LogsChannelDBWrapper extends DatabaseWrapper {
  final _keyName = "Channel";
  Snowflake id;
  late Option<String> channelId;
  LogsChannelDBWrapper(this.id, Option<DBResult> dbResult) {
    channelId = dbResult.flatMap((t) => t.lookup(_keyName)).map((t) => t);
  }
  @override
  DBResult toMap() {
    return {"_id": id.toString(), _keyName: channelId.toNullable()};
  }
}

class SavedMessagesDBWrapperKeyData extends DatabaseWrapper {
  final _contentKeyName = "content";
  final _deletedAtKeyName = "deletedAt";
  final _blacklistedItemKeyName = "blacklistedItems";
  late String content;
  late DateTime deletedAt;
  late List<String> blacklistedItems;
  SavedMessagesDBWrapperKeyData(DBResult dbResult) {
    content = dbResult[_contentKeyName];
    deletedAt = DateTime.parse(dbResult[_deletedAtKeyName]);
    blacklistedItems = (dbResult[_blacklistedItemKeyName] as List<dynamic>)
        .map((e) => e as String)
        .toList();
  }
  @override
  DBResult toMap() {
    return {
      _contentKeyName: content,
      _deletedAtKeyName: deletedAt.toString(),
      _blacklistedItemKeyName: blacklistedItems
    };
  }
}

class SavedMessagesDBWrapper extends DatabaseWrapper {
  final _keyName = "messages";
  late Map<String, SavedMessagesDBWrapperKeyData> messages;
  Snowflake id;
  SavedMessagesDBWrapper(this.id, Option<DBResult> dbResult) {
    messages = dbResult
        .flatMap((t) => t.lookup(_keyName))
        .map((t) => ((t as Map<String, dynamic>)
            .mapValue((value) => SavedMessagesDBWrapperKeyData(value))))
        .getOrElse(() => {});
  }
  @override
  DBResult toMap() {
    return {
      "_id": id.toString(),
      _keyName: messages.mapValue((value) => value.toMap())
    };
  }
}

class PremiumServerKeyDataDBWrapper extends DatabaseWrapper {
  DateTime givenOn; // Time the user gave the premium to the server
  Snowflake userId; // ID of the user who gave premium to the server
  bool isUserPremiumActive; // Is their premium still active?
  PremiumServerKeyDataDBWrapper(
      this.givenOn, this.userId, this.isUserPremiumActive);
  @override
  DBResult toMap() {
    return {
      "userId": userId.toString(),
      "givenOn": givenOn.toString(),
      "isUserPremiumActive": isUserPremiumActive
    };
  }
}

class PremiumServersDBWrapper extends DatabaseWrapper {
  final _keyName = "data";
  late List<PremiumServerKeyDataDBWrapper> premiumData;
  Snowflake id;
  PremiumServersDBWrapper(this.id, Option<DBResult> dbResult) {
    premiumData = dbResult
        .flatMap((t) => t.lookup(_keyName))
        .map((t) => t as List)
        .map((t) => t
            .map((e) => PremiumServerKeyDataDBWrapper(
                DateTime.parse(e["givenOn"]),
                Snowflake(e["userId"]),
                e["isUserPremiumActive"]))
            .toList())
        .getOrElse(() => []);
  }
  @override
  DBResult toMap() {
    return {
      "_id": id.toString(),
      _keyName: premiumData.map((e) => e.toMap()).toList()
    };
  }
}
