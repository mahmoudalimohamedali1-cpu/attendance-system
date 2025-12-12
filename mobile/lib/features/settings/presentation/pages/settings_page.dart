import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../bloc/settings_bloc.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('settings')),
      ),
      body: BlocBuilder<SettingsBloc, SettingsState>(
        builder: (context, state) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Language Section
              _SettingsSection(
                title: context.tr('language'),
                children: [
                  _RadioTile<String>(
                    title: context.tr('arabic'),
                    value: 'ar',
                    groupValue: state.locale.languageCode,
                    onChanged: (value) {
                      context.read<SettingsBloc>().add(ChangeLocaleEvent(value!));
                    },
                  ),
                  _RadioTile<String>(
                    title: context.tr('english'),
                    value: 'en',
                    groupValue: state.locale.languageCode,
                    onChanged: (value) {
                      context.read<SettingsBloc>().add(ChangeLocaleEvent(value!));
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Theme Section
              _SettingsSection(
                title: context.tr('theme'),
                children: [
                  _RadioTile<ThemeMode>(
                    title: context.tr('light_theme'),
                    value: ThemeMode.light,
                    groupValue: state.themeMode,
                    onChanged: (value) {
                      context.read<SettingsBloc>().add(ChangeThemeEvent(value!));
                    },
                  ),
                  _RadioTile<ThemeMode>(
                    title: context.tr('dark_theme'),
                    value: ThemeMode.dark,
                    groupValue: state.themeMode,
                    onChanged: (value) {
                      context.read<SettingsBloc>().add(ChangeThemeEvent(value!));
                    },
                  ),
                  _RadioTile<ThemeMode>(
                    title: context.tr('system_theme'),
                    value: ThemeMode.system,
                    groupValue: state.themeMode,
                    onChanged: (value) {
                      context.read<SettingsBloc>().add(ChangeThemeEvent(value!));
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // About Section
              _SettingsSection(
                title: context.tr('about'),
                children: [
                  ListTile(
                    leading: const Icon(Icons.info_outline),
                    title: Text(context.tr('version')),
                    trailing: const Text('1.0.0'),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _SettingsSection({
    required this.title,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryColor,
              ),
            ),
          ),
          ...children,
        ],
      ),
    );
  }
}

class _RadioTile<T> extends StatelessWidget {
  final String title;
  final T value;
  final T groupValue;
  final ValueChanged<T?> onChanged;

  const _RadioTile({
    required this.title,
    required this.value,
    required this.groupValue,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return RadioListTile<T>(
      title: Text(title),
      value: value,
      groupValue: groupValue,
      onChanged: onChanged,
      activeColor: AppTheme.primaryColor,
    );
  }
}

