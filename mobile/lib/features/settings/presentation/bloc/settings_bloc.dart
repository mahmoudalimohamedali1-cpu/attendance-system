import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/services/storage_service.dart';

// Events
abstract class SettingsEvent extends Equatable {
  const SettingsEvent();
  @override
  List<Object?> get props => [];
}

class LoadSettingsEvent extends SettingsEvent {}

class ChangeThemeEvent extends SettingsEvent {
  final ThemeMode themeMode;
  const ChangeThemeEvent(this.themeMode);
  @override
  List<Object?> get props => [themeMode];
}

class ChangeLocaleEvent extends SettingsEvent {
  final String locale;
  const ChangeLocaleEvent(this.locale);
  @override
  List<Object?> get props => [locale];
}

// State
class SettingsState extends Equatable {
  final ThemeMode themeMode;
  final Locale locale;

  const SettingsState({
    this.themeMode = ThemeMode.system,
    this.locale = const Locale('ar'),
  });

  SettingsState copyWith({
    ThemeMode? themeMode,
    Locale? locale,
  }) {
    return SettingsState(
      themeMode: themeMode ?? this.themeMode,
      locale: locale ?? this.locale,
    );
  }

  @override
  List<Object?> get props => [themeMode, locale];
}

// Bloc
class SettingsBloc extends Bloc<SettingsEvent, SettingsState> {
  final StorageService storageService;

  SettingsBloc(this.storageService) : super(const SettingsState()) {
    on<LoadSettingsEvent>(_onLoadSettings);
    on<ChangeThemeEvent>(_onChangeTheme);
    on<ChangeLocaleEvent>(_onChangeLocale);
  }

  void _onLoadSettings(LoadSettingsEvent event, Emitter<SettingsState> emit) {
    final themeString = storageService.getThemeMode();
    final localeString = storageService.getLocale();

    ThemeMode themeMode;
    switch (themeString) {
      case 'light':
        themeMode = ThemeMode.light;
        break;
      case 'dark':
        themeMode = ThemeMode.dark;
        break;
      default:
        themeMode = ThemeMode.system;
    }

    emit(state.copyWith(
      themeMode: themeMode,
      locale: Locale(localeString),
    ));
  }

  Future<void> _onChangeTheme(ChangeThemeEvent event, Emitter<SettingsState> emit) async {
    String themeString;
    switch (event.themeMode) {
      case ThemeMode.light:
        themeString = 'light';
        break;
      case ThemeMode.dark:
        themeString = 'dark';
        break;
      default:
        themeString = 'system';
    }

    await storageService.setThemeMode(themeString);
    emit(state.copyWith(themeMode: event.themeMode));
  }

  Future<void> _onChangeLocale(ChangeLocaleEvent event, Emitter<SettingsState> emit) async {
    await storageService.setLocale(event.locale);
    emit(state.copyWith(locale: Locale(event.locale)));
  }
}

